// MEI Limit Alerts Job
// Monitora faturamento acumulado e dispara alertas quando próximo do limite anual

import cron from "node-cron";
import { PrismaClient } from "@prisma/client";
import { sendPushNotification } from "../services/push-notification";

const prisma = new PrismaClient();

// Limite anual de faturamento para MEI
const MEI_ANNUAL_LIMIT = 81000;

// Limites percentuais para alertas
const ALERT_THRESHOLDS = {
  SEVENTY: 0.7, // 70% = R$ 56.700
  NINETY: 0.9, // 90% = R$ 72.900
  HUNDRED: 1.0, // 100% = R$ 81.000
};

/**
 * Job para verificar limite MEI e disparar alertas
 * Executa diariamente às 9:00 AM
 */
export function startMEILimitAlertsJob() {
  console.log("[MEI ALERTS] Job iniciado. Executará diariamente às 9:00 AM");

  // 0 9 * * * = 9:00 AM todos os dias
  cron.schedule("0 9 * * *", async () => {
    console.log("[MEI ALERTS] Executando verificação de limite MEI...");

    try {
      // Obter todos os profissionais Elite com MEI verificado
      const profissionaisElite = await prisma.professional.findMany({
        where: {
          user: {
            plano: "ELITE",
            mei_verificado: true,
          },
        },
        include: {
          user: true,
          logs_limite_mei: true,
        },
      });

      console.log(
        `[MEI ALERTS] Encontrados ${profissionaisElite.length} profissionais Elite com MEI`
      );

      for (const profissional of profissionaisElite) {
        await verificarLimiteMEI(profissional);
      }

      console.log("[MEI ALERTS] Verificação concluída");
    } catch (error) {
      console.error("[MEI ALERTS] Erro ao executar job:", error);
    }
  });
}

/**
 * Verifica limite MEI de um profissional e dispara alertas
 */
async function verificarLimiteMEI(profissional: any) {
  try {
    const ano_atual = new Date().getFullYear();
    const inicio_ano = new Date(`${ano_atual}-01-01`);
    const fim_ano = new Date(`${ano_atual}-12-31T23:59:59`);

    // Somar faturamento do ano (serviços concluídos e pagos)
    const servicos = await prisma.service.findMany({
      where: {
        profissional_id: profissional.id,
        status: "CONCLUIDO",
        createdAt: {
          gte: inicio_ano,
          lte: fim_ano,
        },
      },
      include: {
        pagamento: true,
      },
    });

    let faturamento_total = 0;
    for (const servico of servicos) {
      if (servico.pagamento && servico.pagamento.status === "REPASSADO") {
        faturamento_total += Number(servico.valor);
      }
    }

    // Atualizar faturamento acumulado
    await prisma.professional.update({
      where: { id: profissional.id },
      data: {
        faturamento_acumulado: faturamento_total,
        ano_fiscal_atual: ano_atual,
      },
    });

    // Calcular percentual
    const percentual = (faturamento_total / MEI_ANNUAL_LIMIT) * 100;

    console.log(
      `[MEI ALERTS] ${profissional.user.nome}: R$ ${faturamento_total.toFixed(2)} (${percentual.toFixed(1)}%)`
    );

    // Disparar alertas conforme percentual
    if (percentual >= 100) {
      await dispararAlerta(
        profissional,
        "100",
        percentual,
        faturamento_total,
        "CRÍTICO"
      );
    } else if (percentual >= 90) {
      await dispararAlerta(
        profissional,
        "90",
        percentual,
        faturamento_total,
        "URGENTE"
      );
    } else if (percentual >= 70) {
      await dispararAlerta(
        profissional,
        "70",
        percentual,
        faturamento_total,
        "INFORMATIVO"
      );
    }
  } catch (error) {
    console.error(
      `[MEI ALERTS] Erro ao verificar limite para ${profissional.user.nome}:`,
      error
    );
  }
}

/**
 * Dispara alerta se ainda não foi enviado neste ano
 */
