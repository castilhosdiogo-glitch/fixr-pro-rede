// MEI Formalization - Screen 3: Tutorial
// Tela tutorial estático com 6 etapas explicando como abrir MEI no gov.br

import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Platform,
} from "react-native";
import {
  ArrowRight,
  ArrowLeft,
  ExternalLink,
  CheckCircle2,
} from "lucide-react-native";

interface Screen3TutorialProps {
  onNext: () => void;
  onPrev: () => void;
}

const steps = [
  {
    id: "1",
    title: "Acesse o Portal MEI",
    description:
      "Abra o site oficial da Secretaria da Receita Federal (gov.br) onde fica o portal para registro de MEI.",
  },
  {
    id: "2",
    title: "Clique em 'Já tenho CPF'",
    description:
      "Na página inicial, selecione a opção para quem já possui CPF registrado.",
  },
  {
    id: "3",
    title: "Informe seus dados",
    description:
      "Digite seu CPF, data de nascimento e clique em 'Próximo'. Siga as instruções de verificação.",
  },
  {
    id: "4",
    title: "Preencha atividade",
    description:
      "Selecione a atividade que você deseja exercer como MEI. Você pode adicionar até 15 atividades.",
  },
  {
    id: "5",
    title: "Informe endereço",
    description:
      "Adicione o endereço onde funcionará seu negócio. Você pode usar o mesmo de sua residência.",
  },
  {
    id: "6",
    title: "Receba o CNPJ",
    description:
      "Após confirmação, você receberá o CNPJ gerado. Copie este número para a próxima etapa.",
  },
];

export function Screen3Tutorial({ onNext, onPrev }: Screen3TutorialProps) {
  const handleOpenGovBr = async () => {
    const govBrUrl =
      "https://www.gov.br/empresas-e-negocios/pt-br/empreendedor";

    try {
      const canOpen = await Linking.canOpenURL(govBrUrl);
      if (canOpen) {
        await Linking.openURL(govBrUrl);
      } else {
        alert("Não foi possível abrir o link. Copie a URL manualmente.");
      }
    } catch (error) {
      console.error("Erro ao abrir link:", error);
      alert("Erro ao abrir o link gov.br");
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Como Registrar no gov.br</Text>
        <Text style={styles.subtitle}>
          Siga este passo a passo para abrir seu MEI (Etapa 3 de 4)
        </Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { width: "75%" }]} />
      </View>

      {/* Steps */}
      <View style={styles.stepsContainer}>
        {steps.map((step, index) => (
          <View key={step.id} style={styles.stepWrapper}>
            <View style={styles.stepNumberContainer}>
              <Text style={styles.stepNumber}>{step.id}</Text>
            </View>

            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.stepDescription}>{step.description}</Text>
            </View>

            {index < steps.length - 1 && <View style={styles.stepConnector} />}
          </View>
        ))}
      </View>

      {/* Gov.br CTA */}
      <View style={styles.govBrSection}>
        <View style={styles.infoBox}>
          <Text style={styles.infoBoxTitle}>Abra o Portal MEI Oficial</Text>
          <Text style={styles.infoBoxText}>
            Clique no botão abaixo para ir diretamente ao portal de registro do
            MEI no gov.br
          </Text>
        </View>

        <TouchableOpacity
          style={styles.govBrButton}
          onPress={handleOpenGovBr}
          activeOpacity={0.8}
        >
          <ExternalLink width={20} height={20} color="#FFFFFF" />
          <Text style={styles.govBrButtonText}>Abrir gov.br</Text>
        </TouchableOpacity>
      </View>

      {/* Tips */}
      <View style={styles.tipsSection}>
        <Text style={styles.tipsTitle}>💡 Dicas Úteis</Text>
        <Text style={styles.tipsText}>
          • Tenha seu CPF e data de nascimento em mãos{"\n"}
          • O processo leva cerca de 15-30 minutos{"\n"}
          • Você receberá o CNPJ imediatamente após conclusão{"\n"}
          • Guarde o CNPJ para a próxima etapa
        </Text>
      </View>

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
          style={styles.primaryButton}
          onPress={onNext}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>Próximo: CNPJ</Text>
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
  stepsContainer: {
    marginBottom: 32,
  },
  stepWrapper: {
    flexDirection: "row",
    marginBottom: 24,
  },
  stepNumberContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#0066CC",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    marginTop: 4,
  },
  stepNumber: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    color: "#666666",
    lineHeight: 20,
  },
  stepConnector: {
    position: "absolute",
    left: 19,
    top: 40,
    width: 2,
    height: 80,
    backgroundColor: "#E5E5E5",
  },
  govBrSection: {
    backgroundColor: "#F0F5FF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: "#0066CC",
  },
  infoBox: {
    marginBottom: 16,
  },
  infoBoxTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0066CC",
    marginBottom: 4,
  },
  infoBoxText: {
    fontSize: 14,
    color: "#666666",
    lineHeight: 20,
  },
  govBrButton: {
    backgroundColor: "#0066CC",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  govBrButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  tipsSection: {
    backgroundColor: "#FFFBEB",
    borderLeftWidth: 4,
    borderLeftColor: "#FBBF24",
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#92400E",
    marginBottom: 8,
  },
  tipsText: {
    fontSize: 13,
    color: "#78350F",
    lineHeight: 20,
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
