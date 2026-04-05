// MEI Formalization - Screen 2: Personal Data
// Tela de formulário com campos nome, CPF, data nascimento, CEP, atividade

import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { ArrowRight, ArrowLeft, AlertCircle } from "lucide-react-native";
import { MEIFlowState } from "@/hooks/useFormacaoMEI";

interface Screen2PersonalDataProps {
  state: MEIFlowState;
  onUpdateField: (field: keyof MEIFlowState["personalData"], value: string) => void;
  onUpdateAndFormat: (field: keyof MEIFlowState["personalData"], value: string) => void;
  onNext: () => void;
  onPrev: () => void;
}

const formFields = [
  {
    key: "full_name",
    label: "Nome Completo",
    placeholder: "João da Silva",
    type: "text",
    help: "Mínimo 5 caracteres",
  },
  {
    key: "cpf",
    label: "CPF",
    placeholder: "000.000.000-00",
    type: "cpf",
    help: "Formato: XXX.XXX.XXX-XX",
  },
  {
    key: "date_of_birth",
    label: "Data de Nascimento",
    placeholder: "AAAA-MM-DD",
    type: "date",
    help: "Você deve ter 18+ anos",
  },
  {
    key: "cep",
    label: "CEP",
    placeholder: "00000-000",
    type: "cep",
    help: "Formato: XXXXX-XXX",
  },
  {
    key: "activity",
    label: "Atividade Principal",
    placeholder: "Ex: Eletricista, Encanador, Consultor",
    type: "text",
    help: "Descrição da sua atividade (3-100 caracteres)",
  },
];

export function Screen2PersonalData({
  state,
  onUpdateField,
  onUpdateAndFormat,
  onNext,
  onPrev,
}: Screen2PersonalDataProps) {
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleFieldChange = (fieldKey: string, value: string) => {
    if (["cpf", "cep"].includes(fieldKey)) {
      onUpdateAndFormat(fieldKey as keyof MEIFlowState["personalData"], value);
    } else {
      onUpdateField(fieldKey as keyof MEIFlowState["personalData"], value);
    }
  };

  const isStepValid = formFields.every(field => {
    const fieldKey = field.key as keyof MEIFlowState["personalData"];
    return state.personalData[fieldKey];
  });

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Seus Dados Pessoais</Text>
        <Text style={styles.subtitle}>
          Preencha as informações para registrar o MEI (Etapa 2 de 4)
        </Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { width: "50%" }]} />
      </View>

      {/* Form Fields */}
      <View style={styles.formContainer}>
        {formFields.map((field) => {
          const fieldKey = field.key as keyof MEIFlowState["personalData"];
          const value = state.personalData[fieldKey] as string || "";
          const error = state.validationErrors[fieldKey];

          return (
            <View key={field.key} style={styles.fieldGroup}>
              <Text style={styles.label}>{field.label}</Text>

              <TextInput
                style={[
                  styles.input,
                  focusedField === field.key && styles.inputFocused,
                  error && styles.inputError,
                ]}
                placeholder={field.placeholder}
                placeholderTextColor="#CCCCCC"
                value={value}
                onChangeText={(text) => handleFieldChange(field.key, text)}
                onFocus={() => setFocusedField(field.key)}
                onBlur={() => setFocusedField(null)}
                keyboardType={
                  field.type === "date"
                    ? "number-pad"
                    : field.type === "cpf" || field.type === "cep"
                      ? "number-pad"
                      : "default"
                }
                multiline={false}
              />

              {error && (
                <View style={styles.errorContainer}>
                  <AlertCircle width={14} height={14} color="#EF4444" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {!error && (
                <Text style={styles.helpText}>{field.help}</Text>
              )}
            </View>
          );
        })}
      </View>

      {/* Form Errors Summary */}
      {Object.keys(state.validationErrors).length > 0 && (
        <View style={styles.errorsSummary}>
          <Text style={styles.errorsSummaryText}>
            ⚠ Preencha todos os campos corretamente para continuar
          </Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={onPrev}
          activeOpacity={0.8}
        >
          <ArrowLeft width={20} height={20} color="#0066CC" />
          <Text style={styles.secondaryButtonText}>Voltar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.primaryButton,
            !isStepValid && styles.primaryButtonDisabled,
          ]}
          onPress={onNext}
          disabled={!isStepValid}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>Próximo</Text>
          <ArrowRight width={20} height={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.spacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  header: {
    marginBottom: 24,
    marginTop: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0066CC",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#666666",
    lineHeight: 20,
  },
  progressContainer: {
    height: 4,
    backgroundColor: "#E5E5E5",
    borderRadius: 2,
    marginBottom: 24,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#0066CC",
    borderRadius: 2,
  },
  formContainer: {
    marginBottom: 24,
  },
  fieldGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: "#000000",
    backgroundColor: "#FAFAFA",
  },
  inputFocused: {
    borderColor: "#0066CC",
    backgroundColor: "#FFFFFF",
  },
  inputError: {
    borderColor: "#EF4444",
    backgroundColor: "#FEF2F2",
  },
  helpText: {
    fontSize: 12,
    color: "#999999",
    marginTop: 4,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 4,
  },
  errorText: {
    fontSize: 12,
    color: "#EF4444",
  },
  errorsSummary: {
    backgroundColor: "#FEF2F2",
    borderLeftWidth: 4,
    borderLeftColor: "#EF4444",
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
  },
  errorsSummaryText: {
    fontSize: 14,
    color: "#DC2626",
    fontWeight: "500",
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: "#0066CC",
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  primaryButtonDisabled: {
    backgroundColor: "#CCCCCC",
    opacity: 0.6,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0066CC",
  },
  spacer: {
    height: 20,
  },
});
