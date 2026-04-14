// Plan Verification Middleware
// Valida acesso a funcionalidades baseadas no plano do usuário

import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Estender express Request para incluir dados do usuário
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: {
        id: string;
        plano: "EXPLORADOR" | "PARCEIRO" | "ELITE";
      };
      planFeatures?: {
        pedidos_mensais: number;
        chat_texto: boolean;
        chat_audio: boolean;
        chat_foto: boolean;
        chat_video: boolean;
        hub_fiscal: boolean;
        nfse: boolean;
        das_alerts: boolean;
        mei_guide: boolean;
        comissao_percentual: number;
        destaque_busca: boolean;
        badge_parceiro: boolean;
        badge_elite: boolean;
        agenda_integrada: boolean;
        orcamento_personalizado: boolean;
        gestao_equipe: boolean;
        portfolio_publico: boolean;
        alerta_limite_mei: boolean;
      };
    }
  }
}

// Features mapping por plano
const PLAN_FEATURES = {
  EXPLORADOR: {
    pedidos_mensais: 8,
    chat_texto: true,
    chat_audio: false,
    chat_foto: false,
    chat_video: false,
    hub_fiscal: false,
    nfse: false,
    das_alerts: false,
    mei_guide: false,
    comissao_percentual: 15,
    destaque_busca: false,
    badge_parceiro: false,
    badge_elite: false,
    agenda_integrada: false,
    orcamento_personalizado: false,
    gestao_equipe: false,
    portfolio_publico: false,
    alerta_limite_mei: false,
  },
  PARCEIRO: {
    pedidos_mensais: -1, // ilimitado
    chat_texto: true,
    chat_audio: true,
    chat_foto: true,
    chat_video: false,
    hub_fiscal: true,
    nfse: true,
    das_alerts: true,
    mei_guide: true,
    comissao_percentual: 12,
    destaque_busca: true,
    badge_parceiro: true,
    badge_elite: false,
    agenda_integrada: false,
    orcamento_personalizado: false,
    gestao_equipe: false,
    portfolio_publico: false,
    alerta_limite_mei: false,
  },
  ELITE: {
    pedidos_mensais: -1, // ilimitado
    chat_texto: true,
    chat_audio: true,
    chat_foto: true,
    chat_video: true,
    hub_fiscal: true,
    nfse: true,
    das_alerts: true,
    mei_guide: true,
    comissao_percentual: 10,
    destaque_busca: true,
    badge_parceiro: false,
    badge_elite: true,
    agenda_integrada: true,
    orcamento_personalizado: true,
    gestao_equipe: true,
    portfolio_publico: true,
    alerta_limite_mei: true,
  },
};

/**
 * Middleware para carregar features do plano do usuário
 */
export async function loadPlanFeatures(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Não autenticado" });
    }

    const plano = req.user.plano as keyof typeof PLAN_FEATURES;
    req.planFeatures = PLAN_FEATURES[plano];

    next();
  } catch (error) {
    res.status(500).json({ error: "Erro ao carregar features do plano" });
  }
}

/**
 * Verifica se usuário tem permissão para acessar um recurso
 */
export function requirePlanFeature(feature: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.planFeatures) {
      return res.status(500).json({
        error: "Features do plano não carregadas",
      });
    }

    const hasFeature =
      req.planFeatures[feature as keyof typeof req.planFeatures];

    if (!hasFeature) {
      return res.status(403).json({
        error: "Funcionalidade não disponível no seu plano",
        plano_atual: req.user?.plano,
        feature_requerida: feature,
        upgrade_necessario:
          req.user?.plano === "EXPLORADOR" ? "PARCEIRO" : "ELITE",
      });
    }

    next();
  };
}

/**
 * Bloqueia acesso a recursos Hub Fiscal para Explorador
 */
export function requireHubFiscal(req: Request, res: Response, next: NextFunction) {
  if (!req.planFeatures?.hub_fiscal) {
    return res.status(403).json({
      error: "Hub Fiscal disponível apenas para planos Parceiro e Elite",
      plano_atual: req.user?.plano,
      upgrade_necessario: "PARCEIRO",
      preco: "R$ 19,90/mês",
    });
  }
  next();
}

/**
 * Bloqueia acesso a recursos Elite para Explorador e Parceiro
 */
export function requireElitePlan(req: Request, res: Response, next: NextFunction) {
  if (req.user?.plano !== "ELITE") {
    return res.status(403).json({
      error: "Funcionalidade exclusiva para plano Elite",
      plano_atual: req.user?.plano,
      upgrade_necessario: "ELITE",
      preco: "R$ 39,90/mês",
      features_elite: [
        "Chat com vídeo (até 30s)",
        "Agenda integrada",
        "Orçamento personalizado",
        "Gestão de equipe (até 3 pessoas)",
        "Portfólio público",
        "Alerta de limite MEI em tempo real",
        "Relatório mensal de faturamento",
        "Topo na busca + destaque na homepage",
      ],
    });
  }
  next();
}

/**
 * Bloqueia acesso a recurso de áudio para Explorador
 */
export function requireAudioChat(req: Request, res: Response, next: NextFunction) {
  if (!req.planFeatures?.chat_audio) {
    return res.status(403).json({
      error: "Chat com áudio disponível apenas para planos Parceiro e Elite",
      plano_atual: req.user?.plano,
      upgrade_necessario: "PARCEIRO",
      preco: "R$ 19,90/mês",
    });
  }
  next();
}

/**
 * Bloqueia acesso a recurso de vídeo para Explorador e Parceiro
 */
export function requireVideoChat(req: Request, res: Response, next: NextFunction) {
  if (!req.planFeatures?.chat_video) {
    return res.status(403).json({
      error: "Chat com vídeo disponível apenas para plano Elite",
      plano_atual: req.user?.plano,
      upgrade_necessario: "ELITE",
      preco: "R$ 39,90/mês",
    });
  }
  next();
}

/**
 * Bloqueia acesso a recurso de foto para Explorador
 */
export function requirePhotoChat(req: Request, res: Response, next: NextFunction) {
  if (!req.planFeatures?.chat_foto) {
    return res.status(403).json({
      error: "Chat com foto disponível apenas para planos Parceiro e Elite",
      plano_atual: req.user?.plano,
      upgrade_necessario: "PARCEIRO",
      preco: "R$ 19,90/mês",
    });
  }
  next();
}

/**
 * Obtém features do plano por nome
 */
export function getPlanFeatures(plano: "EXPLORADOR" | "PARCEIRO" | "ELITE") {
  return PLAN_FEATURES[plano];
}

/**
 * Verifica limite de pedidos mensais para Explorador
 */
export async function checkMonthlyServiceLimit(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user || user.plano !== "EXPLORADOR") {
    return { limitExceeded: false };
  }

  // Contar serviços do mês atual
  const firstDayOfMonth = new Date();
  firstDayOfMonth.setDate(1);
  firstDayOfMonth.setHours(0, 0, 0, 0);

  const servicesThisMonth = await prisma.service.count({
    where: {
      cliente_id: userId,
      createdAt: {
        gte: firstDayOfMonth,
      },
    },
  });

  const LIMIT = 8;
  const limitExceeded = servicesThisMonth >= LIMIT;

  return {
    limitExceeded,
    current: servicesThisMonth,
    limit: LIMIT,
    remaining: Math.max(0, LIMIT - servicesThisMonth),
  };
}
