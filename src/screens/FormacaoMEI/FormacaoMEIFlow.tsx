// MEI Formalization Flow Navigator
// Main component that manages the 4-screen MEI registration flow

import React, { useEffect } from "react";
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Text,
  SafeAreaView,
} from "react-native";
import { X } from "lucide-react-native";
import { useFormacaoMEI } from "@/hooks/useFormacaoMEI";
import { Screen1Benefits } from "./Screen1_Benefits";
import { Screen2PersonalData } from "./Screen2_PersonalData";
import { Screen3Tutorial } from "./Screen3_Tutorial";
import { Screen4CNPJValidation } from "./Screen4_CNPJValidation";

interface FormacaoMEIFlowProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function FormacaoMEIFlow({
  visible,
  onClose,
  onSuccess,
}: FormacaoMEIFlowProps) {
  const {
    state,
    currentStep,
    personalData,
    cnpj,
    isLoading,
    error,
    success,
    validationErrors,
    nextStep,
    prevStep,
    updatePersonalData,
    updateAndFormatField,
    updateCNPJ,
    validateAndSaveMEI,
    checkExistingMEI,
    resetFlow,
  } = useFormacaoMEI();

  // Check if user already has MEI registered
  useEffect(() => {
    if (visible) {
      checkExistingMEI().then((hasCompleted) => {
        if (hasCompleted) {
          // User already registered, show success
          onSuccess?.();
        }
      });
    }
  }, [visible]);

  // Handle success - close modal after delay
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        resetFlow();
        onClose();
        onSuccess?.();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const handleClose = () => {
    resetFlow();
    onClose();
  };

  const handleNextStep = () => {
    if (currentStep === 4) {
      // Last step - validate and save
      validateAndSaveMEI();
    } else {
      nextStep();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Header with close button */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Registro MEI</Text>
          <TouchableOpacity onPress={handleClose} activeOpacity={0.7}>
            <X width={24} height={24} color="#666666" />
          </TouchableOpacity>
        </View>

        {/* Screen content */}
        <View style={styles.content}>
          {currentStep === 1 && (
            <Screen1Benefits onStart={() => nextStep()} />
          )}

          {currentStep === 2 && (
            <Screen2PersonalData
              state={state}
              onUpdateField={updatePersonalData}
              onUpdateAndFormat={updateAndFormatField}
              onNext={handleNextStep}
              onPrev={prevStep}
            />
          )}

          {currentStep === 3 && (
            <Screen3Tutorial onNext={handleNextStep} onPrev={prevStep} />
          )}

          {currentStep === 4 && (
            <Screen4CNPJValidation
              state={{
                cnpj: state.cnpj,
                isLoading: state.isLoading,
                error: state.error,
                success: state.success,
                validationErrors: state.validationErrors,
              }}
              onUpdateCNPJ={updateCNPJ}
              onValidateAndSave={validateAndSaveMEI}
              onPrev={prevStep}
            />
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000000",
  },
  content: {
    flex: 1,
  },
});
