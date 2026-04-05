// MEI Formalization - Screen 1: Benefits
// Tela de apresentação dos benefícios do MEI com botão para iniciar

import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import { ArrowRight, Shield, TrendingUp, DollarSign, Users } from "lucide-react-native";

const { width } = Dimensions.get("window");

interface Screen1BenefitsProps {
  onStart: () => void;
}

const benefits = [
  {
    id: "1",
    icon: Shield,
    title: "Formalização Completa",
    description: "Regularize seu negócio de forma legal e segura",
  },
  {
    id: "2",
    icon: TrendingUp,
    title: "Aumento de Credibilidade",
    description: "Ganhe confiança de clientes e parceiros comerciais",
  },
  {
    id: "3",
    icon: DollarSign,
    title: "Benefícios Fiscais",
    description: "Reduza impostos e tenha melhor gestão financeira",
  },
  {
    id: "4",
    icon: Users,
    title: "Acesso a Crédito",
    description: "Financiamentos e linhas de crédito mais acessíveis",
  },
];

export function Screen1Benefits({ onStart }: Screen1BenefitsProps) {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Formalize seu Negócio</Text>
        <Text style={styles.subtitle}>
          Conheça os benefícios de ser um MEI (Microempreendedor Individual)
        </Text>
      </View>

      {/* Benefits Cards */}
      <View style={styles.benefitsContainer}>
        {benefits.map((benefit) => {
          const IconComponent = benefit.icon;
          return (
            <View key={benefit.id} style={styles.benefitCard}>
              <View style={styles.iconContainer}>
                <IconComponent width={32} height={32} color="#0066CC" />
              </View>
              <View style={styles.benefitContent}>
                <Text style={styles.benefitTitle}>{benefit.title}</Text>
                <Text style={styles.benefitDescription}>
                  {benefit.description}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* Highlight Box */}
      <View style={styles.highlightBox}>
        <Text style={styles.highlightText}>
          ✓ Registro 100% online no gov.br{"\n"}
          ✓ Processo rápido e simples{"\n"}
          ✓ Suporte da Fixr em cada passo
        </Text>
      </View>

      {/* CTA Button */}
      <TouchableOpacity
        style={styles.ctaButton}
        onPress={onStart}
        activeOpacity={0.8}
      >
        <Text style={styles.ctaButtonText}>Começar Registro MEI</Text>
        <ArrowRight width={20} height={20} color="#FFFFFF" />
      </TouchableOpacity>

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
    marginBottom: 32,
    marginTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0066CC",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666666",
    lineHeight: 24,
  },
  benefitsContainer: {
    marginBottom: 24,
    gap: 12,
  },
  benefitCard: {
    flexDirection: "row",
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    padding: 16,
    alignItems: "flex-start",
    marginBottom: 8,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#E6F0FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 4,
  },
  benefitDescription: {
    fontSize: 14,
    color: "#666666",
    lineHeight: 20,
  },
  highlightBox: {
    backgroundColor: "#E6F0FF",
    borderLeftWidth: 4,
    borderLeftColor: "#0066CC",
    borderRadius: 8,
    padding: 16,
    marginBottom: 32,
  },
  highlightText: {
    fontSize: 14,
    color: "#0066CC",
    lineHeight: 22,
    fontWeight: "500",
  },
  ctaButton: {
    backgroundColor: "#0066CC",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  spacer: {
    height: 20,
  },
});
