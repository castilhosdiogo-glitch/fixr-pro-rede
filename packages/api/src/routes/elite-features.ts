// Elite Features Routes
// Endpoints exclusivos para plano Elite

import { Router, Request, Response } from "express";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import AWS from "aws-sdk";
import {
  loadPlanFeatures,
  requireElitePlan,
} from "../middlewares/planMiddleware";
import { validateInput } from "../utils/validation";

const router = Router();
const prisma = new PrismaClient();

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SCHEMAS ZOD
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// AGENDA
const CreateScheduleSchema = z.object({
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  hora_inicio: z.string().regex(/^\d{2}:\d{2}$/),
  hora_fim: z.string().regex(/^\d{2}:\d{2}$/),
});

const UpdateScheduleSchema = z.object({
  disponivel: z.boolean(),
});

// ORÇAMENTO
const CreateQuoteSchema = z.object({
  servico_id: z.string().uuid(),
  itens: z.array(
    z.object({
      descricao: z.string().min(1).max(200),
      valor: z.number().positive(),
      quantidade: z.number().int().positive().default(1),
    })
  ),
  validade: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const UpdateQuoteStatusSchema = z.object({
  status: z.enum(["PENDENTE", "APROVADO", "RECUSADO"]),
});

// EQUIPE
const CreateTeamMemberSchema = z.object({
  nome: z.string().min(3).max(150),
  funcao: z.string().min(3).max(100),
  foto_url: z.string().url().optional(),
});

const UpdateTeamMemberSchema = z.object({
  nome: z.string().min(3).max(150).optional(),
  funcao: z.string().min(3).max(100).optional(),
  foto_url: z.string().url().optional(),
  ativo: z.boolean().optional(),
});

// PORTFÓLIO
const CreatePortfolioItemSchema = z.object({
  foto_base64: z.string(),
  legenda: z.string().max(300).optional(),
  servico_id: z.string().uuid().optional(),
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AGENDA INTEGRADA
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * POST /elite/schedule
 * Criar novo agendamento disponível
 */
router.post(
  "/schedule",
  loadPlanFeatures,
  requireElitePlan,
  async (req: Request, res: Response) => {
    try {
      const validation = await validateInput(
        req.body,
        CreateScheduleSchema
      );
      if (!validation.success) {
        return res.status(400).json(validation.errors);
      }

      const profissional_id = req.user?.id;
      if (!profissional_id) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      const { data, hora_inicio, hora_fim } = validation.data;

      // Verificar se profissional existe
      const profissional = await prisma.professional.findUnique({
        where: { user_id: profissional_id },
      });

      if (!profissional) {
        return res.status(404).json({ error: "Profissional não encontrado" });
      }

      // Criar agendamento
      const horario = await prisma.schedule.create({
        data: {
          profissional_id: profissional.id,
          data: new Date(data),
          hora_inicio: new Date(`2000-01-01T${hora_inicio}:00`),
          hora_fim: new Date(`2000-01-01T${hora_fim}:00`),
          disponivel: true,
        },
      });

      res.status(201).json(horario);
    } catch (error) {
      console.error("[ELITE] Error creating schedule:", error);
      res.status(500).json({ error: "Erro ao criar agendamento" });
    }
  }
);

/**
 * GET /elite/schedule
 * Obter agendamentos do profissional
 */
router.get(
  "/schedule",
  loadPlanFeatures,
  requireElitePlan,
  async (req: Request, res: Response) => {
    try {
      const profissional_id = req.user?.id;
      if (!profissional_id) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      const profissional = await prisma.professional.findUnique({
        where: { user_id: profissional_id },
      });

      if (!profissional) {
        return res.status(404).json({ error: "Profissional não encontrado" });
      }

      const agendamentos = await prisma.schedule.findMany({
        where: { profissional_id: profissional.id },
        orderBy: { data: "asc" },
      });

      res.json(agendamentos);
    } catch (error) {
      console.error("[ELITE] Error getting schedules:", error);
      res.status(500).json({ error: "Erro ao obter agendamentos" });
    }
  }
);

/**
 * PATCH /elite/schedule/:id
 * Atualizar agendamento
 */
router.patch(
  "/schedule/:id",
  loadPlanFeatures,
  requireElitePlan,
  async (req: Request, res: Response) => {
    try {
      const validation = await validateInput(
        req.body,
        UpdateScheduleSchema
      );
      if (!validation.success) {
        return res.status(400).json(validation.errors);
      }

      const profissional_id = req.user?.id;
      if (!profissional_id) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      const schedule_id = req.params.id;

      // Verificar propriedade
      const agendamento = await prisma.schedule.findUnique({
        where: { id: schedule_id },
        include: { profissional: true },
      });

      if (!agendamento) {
        return res.status(404).json({ error: "Agendamento não encontrado" });
      }

      if (agendamento.profissional.user_id !== profissional_id) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      // Atualizar
      const atualizado = await prisma.schedule.update({
        where: { id: schedule_id },
        data: validation.data,
      });

      res.json(atualizado);
    } catch (error) {
      console.error("[ELITE] Error updating schedule:", error);
      res.status(500).json({ error: "Erro ao atualizar agendamento" });
    }
  }
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ORÇAMENTO PERSONALIZADO
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * POST /elite/quotes
 * Criar orçamento personalizado
 */
router.post(
  "/quotes",
  loadPlanFeatures,
  requireElitePlan,
  async (req: Request, res: Response) => {
    try {
      const validation = await validateInput(
        req.body,
        CreateQuoteSchema
      );
      if (!validation.success) {
        return res.status(400).json(validation.errors);
      }

      const profissional_id = req.user?.id;
      if (!profissional_id) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      const { servico_id, itens, validade } = validation.data;

      // Verificar serviço
      const servico = await prisma.service.findUnique({
        where: { id: servico_id },
      });

      if (!servico) {
        return res.status(404).json({ error: "Serviço não encontrado" });
      }

      if (servico.profissional_id !== profissional_id) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      // Calcular valor total
      const valor_total = itens.reduce(
        (sum, item) => sum + item.valor * item.quantidade,
        0
      );

      // Criar orçamento
      const orcamento = await prisma.quote.create({
        data: {
          servico_id,
          profissional_id,
          itens_json: itens,
          valor_total,
          status: "PENDENTE",
          validade: new Date(validade),
        },
      });

      res.status(201).json(orcamento);
    } catch (error) {
      console.error("[ELITE] Error creating quote:", error);
      res.status(500).json({ error: "Erro ao criar orçamento" });
    }
  }
);

/**
 * PATCH /elite/quotes/:id/status
 * Atualizar status do orçamento (cliente aprova/recusa)
 */
router.patch(
  "/quotes/:id/status",
  loadPlanFeatures,
  async (req: Request, res: Response) => {
    try {
      const validation = await validateInput(
        req.body,
        UpdateQuoteStatusSchema
      );
      if (!validation.success) {
        return res.status(400).json(validation.errors);
      }

      const usuario_id = req.user?.id;
      if (!usuario_id) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      const quote_id = req.params.id;

      // Obter orçamento
      const orcamento = await prisma.quote.findUnique({
        where: { id: quote_id },
        include: { servico: true },
      });

      if (!orcamento) {
        return res.status(404).json({ error: "Orçamento não encontrado" });
      }

      // Apenas cliente pode aprovar/recusar
      if (orcamento.servico.cliente_id !== usuario_id) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      // Atualizar status
      const atualizado = await prisma.quote.update({
        where: { id: quote_id },
        data: { status: validation.data.status },
      });

      res.json(atualizado);
    } catch (error) {
      console.error("[ELITE] Error updating quote status:", error);
      res.status(500).json({ error: "Erro ao atualizar orçamento" });
    }
  }
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GESTÃO DE EQUIPE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * POST /elite/team
 * Adicionar membro da equipe
 * Máximo 3 membros
 */
router.post(
  "/team",
  loadPlanFeatures,
  requireElitePlan,
  async (req: Request, res: Response) => {
    try {
      const validation = await validateInput(
        req.body,
        CreateTeamMemberSchema
      );
      if (!validation.success) {
        return res.status(400).json(validation.errors);
      }

      const profissional_id = req.user?.id;
      if (!profissional_id) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      const profissional = await prisma.professional.findUnique({
        where: { user_id: profissional_id },
      });

      if (!profissional) {
        return res.status(404).json({ error: "Profissional não encontrado" });
      }

      // Verificar limite
      const membros_count = await prisma.teamMember.count({
        where: {
          profissional_id: profissional.id,
          ativo: true,
        },
      });

      if (membros_count >= 3) {
        return res.status(400).json({
          error: "Limite de 3 membros da equipe atingido",
          limite: 3,
          atual: membros_count,
        });
      }

      // Criar membro
      const membro = await prisma.teamMember.create({
        data: {
          profissional_id: profissional.id,
          ...validation.data,
        },
      });

      res.status(201).json(membro);
    } catch (error) {
      console.error("[ELITE] Error creating team member:", error);
      res.status(500).json({ error: "Erro ao adicionar membro da equipe" });
    }
  }
);

/**
 * GET /elite/team
 * Obter membros da equipe
 */
router.get(
  "/team",
  loadPlanFeatures,
  requireElitePlan,
  async (req: Request, res: Response) => {
    try {
      const profissional_id = req.user?.id;
      if (!profissional_id) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      const profissional = await prisma.professional.findUnique({
        where: { user_id: profissional_id },
      });

      if (!profissional) {
        return res.status(404).json({ error: "Profissional não encontrado" });
      }

      const membros = await prisma.teamMember.findMany({
        where: { profissional_id: profissional.id },
        orderBy: { createdAt: "asc" },
      });

      res.json(membros);
    } catch (error) {
      console.error("[ELITE] Error getting team members:", error);
      res.status(500).json({ error: "Erro ao obter membros da equipe" });
    }
  }
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PORTFÓLIO PÚBLICO
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * POST /elite/portfolio
 * Adicionar foto ao portfólio
 * Máximo 20 fotos
 */
router.post(
  "/portfolio",
  loadPlanFeatures,
  requireElitePlan,
  async (req: Request, res: Response) => {
    try {
      const validation = await validateInput(
        req.body,
        CreatePortfolioItemSchema
      );
      if (!validation.success) {
        return res.status(400).json(validation.errors);
      }

      const profissional_id = req.user?.id;
      if (!profissional_id) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      const profissional = await prisma.professional.findUnique({
        where: { user_id: profissional_id },
      });

      if (!profissional) {
        return res.status(404).json({ error: "Profissional não encontrado" });
      }

      // Verificar limite
      const fotos_count = await prisma.portfolio.count({
        where: { profissional_id: profissional.id },
      });

      if (fotos_count >= 20) {
        return res.status(400).json({
          error: "Limite de 20 fotos no portfólio atingido",
          limite: 20,
          atual: fotos_count,
        });
      }

      // Upload para S3
      const buffer = Buffer.from(validation.data.foto_base64, "base64");
      const fileKey = `portfolio/${profissional.id}/${Date.now()}.jpg`;

      const uploadParams = {
        Bucket: process.env.AWS_BUCKET_NAME!,
        Key: fileKey,
        Body: buffer,
        ContentType: "image/jpeg",
      };

      await s3.upload(uploadParams).promise();

      const foto_url = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;

      // Criar item do portfólio
      const item = await prisma.portfolio.create({
        data: {
          profissional_id: profissional.id,
          foto_url,
          legenda: validation.data.legenda,
          servico_id: validation.data.servico_id,
        },
      });

      res.status(201).json(item);
    } catch (error) {
      console.error("[ELITE] Error creating portfolio item:", error);
      res.status(500).json({ error: "Erro ao adicionar foto ao portfólio" });
    }
  }
);

/**
 * GET /elite/portfolio/:profissional_id
 * Obter portfólio público de um profissional
 */
router.get("/portfolio/:profissional_id", async (req: Request, res: Response) => {
  try {
    const { profissional_id } = req.params;

    const fotos = await prisma.portfolio.findMany({
      where: { profissional_id },
      orderBy: { createdAt: "desc" },
    });

    res.json(fotos);
  } catch (error) {
    console.error("[ELITE] Error getting portfolio:", error);
    res.status(500).json({ error: "Erro ao obter portfólio" });
  }
});

/**
 * DELETE /elite/portfolio/:id
 * Deletar foto do portfólio
 */
router.delete(
  "/portfolio/:id",
  loadPlanFeatures,
  requireElitePlan,
  async (req: Request, res: Response) => {
    try {
      const profissional_id = req.user?.id;
      if (!profissional_id) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      const profissional = await prisma.professional.findUnique({
        where: { user_id: profissional_id },
      });

      if (!profissional) {
        return res.status(404).json({ error: "Profissional não encontrado" });
      }

      // Verificar propriedade
      const foto = await prisma.portfolio.findUnique({
        where: { id: req.params.id },
      });

      if (!foto) {
        return res.status(404).json({ error: "Foto não encontrada" });
      }

      if (foto.profissional_id !== profissional.id) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      // Deletar de S3
      const fileKey = foto.foto_url.split("/").pop();
      if (fileKey) {
        await s3
          .deleteObject({
            Bucket: process.env.AWS_BUCKET_NAME!,
            Key: `portfolio/${profissional.id}/${fileKey}`,
          })
          .promise();
      }

      // Deletar do banco
      await prisma.portfolio.delete({
        where: { id: req.params.id },
      });

      res.json({ message: "Foto deletada" });
    } catch (error) {
      console.error("[ELITE] Error deleting portfolio item:", error);
      res.status(500).json({ error: "Erro ao deletar foto" });
    }
  }
);

export default router;
