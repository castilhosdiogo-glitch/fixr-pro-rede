// Chat Routes
// Endpoints para mensagens em tempo real (texto, áudio, foto, vídeo)

import { Router, Request, Response } from "express";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import AWS from "aws-sdk";
import {
  loadPlanFeatures,
  requireAudioChat,
  requirePhotoChat,
  requireVideoChat,
} from "../middlewares/planMiddleware";
import { validateInput } from "../utils/validation";
import { sendPushNotification } from "../services/push-notification";

const router = Router();
const prisma = new PrismaClient();

// Configurar AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SCHEMAS ZOD
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const TextMessageSchema = z.object({
  servico_id: z.string().uuid(),
  conteudo: z.string().min(1).max(1000),
});

const AudioMessageSchema = z.object({
  servico_id: z.string().uuid(),
  arquivo_base64: z.string(),
  duracao: z.number().int().min(1).max(300), // até 5 minutos
});

const PhotoMessageSchema = z.object({
  servico_id: z.string().uuid(),
  arquivo_base64: z.string(),
});

const VideoMessageSchema = z.object({
  servico_id: z.string().uuid(),
  arquivo_base64: z.string(),
  duracao: z.number().int().min(1).max(30),
});

const GetMessagesSchema = z.object({
  servico_id: z.string().uuid(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ENDPOINTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * POST /chat/text
 * Enviar mensagem de texto
 */
router.post("/text", loadPlanFeatures, async (req: Request, res: Response) => {
  try {
    const validation = await validateInput(req.body, TextMessageSchema);
    if (!validation.success) {
      return res.status(400).json(validation.errors);
    }

    const { servico_id, conteudo } = validation.data;
    const remetente_id = req.user?.id;

    if (!remetente_id) {
      return res.status(401).json({ error: "Não autenticado" });
    }

    // Verificar se usuário tem acesso ao serviço
    const servico = await prisma.service.findUnique({
      where: { id: servico_id },
    });

    if (!servico) {
      return res.status(404).json({ error: "Serviço não encontrado" });
    }

    if (
      remetente_id !== servico.cliente_id &&
      remetente_id !== servico.profissional_id
    ) {
      return res.status(403).json({ error: "Acesso negado ao chat" });
    }

    // Criar mensagem
    const mensagem = await prisma.message.create({
      data: {
        servico_id,
        remetente_id,
        tipo: "TEXTO",
        conteudo,
      },
    });

    // Enviar push notification ao outro usuário
    const destinatario_id =
      remetente_id === servico.cliente_id
        ? servico.profissional_id
        : servico.cliente_id;

    if (destinatario_id) {
      await sendPushNotification(destinatario_id, {
        title: "Nova mensagem",
        body: conteudo,
        data: {
          servico_id,
          tipo: "new_message",
        },
      });
    }

    res.status(201).json(mensagem);
  } catch (error) {
    console.error("[CHAT] Error sending text message:", error);
    res.status(500).json({ error: "Erro ao enviar mensagem" });
  }
});

/**
 * POST /chat/audio
 * Enviar mensagem de áudio
 * Requer plano Parceiro ou Elite
 */
router.post(
  "/audio",
  loadPlanFeatures,
  requireAudioChat,
  async (req: Request, res: Response) => {
    try {
      const validation = await validateInput(req.body, AudioMessageSchema);
      if (!validation.success) {
        return res.status(400).json(validation.errors);
      }

      const { servico_id, arquivo_base64, duracao } = validation.data;
      const remetente_id = req.user?.id;

      if (!remetente_id) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      // Verificar acesso ao serviço
      const servico = await prisma.service.findUnique({
        where: { id: servico_id },
      });

      if (!servico) {
        return res.status(404).json({ error: "Serviço não encontrado" });
      }

      if (
        remetente_id !== servico.cliente_id &&
        remetente_id !== servico.profissional_id
      ) {
        return res.status(403).json({ error: "Acesso negado ao chat" });
      }

      // Upload para S3
      const buffer = Buffer.from(arquivo_base64, "base64");
      const fileKey = `chat/audio/${servico_id}/${Date.now()}.m4a`;

      const uploadParams = {
        Bucket: process.env.AWS_BUCKET_NAME!,
        Key: fileKey,
        Body: buffer,
        ContentType: "audio/m4a",
      };

      await s3.upload(uploadParams).promise();

      const arquivo_url = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;

      // Criar mensagem
      const mensagem = await prisma.message.create({
        data: {
          servico_id,
          remetente_id,
          tipo: "AUDIO",
          arquivo_url,
          duracao,
        },
      });

      // Enviar push notification
      const destinatario_id =
        remetente_id === servico.cliente_id
          ? servico.profissional_id
          : servico.cliente_id;

      if (destinatario_id) {
        await sendPushNotification(destinatario_id, {
          title: "Novo áudio recebido",
          body: `Áudio de ${duracao}s`,
          data: {
            servico_id,
            tipo: "new_audio",
          },
        });
      }

      res.status(201).json(mensagem);
    } catch (error) {
      console.error("[CHAT] Error sending audio message:", error);
      res.status(500).json({ error: "Erro ao enviar áudio" });
    }
  }
);

/**
 * POST /chat/photo
 * Enviar mensagem com foto
 * Requer plano Parceiro ou Elite
 */
router.post(
  "/photo",
  loadPlanFeatures,
  requirePhotoChat,
  async (req: Request, res: Response) => {
    try {
      const validation = await validateInput(req.body, PhotoMessageSchema);
      if (!validation.success) {
        return res.status(400).json(validation.errors);
      }

      const { servico_id, arquivo_base64 } = validation.data;
      const remetente_id = req.user?.id;

      if (!remetente_id) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      // Verificar acesso ao serviço
      const servico = await prisma.service.findUnique({
        where: { id: servico_id },
      });

      if (!servico) {
        return res.status(404).json({ error: "Serviço não encontrado" });
      }

      if (
        remetente_id !== servico.cliente_id &&
        remetente_id !== servico.profissional_id
      ) {
        return res.status(403).json({ error: "Acesso negado ao chat" });
      }

      // Upload para S3
      const buffer = Buffer.from(arquivo_base64, "base64");
      const fileKey = `chat/photos/${servico_id}/${Date.now()}.jpg`;

      const uploadParams = {
        Bucket: process.env.AWS_BUCKET_NAME!,
        Key: fileKey,
        Body: buffer,
        ContentType: "image/jpeg",
      };

      await s3.upload(uploadParams).promise();

      const arquivo_url = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;

      // Criar mensagem
      const mensagem = await prisma.message.create({
        data: {
          servico_id,
          remetente_id,
          tipo: "FOTO",
          arquivo_url,
        },
      });

      // Enviar push notification
      const destinatario_id =
        remetente_id === servico.cliente_id
          ? servico.profissional_id
          : servico.cliente_id;

      if (destinatario_id) {
        await sendPushNotification(destinatario_id, {
          title: "Nova foto recebida",
          body: "Foto no chat",
          data: {
            servico_id,
            tipo: "new_photo",
          },
        });
      }

      res.status(201).json(mensagem);
    } catch (error) {
      console.error("[CHAT] Error sending photo message:", error);
      res.status(500).json({ error: "Erro ao enviar foto" });
    }
  }
);

/**
 * POST /chat/video
 * Enviar mensagem com vídeo
 * Requer plano Elite
 */
router.post(
  "/video",
  loadPlanFeatures,
  requireVideoChat,
  async (req: Request, res: Response) => {
    try {
      const validation = await validateInput(req.body, VideoMessageSchema);
      if (!validation.success) {
        return res.status(400).json(validation.errors);
      }

      const { servico_id, arquivo_base64, duracao } = validation.data;
      const remetente_id = req.user?.id;

      if (!remetente_id) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      // Verificar acesso ao serviço
      const servico = await prisma.service.findUnique({
        where: { id: servico_id },
      });

      if (!servico) {
        return res.status(404).json({ error: "Serviço não encontrado" });
      }

      if (
        remetente_id !== servico.cliente_id &&
        remetente_id !== servico.profissional_id
      ) {
        return res.status(403).json({ error: "Acesso negado ao chat" });
      }

      // Upload para S3
      const buffer = Buffer.from(arquivo_base64, "base64");
      const fileKey = `chat/videos/${servico_id}/${Date.now()}.mp4`;

      const uploadParams = {
        Bucket: process.env.AWS_BUCKET_NAME!,
        Key: fileKey,
        Body: buffer,
        ContentType: "video/mp4",
      };

      await s3.upload(uploadParams).promise();

      const arquivo_url = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;

      // Criar mensagem
      const mensagem = await prisma.message.create({
        data: {
          servico_id,
          remetente_id,
          tipo: "VIDEO",
          arquivo_url,
          duracao,
        },
      });

      // Enviar push notification
      const destinatario_id =
        remetente_id === servico.cliente_id
          ? servico.profissional_id
          : servico.cliente_id;

      if (destinatario_id) {
        await sendPushNotification(destinatario_id, {
          title: "Novo vídeo recebido",
          body: `Vídeo de ${duracao}s`,
          data: {
            servico_id,
            tipo: "new_video",
          },
        });
      }

      res.status(201).json(mensagem);
    } catch (error) {
      console.error("[CHAT] Error sending video message:", error);
      res.status(500).json({ error: "Erro ao enviar vídeo" });
    }
  }
);

/**
 * GET /chat/:servico_id
 * Obter histórico de mensagens
 */
router.get("/:servico_id", loadPlanFeatures, async (req: Request, res: Response) => {
  try {
    const validation = await validateInput(
      { servico_id: req.params.servico_id, ...req.query },
      GetMessagesSchema
    );

    if (!validation.success) {
      return res.status(400).json(validation.errors);
    }

    const { servico_id, limit, offset } = validation.data;
    const usuario_id = req.user?.id;

    if (!usuario_id) {
      return res.status(401).json({ error: "Não autenticado" });
    }

    // Verificar acesso ao serviço
    const servico = await prisma.service.findUnique({
      where: { id: servico_id },
    });

    if (!servico) {
      return res.status(404).json({ error: "Serviço não encontrado" });
    }

    if (
      usuario_id !== servico.cliente_id &&
      usuario_id !== servico.profissional_id
    ) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    // Obter mensagens
    const mensagens = await prisma.message.findMany({
      where: { servico_id },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });

    // Marcar como lidas
    await prisma.message.updateMany({
      where: {
        servico_id,
        remetente_id: { not: usuario_id },
        lido: false,
      },
      data: {
        lido: true,
        lido_em: new Date(),
      },
    });

    res.json({
      total: await prisma.message.count({ where: { servico_id } }),
      mensagens: mensagens.reverse(),
    });
  } catch (error) {
    console.error("[CHAT] Error getting messages:", error);
    res.status(500).json({ error: "Erro ao obter mensagens" });
  }
});

/**
 * DELETE /chat/:mensagem_id
 * Deletar mensagem (apenas remetente)
 */
router.delete("/:mensagem_id", async (req: Request, res: Response) => {
  try {
    const mensagem_id = req.params.mensagem_id;
    const usuario_id = req.user?.id;

    if (!usuario_id) {
      return res.status(401).json({ error: "Não autenticado" });
    }

    const mensagem = await prisma.message.findUnique({
      where: { id: mensagem_id },
    });

    if (!mensagem) {
      return res.status(404).json({ error: "Mensagem não encontrada" });
    }

    if (mensagem.remetente_id !== usuario_id) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    await prisma.message.delete({
      where: { id: mensagem_id },
    });

    res.json({ message: "Mensagem deletada" });
  } catch (error) {
    console.error("[CHAT] Error deleting message:", error);
    res.status(500).json({ error: "Erro ao deletar mensagem" });
  }
});

export default router;