async function dispararAlerta(
  profissional: any,
  percentual_tipo: string,
  percentual_valor: number,
  faturamento: number,
  tipo_alerta: "INFORMATIVO" | "URGENTE" | "CRÍTICO"
) {
  try {
    // Verificar se alerta já foi enviado
    const campo_alerta =
      percentual_tipo === "70"
        ? "limite_mei_alerta_70_enviado"
        : percentual_tipo === "90"
          ? "limite_mei_alerta_90_enviado"
          : "limite_mei_alerta_100_enviado";

    // @ts-expect-error dynamic field key
    if (profissional[campo_alerta]) {
      console.log(
        `[MEI ALERTS] Alerta ${percentual_tipo}% já foi enviado para ${profissional.user.nome}`
      );
      return;
    }

    // Criar log
    await prisma.mEILimitLog.create({
      data: {
        profissional_id: profissional.id,
        percentual: Number(percentual_valor.toFixed(2)),
        faturamento_atual: faturamento,
        evento: `${percentual_tipo}%`,
        notificacao_enviada: true,
      },
    });

    // Enviar push notification
    let titulo = "";
    let corpo = "";
    let acoes = [];

    if (percentual_tipo === "70") {
      titulo = "⚠️ Atenção: 70% do limite MEI atingido";
      corpo = `Você faturou R$ ${faturamento.toFixed(2)} em ${new Date().getFullYear()}`;
      acoes = [
        "Continuar acompanhando",
        "Ver relatório de faturamento",
      ];
    } else if (percentual_tipo === "90") {
      titulo = "🚨 Urgente: 90% do limite MEI atingido";
      corpo = `Você está próximo ao limite anual de R$ 81.000. Considere se enquadrar como ME/EPP.`;
      acoes = [
        "Saiba mais sobre ME/EPP",
        "Ver contato com contador",
      ];
    } else if (percentual_tipo === "100") {
      titulo = "❌ Crítico: Limite MEI 100% atingido";
      corpo = `Você atingiu o limite anual de MEI. Novas NFS-e foram bloqueadas. Procure seu contador para orientação.`;
      acoes = [
        "Contatar contador",
        "Saber mais sobre enquadramento",
      ];
    }

    await sendPushNotification(profissional.user_id, {
      title: titulo,
      body: corpo,
      data: {
        tipo: "mei_limit_alert",
        percentual: percentual_tipo,
        faturamento: faturamento.toString(),
        tipo_alerta,
      },
    });

    console.log(
      `[MEI ALERTS] Alerta ${percentual_tipo}% disparado para ${profissional.user.nome}`
    );

    // Marcar como enviado
    const update_data: any = {};
    update_data[campo_alerta] = true;

    await prisma.professional.update({
      where: { id: profissional.id },
      data: update_data,
    });
  } catch (error) {
    console.error(
      `[MEI ALERTS] Erro ao disparar alerta ${percentual_tipo}%:`,
      error
    );
  }
}

/**
 * Reset de alertas para novo ano
 * Executa em 1º de janeiro
 */
export function startMEIAlertsResetJob() {
  console.log("[MEI RESET] Job de reset iniciado. Executará em 1º de janeiro");

  // 0 0 1 1 * = Meia-noite do dia 1º de janeiro
  cron.schedule("0 0 1 1 *", async () => {
    console.log("[MEI RESET] Resetando flags de alerta MEI...");

    try {
      await prisma.professional.updateMany({
        data: {
          limite_mei_alerta_70_enviado: false,
          limite_mei_alerta_90_enviado: false,
          limite_mei_alerta_100_enviado: false,
          faturamento_acumulado: 0,
        },
      });

      console.log("[MEI RESET] Flags resetadas com sucesso");
    } catch (error) {
      console.error("[MEI RESET] Erro ao resetar flags:", error);
    }
  });
}

/**
 * Bloqueia emissão de NFS-e se profissional atingiu 100% do limite MEI
 */
export async function verificarBloqueioNFSe(profissional_id: string) {
  try {
    const profissional = await prisma.professional.findUnique({
      where: { id: profissional_id },
    });

    if (!profissional) {
      return { bloqueado: false, motivo: null };
    }

    if (profissional.limite_mei_alerta_100_enviado) {
      return {
        bloqueado: true,
        motivo: "Limite MEI 100% atingido. Contacte seu contador.",
      };
    }

    return { bloqueado: false, motivo: null };
  } catch (error) {
    console.error("[MEI] Erro ao verificar bloqueio NFS-e:", error);
    return { bloqueado: false, motivo: null };
  }
}

/**
 * Obtém estatísticas de faturamento MEI de um profissional
 */
export async function obterEstatisticasMEI(profissional_id: string) {
  try {
    const ano_atual = new Date().getFullYear();
    const inicio_ano = new Date(`${ano_atual}-01-01`);
    const fim_ano = new Date(`${ano_atual}-12-31T23:59:59`);

    // Faturamento anual
    const servicos = await prisma.service.findMany({
      where: {
        profissional_id,
        status: "CONCLUIDO",
        createdAt: {
          gte: inicio_ano,
          lte: fim_ano,
        },
      },
      include: {
        pagamento: true,
      },
    });

    let faturamento_total = 0;
    for (const servico of servicos) {
      if (servico.pagamento && servico.pagamento.status === "REPASSADO") {
        faturamento_total += Number(servico.valor);
      }
    }

    const percentual = (faturamento_total / MEI_ANNUAL_LIMIT) * 100;
    const restante = Math.max(0, MEI_ANNUAL_LIMIT - faturamento_total);

    return {
      ano: ano_atual,
      limite_anual: MEI_ANNUAL_LIMIT,
      faturamento_total,
      percentual: Number(percentual.toFixed(2)),
      restante,
      servicos_concluidos: servicos.length,
      projecao_ano:
        servicos.length > 0
          ? (faturamento_total / servicos.length) * 12
          : 0,
    };
  } catch (error) {
    console.error("[MEI] Erro ao obter estatísticas MEI:", error);
    return null;
  }
}
