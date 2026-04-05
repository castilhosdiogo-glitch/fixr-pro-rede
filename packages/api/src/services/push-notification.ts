// Push Notification Service
// Firebase Cloud Messaging para notificações push

import admin from "firebase-admin";

// Inicializar Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID,
    serviceAccountId: process.env.FIREBASE_SERVICE_ACCOUNT_EMAIL,
  });
}

const messaging = admin.messaging();

interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
}

/**
 * Envia notificação push para um usuário
 */
export async function sendPushNotification(
  userId: string,
  payload: PushNotificationPayload
) {
  try {
    // Em produção, você buscaria o FCM token do usuário no banco
    // Por enquanto, vamos logar que a notificação seria enviada
    console.log(`[PUSH] Notificação para usuário ${userId}:`, payload);

    // Exemplo de como seria com tokens reais:
    // const userTokens = await getUserFCMTokens(userId);
    // for (const token of userTokens) {
    //   await messaging.send({
    //     notification: {
    //       title: payload.title,
    //       body: payload.body,
    //       imageUrl: payload.imageUrl,
    //     },
    //     data: payload.data,
    //     token,
    //   });
    // }

    return { success: true, userId };
  } catch (error) {
    console.error("[PUSH] Erro ao enviar notificação:", error);
    return { success: false, error };
  }
}

/**
 * Envia notificação para múltiplos usuários
 */
export async function sendPushNotificationToMultiple(
  userIds: string[],
  payload: PushNotificationPayload
) {
  const results = await Promise.all(
    userIds.map((userId) => sendPushNotification(userId, payload))
  );

  return {
    total: userIds.length,
    success: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
  };
}

/**
 * Notificação de nova mensagem no chat
 */
export async function notifyNewMessage(
  destinatario_id: string,
  remetente_nome: string,
  tipo_mensagem: "texto" | "audio" | "foto" | "video"
) {
  const titulos = {
    texto: "Mensagem nova",
    audio: "Áudio recebido",
    foto: "Foto recebida",
    video: "Vídeo recebido",
  };

  const corpos = {
    texto: `${remetente_nome} enviou uma mensagem`,
    audio: `${remetente_nome} enviou um áudio`,
    foto: `${remetente_nome} enviou uma foto`,
    video: `${remetente_nome} enviou um vídeo`,
  };

  return sendPushNotification(destinatario_id, {
    title: titulos[tipo_mensagem],
    body: corpos[tipo_mensagem],
    data: {
      tipo: `new_${tipo_mensagem}`,
      remetente: remetente_nome,
    },
  });
}

/**
 * Notificação de novo orçamento (Elite)
 */
export async function notifyNewQuote(
  cliente_id: string,
  profissional_nome: string,
  valor_total: string
) {
  return sendPushNotification(cliente_id, {
    title: "Orçamento recebido",
    body: `${profissional_nome} enviou um orçamento de R$ ${valor_total}`,
    data: {
      tipo: "new_quote",
      profissional: profissional_nome,
    },
  });
}

/**
 * Notificação de orçamento aprovado (Elite)
 */
export async function notifyQuoteApproved(
  profissional_id: string,
  cliente_nome: string
) {
  return sendPushNotification(profissional_id, {
    title: "Orçamento aprovado! ✓",
    body: `${cliente_nome} aprovou seu orçamento`,
    data: {
      tipo: "quote_approved",
      cliente: cliente_nome,
    },
  });
}

/**
 * Notificação de pedido próximo ao limite Explorador
 */
export async function notifyExplorerNearLimit(
  usuario_id: string,
  pedidos_restantes: number
) {
  return sendPushNotification(usuario_id, {
    title: `${pedidos_restantes} pedido(s) restante(s) neste mês`,
    body: `Você está quase no seu limite. Considere fazer upgrade para Parceiro (ilimitado)`,
    data: {
      tipo: "explorer_near_limit",
      restantes: pedidos_restantes.toString(),
    },
  });
}

/**
 * Notificação de limite MEI 70%
 */
export async function notifyMEILimit70(
  usuario_id: string,
  faturamento_atual: number
) {
  return sendPushNotification(usuario_id, {
    title: "⚠️ 70% do limite MEI atingido",
    body: `Você faturou R$ ${faturamento_atual.toFixed(2)} neste ano`,
    data: {
      tipo: "mei_limit_70",
      faturamento: faturamento_atual.toString(),
    },
  });
}

/**
 * Notificação de limite MEI 90%
 */
export async function notifyMEILimit90(
  usuario_id: string,
  faturamento_atual: number
) {
  return sendPushNotification(usuario_id, {
    title: "🚨 90% do limite MEI atingido",
    body: `Você está próximo do limite anual. Considere se enquadrar como ME/EPP`,
    data: {
      tipo: "mei_limit_90",
      faturamento: faturamento_atual.toString(),
    },
  });
}

/**
 * Notificação de limite MEI 100%
 */
export async function notifyMEILimit100(usuario_id: string) {
  return sendPushNotification(usuario_id, {
    title: "❌ Limite MEI 100% atingido",
    body: `Você atingiu o limite anual de R$ 81.000. Contacte seu contador para orientação.`,
    data: {
      tipo: "mei_limit_100",
    },
  });
}

/**
 * Notificação de NFS-e emitida
 */
export async function notifyNFSeIssued(
  usuario_id: string,
  nfse_numero: string,
  valor: string
) {
  return sendPushNotification(usuario_id, {
    title: "NFS-e emitida com sucesso",
    body: `Número: ${nfse_numero} - Valor: R$ ${valor}`,
    data: {
      tipo: "nfse_issued",
      numero: nfse_numero,
    },
  });
}

/**
 * Notificação de DAS disponível
 */
export async function notifyDASAvailable(
  usuario_id: string,
  valor: string,
  vencimento: string
) {
  return sendPushNotification(usuario_id, {
    title: "DAS disponível para pagamento",
    body: `Valor: R$ ${valor} - Vencimento: ${vencimento}`,
    data: {
      tipo: "das_available",
      valor,
      vencimento,
    },
  });
}

/**
 * Notificação de serviço aceito
 */
export async function notifyServiceAccepted(
  usuario_id: string,
  profissional_nome: string
) {
  return sendPushNotification(usuario_id, {
    title: "Serviço aceito!",
    body: `${profissional_nome} aceitou seu pedido`,
    data: {
      tipo: "service_accepted",
      profissional: profissional_nome,
    },
  });
}

/**
 * Notificação de pagamento confirmado
 */
export async function notifyPaymentConfirmed(
  usuario_id: string,
  valor: string
) {
  return sendPushNotification(usuario_id, {
    title: "Pagamento confirmado ✓",
    body: `R$ ${valor} - Serviço liberado`,
    data: {
      tipo: "payment_confirmed",
      valor,
    },
  });
}

/**
 * Notificação de serviço concluído
 */
export async function notifyServiceCompleted(
  usuario_id: string,
  servico_descricao: string
) {
  return sendPushNotification(usuario_id, {
    title: "Serviço concluído!",
    body: `${servico_descricao} foi finalizado`,
    data: {
      tipo: "service_completed",
      descricao: servico_descricao,
    },
  });
}
