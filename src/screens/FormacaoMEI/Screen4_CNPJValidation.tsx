// MEI Formalization - Screen 4: CNPJ Validation
// Tela para digitar CNPJ e validação via Receita Federal

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
import {
  ArrowLeft,
  Check,
  AlertCircle,
  CheckCircle2,
  Loader,
} from "lucide-react-native";

interface Screen4CNPJValidationProps {
  state: {
    cnpj: string;
    isLoading: boolean;
    error: string | null;
    success: boolean;
    validationErrors: Record<string, string>;
  };
  onUpdateCNPJ: (value: string) => void;
  onValidateAndSave: () => void;
  onPrev: () => void;
}

export function Screen4CNPJValidation({
  state,
  onUpdateCNPJ,
  onValidateAndSave,
  onPrev,
}: Screen4CNPJValidationProps) {
  const [focusedField, setFocusedField] = useState(false);

  const isCNPJValid =
    state.cnpj &&
    state.cnpj.replace(/\D/g, "").length === 14 &&
    !state.validationErrors.cnpj;

  const handleCNPJChange = (value: string) => {
    onUpdateCNPJ(value);
  };

  const displayCNPJ = state.cnpj || "";

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Seu CNPJ MEI</Text>
        <Text style={styles.subtitle}>
          Digite o CNPJ recebido do gov.br (Etapa 4 de 4)
        </Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { width: "100%" }]} />
      </View>

      {/* Success State */}
      {state.success && (
        <View style={styles.successContainer}>
          <CheckCircle2 width={48} height={48} color="#22C55E" />
          <Text style={styles.successTitle}>MEI Registrado com Sucesso!</Text>
          <Text style={styles.successText}>
            Seus dados foram salvos e seu perfil agora tem o badge MEI ativo.
          </Text>
        </View>
      )}

      {/* Form Section */}
      {!state.success && (
        <>
          {/* CNPJ Input */}
          <View style={styles.cnpjSection}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>CNPJ do MEI</Text>
              <Text style={styles.hint}>
                Formato: XX.XXX.XXX/XXXX-XX (14 dígitos)
              </Text>

              <TextInput
                style={[
                  styles.cnpjInput,
                  focusedField && styles.cnpjInputFocused,
                  state.validationErrors.cnpj && styles.cnpjInputError,
                  state.success && styles.cnpjInputSuccess,
                ]}
                placeholder="00.000.000/0000-00"
                placeholderTextColor="#CCCCCC"
                value={displayCNPJ}
                onChangeText={handleCNPJChange}
                onFocus={() => setFocusedField(true)}
                onBlur={() => setFocusedField(false)}
                keyboardType="number-pad"
                editable={!state.isLoading}
              />

              {/* Validation State */}
              {state.validationErrors.cnpj && (
                <View style={styles.errorContainer}>
                  <AlertCircle width={16} height={16} color="#EF4444" />
                  <Text style={styles.errorText}>
                    {state.validationErrors.cnpj}
                  </Text>
                </View>
              )}

              {isCNPJValid && !state.validationErrors.cnpj && (
                <View style={styles.successMessage}>
                  <Check width={16} height={16} color="#22C55E" />
                  <Text style={styles.successMessageText}>
                    CNPJ formatado corretamente
                  </Text>
                </View>
              )}
            </View>

            {/* Info Box */}
            <View style={styles.infoBox}>
              <Text style={styles.infoBoxTitle}>Onde encontrar?</Text>
              <Text style={styles.infoBoxText}>
                O CNPJ foi gerado no final do processo de registro no gov.br.
                Você pode encontrá-lo no email de confirmação ou voltando ao
                portal com seus dados de CPF.
              </Text>
            </View>
          </View>

          {/* Loading State */}
          {state.isLoading && (
            <View style={styles.loadingContainer}>
              <Loader width={24} height={24} color="#0066CC" />
              <Text style={styles.loadingText}>
                Validando CNPJ com Receita Federal...
              </Text>
            </View>
          )}

          {/* Error State */}
          {state.error && (
            <View style={styles.errorBox}>
              <AlertCircle width={20} height={20} color="#EF4444" />
              <View style={styles.errorBoxContent}>
                <Text style={styles.errorBoxTitle}>Erro na Validação</Text>
                <Text style={styles.errorBoxText}>{state.error}</Text>
              </View>
            </View>
          )}
        </>
      )}

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={onPrev}
          disabled={state.isLoading || state.success}
          activeOpacity={0.8}
        >
          <ArrowLeft width={20} height={20} color="#0066CC" />
          <Text style={styles.secondaryButtonText}>Voltar</Text>
        </TouchableOpacity>

        {!state.success && (
          <TouchableOpacity
            style={[
              styles.primaryButton,
              (!isCNPJValid || state.isLoading) && styles.primaryButtonDisabled,
            ]}
            onPress={onValidateAndSave}
            disabled={!isCNPJValid || state.isLoading}
            activeOpacity={0.8}
          >
            {state.isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.primaryButtonText}>Salvar CNPJ</Text>
                <Check width={20} height={20} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>
        )}

        {state.success && (
          <TouchableOpacity
            style={styles.successButton}
            onPress={() => {
              // Dismiss modal or navigate away
              Alert.alert("MEI Registrado", "Seu perfil foi atualizado com sucesso!");
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.successButtonText}>Finalizar</Text>
            <CheckCircle2 width={20} height={20} color="#22C55E" />
          </TouchableOpacity>
        )}
      </View>

      {/* Footer Info */}
      <View style={styles.footerInfo}>
        <Text style={styles.footerInfoText}>
          ✓ Seus dados são criptografados e seguros{"\n"}
          ✓ Certificado SSL de segurança ativado{"\n"}
          ✓ Conformidade LGPD
        </Text>
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
  successContainer: {
    backgroundColor: "#F0FDF4",
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    marginBottom: 32,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#22C55E",
    marginTop: 12,
    marginBottom: 8,
  },
  successText: {
    fontSize: 14,
    color: "#666666",
    lineHeight: 20,
    textAlign: "center",
  },
  cnpjSection: {
    marginBottom: 24,
  },
  fieldGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 4,
  },
  hint: {
    fontSize: 12,
    color: "#999999",
    marginBottom: 8,
  },
  cnpjInput: {
    borderWidth: 2,
    borderColor: "#E5E5E5",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 18,
    fontWeight: "600",
    color: "#000000",
    backgroundColor: "#FAFAFA",
    textAlign: "center",
    letterSpacing: 1,
  },
  cnpjInputFocused: {
    borderColor: "#0066CC",
    backgroundColor: "#FFFFFF",
  },
  cnpjInputError: {
    borderColor: "#EF4444",
    backgroundColor: "#FEF2F2",
  },
  cnpjInputSuccess: {
    borderColor: "#22C55E",
    backgroundColor: "#F0FDF4",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    marginTop: 8,
  },
  errorText: {
    fontSize: 12,
    color: "#EF4444",
    fontWeight: "500",
  },
  successMessage: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    marginTop: 8,
  },
  successMessageText: {
    fontSize: 12,
    color: "#22C55E",
    fontWeight: "500",
  },
  infoBox: {
    backgroundColor: "#F0F5FF",
    borderLeftWidth: 4,
    borderLeftColor: "#0066CC",
    borderRadius: 8,
    padding: 12,
  },
  infoBoxTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0066CC",
    marginBottom: 4,
  },
  infoBoxText: {
    fontSize: 12,
    color: "#666666",
    lineHeight: 18,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F5FF",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 20,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: "#0066CC",
    fontWeight: "500",
  },
  errorBox: {
    flexDirection: "row",
    backgroundColor: "#FEF2F2",
    borderLeftWidth: 4,
    borderLeftColor: "#EF4444",
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    gap: 12,
  },
  errorBoxContent: {
    flex: 1,
  },
  errorBoxTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#EF4444",
    marginBottom: 2,
  },
  errorBoxText: {
    fontSize: 12,
    color: "#DC2626",
    lineHeight: 18,
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
  successButton: {
    flex: 1,
    backgroundColor: "#22C55E",
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  successButtonText: {
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
  footerInfo: {
    backgroundColor: "#FFFBEB",
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  footerInfoText: {
    fontSize: 12,
    color: "#92400E",
    lineHeight: 18,
  },
  spacer: {
    height: 20,
  },
});
