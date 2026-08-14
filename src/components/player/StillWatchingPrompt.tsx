import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../../theme";

interface StillWatchingPromptProps {
  visible: boolean;
  title: string;
  onContinue: () => void;
  onStop: () => void;
}

export function StillWatchingPrompt({
  visible,
  title,
  onContinue,
  onStop,
}: StillWatchingPromptProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onStop}
    >
      <View style={promptStyles.backdrop}>
        <View
          style={[
            promptStyles.sheet,
            { paddingBottom: Math.max(insets.bottom, 20) },
          ]}
        >
          <Pressable
            accessibilityLabel="Fechar e sair da reprodução"
            style={promptStyles.close}
            onPress={onStop}
          >
            <Ionicons name="close" size={22} color="rgba(255,255,255,.68)" />
          </Pressable>

          <View style={promptStyles.iconContainer}>
            <Ionicons name="pause" size={34} color="#ff0055" />
          </View>
          <Text style={promptStyles.eyebrow} numberOfLines={1}>
            REPRODUÇÃO DE {title.toLocaleUpperCase("pt-BR")} PAUSADA
          </Text>
          <Text style={promptStyles.title}>Tem alguém assistindo?</Text>

          <Pressable style={promptStyles.continueButton} onPress={onContinue}>
            <Ionicons name="play" size={19} color={colors.white} />
            <Text style={promptStyles.continueText}>Continuar assistindo</Text>
          </Pressable>
          <Pressable style={promptStyles.stopButton} onPress={onStop}>
            <Text style={promptStyles.stopText}>
              Não, é hora de ler um livro
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const promptStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,.84)",
  },
  sheet: {
    width: "100%",
    paddingTop: 26,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,.1)",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: "#111113",
  },
  close: {
    position: "absolute",
    zIndex: 2,
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.08)",
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,.06)",
  },
  iconContainer: {
    width: 64,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255,0,85,.22)",
    borderRadius: 18,
    backgroundColor: "rgba(255,0,85,.1)",
  },
  eyebrow: {
    maxWidth: "82%",
    color: "#ff477e",
    fontFamily: "Montserrat_700Bold",
    fontSize: 10,
    letterSpacing: 1.2,
  },
  title: {
    color: colors.white,
    fontFamily: "Montserrat_700Bold",
    fontSize: 27,
    lineHeight: 31,
    marginTop: 8,
    marginBottom: 28,
  },
  continueButton: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 13,
    backgroundColor: "#ef0050",
  },
  continueText: {
    color: colors.white,
    fontFamily: "Montserrat_700Bold",
    fontSize: 14,
  },
  stopButton: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.1)",
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,.05)",
  },
  stopText: {
    color: "rgba(255,255,255,.72)",
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 13,
  },
});
