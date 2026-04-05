// MEI (Microempreendedor Individual) Validation Schema
// Used for form validation in MEI formalization flow

import { z } from "zod";

/**
 * Personal data validation for MEI registration
 */
export const MEIPersonalDataSchema = z.object({
  full_name: z
    .string()
    .min(5, "Nome completo deve ter pelo menos 5 caracteres")
    .max(150, "Nome completo não pode exceder 150 caracteres")
    .regex(/^[a-zA-ZÀ-ÿ\s]+$/, "Nome deve conter apenas letras"),
  cpf: z
    .string()
    .regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, "CPF deve estar no formato XXX.XXX.XXX-XX")
    .or(z.string().regex(/^\d{11}$/, "CPF deve ter 11 dígitos")),
  date_of_birth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato AAAA-MM-DD")
    .refine((date) => {
      const birthDate = new Date(date);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      return age >= 18;
    }, "Você deve ter pelo menos 18 anos para registrar um MEI"),
  cep: z
    .string()
    .regex(/^\d{5}-\d{3}$/, "CEP deve estar no formato XXXXX-XXX")
    .or(z.string().regex(/^\d{8}$/, "CEP deve ter 8 dígitos")),
  activity: z
    .string()
    .min(3, "Atividade deve ter pelo menos 3 caracteres")
    .max(100, "Atividade não pode exceder 100 caracteres")
    .describe("Descrição da atividade principal do MEI"),
});

/**
 * CNPJ validation schema
 */
export const MEICNPJSchema = z.object({
  cnpj: z
    .string()
    .regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, "CNPJ deve estar no formato XX.XXX.XXX/XXXX-XX")
    .or(z.string().regex(/^\d{14}$/, "CNPJ deve ter 14 dígitos"))
    .describe("CNPJ do MEI recém registrado"),
});

/**
 * Full MEI registration schema (combines both)
 */
export const MEIRegistrationSchema = MEIPersonalDataSchema.extend({
  cnpj: z
    .string()
    .regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, "CNPJ deve estar no formato XX.XXX.XXX/XXXX-XX")
    .or(z.string().regex(/^\d{14}$/, "CNPJ deve ter 14 dígitos")),
});

// Type exports for TypeScript
export type MEIPersonalData = z.infer<typeof MEIPersonalDataSchema>;
export type MEICNPJData = z.infer<typeof MEICNPJSchema>;
export type MEIRegistration = z.infer<typeof MEIRegistrationSchema>;

/**
 * Helper to format CPF
 */
export function formatCPF(cpf: string): string {
  const clean = cpf.replace(/\D/g, "");
  if (clean.length !== 11) return cpf;
  return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9)}`;
}

/**
 * Helper to format CNPJ
 */
export function formatCNPJ(cnpj: string): string {
  const clean = cnpj.replace(/\D/g, "");
  if (clean.length !== 14) return cnpj;
  return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}/${clean.slice(8, 12)}-${clean.slice(12)}`;
}

/**
 * Helper to format CEP
 */
export function formatCEP(cep: string): string {
  const clean = cep.replace(/\D/g, "");
  if (clean.length !== 8) return cep;
  return `${clean.slice(0, 5)}-${clean.slice(5)}`;
}

/**
 * Helper to validate CNPJ format and check digit
 */
export function isValidCNPJ(cnpj: string): boolean {
  const clean = cnpj.replace(/\D/g, "");
  if (clean.length !== 14) return false;

  // Check if all digits are the same
  if (/^(\d)\1{13}$/.test(clean)) return false;

  // Calculate first check digit
  let size = clean.length - 2;
  let numbers = clean.substring(0, size);
  const digits = clean.substring(size);
  let sum = 0;
  let pos = size - 7;

  for (let i = size; i >= 1; i--) {
    sum += numbers.charAt(size - i) * pos--;
    if (pos < 2) pos = 9;
  }

  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;

  // Calculate second check digit
  size = clean.length - 1;
  numbers = clean.substring(0, size);
  sum = 0;
  pos = size - 7;

  for (let i = size; i >= 1; i--) {
    sum += numbers.charAt(size - i) * pos--;
    if (pos < 2) pos = 9;
  }

  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1))) return false;

  return true;
}
