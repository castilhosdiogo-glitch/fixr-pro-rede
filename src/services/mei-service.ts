// MEI Service
// Handles MEI registration and CNPJ validation

import { supabase } from "@/lib/supabase";
import { formatCNPJ } from "@/schemas/mei-validation";

/**
 * Response from CNPJ validation API
 */
export interface CNPJValidationResponse {
  cnpj: string;
  name: string;
  status: "active" | "inactive" | "closed";
  created_at?: string;
  updated_at?: string;
}

/**
 * MEI Registration data stored in database
 */
export interface MEIProfile {
  id: string;
  user_id: string;
  cnpj: string;
  full_name: string;
  cpf: string;
  date_of_birth: string;
  cep: string;
  activity: string;
  status: "pending" | "verified" | "active";
  verified_at?: string;
  created_at: string;
}

/**
 * Validates CNPJ against Receita Federal API
 * Uses public API: https://publica.cnpj.ws
 */
export async function validateCNPJWithAPI(cnpj: string): Promise<{
  valid: boolean;
  data?: CNPJValidationResponse;
  error?: string;
}> {
  try {
    // Format CNPJ for API call (remove special characters)
    const cleanCNPJ = cnpj.replace(/\D/g, "");

    if (cleanCNPJ.length !== 14) {
      return {
        valid: false,
        error: "CNPJ deve ter 14 dígitos",
      };
    }

    // Call Receita Federal API
    const response = await fetch(
      `https://publica.cnpj.ws/cnpj/${cleanCNPJ}`,
      {
        method: "GET",
        headers: {
          "Accept": "application/json",
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return {
          valid: false,
          error: "CNPJ não encontrado na base da Receita Federal",
        };
      }
      return {
        valid: false,
        error: "Erro ao validar CNPJ. Tente novamente mais tarde.",
      };
    }

    const data: CNPJValidationResponse = await response.json();

    // Check if CNPJ is active
    if (data.status !== "active") {
      return {
        valid: false,
        error: `CNPJ inativo ou fechado (Status: ${data.status})`,
      };
    }

    return {
      valid: true,
      data,
    };
  } catch (error) {
    console.error("[MEI_SERVICE] CNPJ validation error:", error);
    return {
      valid: false,
      error: "Erro ao validar CNPJ. Verifique sua conexão.",
    };
  }
}

/**
 * Save MEI registration to database
 */
export async function saveMEIRegistration(
  userId: string,
  data: {
    full_name: string;
    cpf: string;
    date_of_birth: string;
    cep: string;
    activity: string;
    cnpj: string;
  }
): Promise<{
  success: boolean;
  mei?: MEIProfile;
  error?: string;
}> {
  try {
    const { data: mei, error } = await supabase
      .from("mei_profiles")
      .insert({
        user_id: userId,
        cnpj: data.cnpj.replace(/\D/g, ""), // Store clean CNPJ
        full_name: data.full_name,
        cpf: data.cpf.replace(/\D/g, ""), // Store clean CPF
        date_of_birth: data.date_of_birth,
        cep: data.cep.replace(/\D/g, ""), // Store clean CEP
        activity: data.activity,
        status: "verified",
        verified_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("[MEI_SERVICE] Database error:", error);
      return {
        success: false,
        error: "Erro ao salvar registro MEI",
      };
    }

    // Update user profile with MEI badge
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        has_mei: true,
        mei_cnpj: data.cnpj.replace(/\D/g, ""),
      })
      .eq("id", userId);

    if (updateError) {
      console.warn("[MEI_SERVICE] Could not update profile badge:", updateError);
      // Don't fail - MEI record was saved successfully
    }

    return {
      success: true,
      mei,
    };
  } catch (err) {
    console.error("[MEI_SERVICE] Error saving MEI:", err);
    return {
      success: false,
      error: "Erro ao salvar registro MEI",
    };
  }
}

/**
 * Get user's MEI profile
 */
export async function getMEIProfile(
  userId: string
): Promise<{
  success: boolean;
  mei?: MEIProfile;
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from("mei_profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No record found
        return {
          success: true,
          mei: undefined,
        };
      }
      return {
        success: false,
        error: "Erro ao buscar perfil MEI",
      };
    }

    return {
      success: true,
      mei: data,
    };
  } catch (err) {
    console.error("[MEI_SERVICE] Error getting MEI profile:", err);
    return {
      success: false,
      error: "Erro ao buscar perfil MEI",
    };
  }
}

/**
 * Check if user has completed MEI registration
 */
export async function hasCompletedMEI(userId: string): Promise<boolean> {
  const { mei } = await getMEIProfile(userId);
  return !!mei && mei.status === "verified";
}
