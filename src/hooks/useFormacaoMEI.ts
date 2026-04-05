// useFormacaoMEI Hook
// Manages MEI formalization flow state and logic

import { useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  MEIPersonalDataSchema,
  MEICNPJSchema,
  MEIPersonalData,
  MEICNPJData,
  formatCPF,
  formatCNPJ,
  formatCEP,
  isValidCNPJ,
} from "@/schemas/mei-validation";
import {
  validateCNPJWithAPI,
  saveMEIRegistration,
  getMEIProfile,
  hasCompletedMEI,
} from "@/services/mei-service";

export interface MEIFlowState {
  currentStep: 1 | 2 | 3 | 4; // Step in the flow
  personalData: Partial<MEIPersonalData>;
  cnpj: string;
  isLoading: boolean;
  error: string | null;
  success: boolean;
  validationErrors: Record<string, string>;
}

export function useFormacaoMEI() {
  const { user } = useAuth();
  const [state, setState] = useState<MEIFlowState>({
    currentStep: 1,
    personalData: {},
    cnpj: "",
    isLoading: false,
    error: null,
    success: false,
    validationErrors: {},
  });

  /**
   * Move to next step
   */
  const nextStep = useCallback(async () => {
    if (state.currentStep < 4) {
      // Validate current step before moving
      if (state.currentStep === 2) {
        const validationResult = MEIPersonalDataSchema.safeParse(
          state.personalData
        );
        if (!validationResult.success) {
          const errors: Record<string, string> = {};
          validationResult.error.errors.forEach((err) => {
            const path = err.path.join(".");
            errors[path] = err.message;
          });
          setState((prev) => ({ ...prev, validationErrors: errors }));
          return;
        }
      }

      setState((prev) => ({
        ...prev,
        currentStep: (prev.currentStep + 1) as 1 | 2 | 3 | 4,
        validationErrors: {},
        error: null,
      }));
    }
  }, [state.currentStep, state.personalData]);

  /**
   * Move to previous step
   */
  const prevStep = useCallback(() => {
    if (state.currentStep > 1) {
      setState((prev) => ({
        ...prev,
        currentStep: (prev.currentStep - 1) as 1 | 2 | 3 | 4,
        error: null,
      }));
    }
  }, [state.currentStep]);

  /**
   * Update personal data field
   */
  const updatePersonalData = useCallback(
    (field: keyof MEIPersonalData, value: string) => {
      setState((prev) => ({
        ...prev,
        personalData: {
          ...prev.personalData,
          [field]: value,
        },
        validationErrors: {
          ...prev.validationErrors,
          [field]: undefined,
        },
      }));
    },
    []
  );

  /**
   * Format and update personal data field
   */
  const updateAndFormatField = useCallback(
    (field: keyof MEIPersonalData, value: string) => {
      let formatted = value;

      if (field === "cpf") {
        formatted = formatCPF(value);
      } else if (field === "cep") {
        formatted = formatCEP(value);
      }

      updatePersonalData(field, formatted);
    },
    [updatePersonalData]
  );

  /**
   * Update CNPJ field
   */
  const updateCNPJ = useCallback((value: string) => {
    const formatted = formatCNPJ(value);
    setState((prev) => ({
      ...prev,
      cnpj: formatted,
      validationErrors: {
        ...prev.validationErrors,
        cnpj: undefined,
      },
    }));
  }, []);

  /**
   * Validate CNPJ against Receita Federal API and save
   */
  const validateAndSaveMEI = useCallback(async () => {
    if (!user?.id) {
      setState((prev) => ({
        ...prev,
        error: "Usuário não identificado",
      }));
      return;
    }

    // Validate CNPJ schema
    const cnpjValidation = MEICNPJSchema.safeParse({ cnpj: state.cnpj });
    if (!cnpjValidation.success) {
      const errors: Record<string, string> = {};
      cnpjValidation.error.errors.forEach((err) => {
        const path = err.path.join(".");
        errors[path] = err.message;
      });
      setState((prev) => ({
        ...prev,
        validationErrors: errors,
      }));
      return;
    }

    // Validate CNPJ format
    if (!isValidCNPJ(state.cnpj)) {
      setState((prev) => ({
        ...prev,
        validationErrors: {
          ...prev.validationErrors,
          cnpj: "CNPJ inválido",
        },
      }));
      return;
    }

    setState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
    }));

    try {
      // Validate CNPJ with Receita Federal API
      const validation = await validateCNPJWithAPI(state.cnpj);

      if (!validation.valid) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: validation.error || "Erro ao validar CNPJ",
          validationErrors: {
            cnpj: validation.error || "CNPJ inválido",
          },
        }));
        return;
      }

      // Save MEI registration
      const saveResult = await saveMEIRegistration(user.id, {
        ...state.personalData,
        cnpj: state.cnpj,
      } as Parameters<typeof saveMEIRegistration>[1]);

      if (!saveResult.success) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: saveResult.error || "Erro ao salvar registro MEI",
        }));
        return;
      }

      // Success
      setState((prev) => ({
        ...prev,
        isLoading: false,
        success: true,
        error: null,
      }));
    } catch (err) {
      console.error("[useFormacaoMEI] Error:", err);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: "Erro ao processar registro MEI",
      }));
    }
  }, [user?.id, state.cnpj, state.personalData]);

  /**
   * Check if MEI is already registered
   */
  const checkExistingMEI = useCallback(async () => {
    if (!user?.id) return false;
    return await hasCompletedMEI(user.id);
  }, [user?.id]);

  /**
   * Reset flow
   */
  const resetFlow = useCallback(() => {
    setState({
      currentStep: 1,
      personalData: {},
      cnpj: "",
      isLoading: false,
      error: null,
      success: false,
      validationErrors: {},
    });
  }, []);

  return {
    // State
    state,
    currentStep: state.currentStep,
    personalData: state.personalData,
    cnpj: state.cnpj,
    isLoading: state.isLoading,
    error: state.error,
    success: state.success,
    validationErrors: state.validationErrors,

    // Actions
    nextStep,
    prevStep,
    updatePersonalData,
    updateAndFormatField,
    updateCNPJ,
    validateAndSaveMEI,
    checkExistingMEI,
    resetFlow,

    // Helpers
    isStepValid: {
      1: true, // Intro step always valid
      2: MEIPersonalDataSchema.safeParse(state.personalData).success,
      3: true, // Tutorial step always valid
      4: MEICNPJSchema.safeParse({ cnpj: state.cnpj }).success &&
        isValidCNPJ(state.cnpj),
    },
  };
}
