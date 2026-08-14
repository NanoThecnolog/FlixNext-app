import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../contexts/AuthContext";
import { DeviceVerificationRequired } from "../domain/user";
import { authService } from "../services/AuthService";
import { apiErrorMessage } from "../utils/apiError";
import { colors, styles } from "../theme";

export default function LoginScreen() {
  const { signIn, refreshUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verification, setVerification] =
    useState<DeviceVerificationRequired | null>(null);
  const [code, setCode] = useState("");
  const [resendIn, setResendIn] = useState(0);
  async function handleSubmit() {
    if (!email.trim() || !password) {
      setError("Informe seu e-mail e sua senha.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await signIn(email.trim(), password);
      if ("verificationRequired" in result) {
        setVerification(result);
        setResendIn(result.resendAfterSeconds);
      }
    } catch (reason: unknown) {
      setError(
        apiErrorMessage(
          reason,
          "Não foi possível entrar. Verifique seus dados.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setInterval(
      () => setResendIn((value) => Math.max(value - 1, 0)),
      1000,
    );
    return () => clearInterval(timer);
  }, [resendIn]);
  async function verify() {
    if (!verification || !/^\d{6}$/.test(code)) {
      setError("Digite o código de seis dígitos recebido por e-mail.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await authService.verifyDevice(verification.challengeId, code);
      await refreshUser();
    } catch (reason: unknown) {
      setError(apiErrorMessage(reason, "Código inválido ou expirado."));
    } finally {
      setLoading(false);
    }
  }
  async function resend() {
    if (!verification || resendIn > 0) return;
    try {
      const result = await authService.resendDevice(verification.challengeId);
      setResendIn(result.resendAfterSeconds);
      setError("");
    } catch (reason: unknown) {
      setError(apiErrorMessage(reason, "Não foi possível reenviar o código."));
    }
  }
  if (verification)
    return (
      <SafeAreaView style={styles.screen}>
        <KeyboardAvoidingView
          style={{ flex: 1, justifyContent: "center" }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={{ padding: 28 }}>
            <Text
              style={{ color: colors.white, fontSize: 36, fontWeight: "900" }}
            >
              flix<Text style={{ color: colors.red }}>next</Text>
            </Text>
            <Text style={styles.eyebrow}>NOVO DISPOSITIVO</Text>
            <Text
              style={{
                color: colors.white,
                fontSize: 28,
                fontWeight: "700",
                marginTop: 12,
              }}
            >
              Confirme seu dispositivo
            </Text>
            <Text
              style={{
                color: colors.muted,
                lineHeight: 21,
                marginVertical: 18,
              }}
            >
              Enviamos um código de seis dígitos para {verification.maskedEmail}
              .
            </Text>
            <View style={inputBox}>
              <Ionicons
                name="shield-checkmark-outline"
                size={19}
                color={colors.muted}
              />
              <TextInput
                value={code}
                onChangeText={(value) =>
                  setCode(value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="000000"
                placeholderTextColor={colors.muted}
                keyboardType="number-pad"
                maxLength={6}
                style={[input, { letterSpacing: 5 }]}
              />
            </View>
            {error ? (
              <Text style={{ color: "#ff6b6b", marginTop: 14 }}>{error}</Text>
            ) : null}
            <Pressable
              style={[
                styles.button,
                {
                  justifyContent: "center",
                  minHeight: 48,
                  backgroundColor: colors.red,
                  marginTop: 18,
                },
              ]}
              onPress={verify}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={{ color: colors.white, fontWeight: "700" }}>
                  Confirmar código
                </Text>
              )}
            </Pressable>
            <Pressable
              style={{ alignItems: "center", padding: 18 }}
              onPress={resend}
              disabled={resendIn > 0}
            >
              <Text
                style={{ color: resendIn > 0 ? colors.muted : colors.white }}
              >
                {resendIn > 0
                  ? `Reenviar código em ${resendIn}s`
                  : "Reenviar código"}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        style={{ flex: 1, justifyContent: "center" }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={{ padding: 28 }}>
          <Text
            style={{ color: colors.white, fontSize: 36, fontWeight: "900" }}
          >
            flix<Text style={{ color: colors.red }}>next</Text>
          </Text>
          <Text style={styles.eyebrow}>BEM-VINDO DE VOLTA</Text>
          <Text
            style={{
              color: colors.white,
              fontSize: 28,
              fontWeight: "700",
              marginTop: 12,
              marginBottom: 28,
            }}
          >
            Entrar na sua conta
          </Text>
          <Text style={label}>E-mail</Text>
          <View style={inputBox}>
            <Ionicons name="mail-outline" size={19} color={colors.muted} />
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="seu@email.com"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              keyboardType="email-address"
              style={input}
            />
          </View>
          <Text style={label}>Senha</Text>
          <View style={inputBox}>
            <Ionicons
              name="lock-closed-outline"
              size={19}
              color={colors.muted}
            />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Sua senha"
              placeholderTextColor={colors.muted}
              secureTextEntry
              style={input}
            />
          </View>
          {error ? (
            <Text style={{ color: "#ff6b6b", marginBottom: 16 }}>{error}</Text>
          ) : null}
          <Pressable
            style={[
              styles.button,
              {
                justifyContent: "center",
                minHeight: 48,
                backgroundColor: colors.red,
              },
            ]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={{ color: colors.white, fontWeight: "700" }}>
                Entrar
              </Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const label = {
  color: colors.white,
  fontSize: 13,
  fontWeight: "700" as const,
  marginBottom: 7,
  marginTop: 14,
};
const inputBox = {
  height: 50,
  borderWidth: 1,
  borderColor: "#4b4b4b",
  backgroundColor: colors.surface,
  borderRadius: 5,
  paddingHorizontal: 14,
  flexDirection: "row" as const,
  alignItems: "center" as const,
  gap: 10,
};
const input = { flex: 1, color: colors.white, fontSize: 16 };
