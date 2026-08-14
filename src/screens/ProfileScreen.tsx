import React, { useState } from "react";
import {
  Image,
  Linking,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../contexts/AuthContext";
import { colors, styles } from "../theme";

const blue = "#4f7df3";
const card = {
  backgroundColor: "#171717",
  borderWidth: 1,
  borderColor: "rgba(255,255,255,.07)",
  borderRadius: 18,
  padding: 20,
  marginBottom: 16,
};
const row = {
  flexDirection: "row" as const,
  alignItems: "center" as const,
  gap: 12,
};
const avatarSource = (value?: string) => value?.replace("/svg?", "/png?");

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [avatarError, setAvatarError] = useState(false);
  const initial = user?.name?.charAt(0).toUpperCase() || "N";
  const avatar = avatarSource(user?.avatar);
  const subscription = user?.subscription;
  const planName =
    subscription?.plan?.name ||
    subscription?.planName ||
    (subscription?.planId
      ? `Plano ${subscription.planId}`
      : "Nenhum plano ativo");
  const openAccount = () => Linking.openURL("https://flixnext.com.br/me");
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 30 }}>
        <View style={[card, { paddingTop: 0, overflow: "visible" }]}>
          <View
            style={{
              height: 92,
              marginHorizontal: -20,
              backgroundColor: "#263c78",
            }}
          />
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-end",
              gap: 15,
              marginTop: -45,
            }}
          >
            <View
              style={{
                width: 112,
                height: 112,
                borderRadius: 56,
                backgroundColor: "#202020",
                borderWidth: 5,
                borderColor: "#171717",
                overflow: "visible",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              {avatar && !avatarError ? (
                <Image
                  source={{ uri: avatar }}
                  onError={() => setAvatarError(true)}
                  style={{ width: "100%", height: "100%", borderRadius: 56 }}
                />
              ) : (
                <Text
                  style={{ color: "#aaa", fontSize: 42, fontWeight: "700" }}
                >
                  {initial}
                </Text>
              )}
              <View
                style={{
                  position: "absolute",
                  right: -4,
                  bottom: 0,
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  backgroundColor: blue,
                  borderWidth: 3,
                  borderColor: "#171717",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Ionicons name="pencil" size={14} color={colors.white} />
              </View>
            </View>
            <View style={{ flex: 1, paddingBottom: 5 }}>
              <Text
                style={{ color: "#8da8fa", fontSize: 11, fontWeight: "700" }}
              >
                MINHA CONTA
              </Text>
              <Text
                style={{
                  color: colors.white,
                  fontSize: 21,
                  fontWeight: "700",
                  marginTop: 3,
                }}
                numberOfLines={1}
              >
                {user?.name || "Usuário"}
              </Text>
              <Text
                style={{ color: "rgba(255,255,255,.5)", fontSize: 13 }}
                numberOfLines={1}
              >
                {user?.email}
              </Text>
            </View>
          </View>
          <View
            style={{
              alignSelf: "flex-start",
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              backgroundColor: "rgba(32,181,104,.11)",
              borderRadius: 99,
              paddingHorizontal: 11,
              paddingVertical: 7,
              marginTop: 15,
            }}
          >
            <Ionicons name="shield-checkmark" size={16} color="#79e6ad" />
            <Text style={{ color: "#79e6ad", fontSize: 12, fontWeight: "700" }}>
              Conta ativa
            </Text>
          </View>
          <View style={{ gap: 10, marginTop: 20 }}>
            <Pressable
              onPress={openAccount}
              style={[
                action,
                {
                  backgroundColor: "rgba(79,125,243,.13)",
                  borderColor: "rgba(79,125,243,.24)",
                },
              ]}
            >
              <Ionicons name="create-outline" size={20} color="#9db5ff" />
              <View style={{ flex: 1 }}>
                <Text style={actionTitle}>Editar dados</Text>
                <Text style={actionSub}>Atualize suas informações no site</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </Pressable>
            <Pressable
              onPress={signOut}
              style={[
                action,
                {
                  backgroundColor: "rgba(217,65,65,.08)",
                  borderColor: "rgba(217,65,65,.16)",
                },
              ]}
            >
              <Ionicons name="log-out-outline" size={20} color="#f07979" />
              <View style={{ flex: 1 }}>
                <Text style={actionTitle}>Sair da conta</Text>
                <Text style={actionSub}>Encerrar sessão</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </Pressable>
          </View>
        </View>
        <View style={card}>
          <SectionTitle
            label="INFORMAÇÕES"
            title="Dados pessoais"
            icon="person-outline"
          />
          <InfoItem
            icon="person-outline"
            label="Nome"
            value={user?.name || "Não informado"}
          />
          <InfoItem
            icon="mail-outline"
            label="E-mail"
            value={user?.email || "Não informado"}
          />
        </View>
        <View style={card}>
          <SectionTitle
            label="ASSINATURA"
            title="Plano atual"
            icon="shield-checkmark-outline"
          />
          <View style={row}>
            <View style={iconBox}>
              <Ionicons name="card-outline" size={20} color={colors.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={actionTitle}>{planName}</Text>
              <Text style={actionSub}>Gerencie sua assinatura pelo site.</Text>
            </View>
            <Pressable onPress={openAccount}>
              <Ionicons name="open-outline" size={18} color={colors.muted} />
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
function SectionTitle({
  label,
  title,
  icon,
}: {
  label: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 18,
      }}
    >
      <View>
        <Text
          style={{
            color: "rgba(255,255,255,.4)",
            fontSize: 11,
            fontWeight: "700",
          }}
        >
          {label}
        </Text>
        <Text
          style={{
            color: colors.white,
            fontSize: 19,
            fontWeight: "600",
            marginTop: 3,
          }}
        >
          {title}
        </Text>
      </View>
      <Ionicons name={icon} size={22} color="#87a4fa" />
    </View>
  );
}
function InfoItem({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={[row, { marginBottom: 15 }]}>
      <View style={iconBox}>
        <Ionicons name={icon} size={19} color={colors.white} />
      </View>
      <View>
        <Text style={{ color: "rgba(255,255,255,.5)", fontSize: 13 }}>
          {label}
        </Text>
        <Text
          style={{
            color: colors.white,
            fontSize: 15,
            fontWeight: "600",
            marginTop: 3,
          }}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}
const iconBox = {
  width: 38,
  height: 38,
  borderRadius: 10,
  backgroundColor: "rgba(79,125,243,.13)",
  alignItems: "center" as const,
  justifyContent: "center" as const,
};
const action = {
  flexDirection: "row" as const,
  alignItems: "center" as const,
  gap: 12,
  borderWidth: 1,
  borderRadius: 13,
  padding: 14,
};
const actionTitle = {
  color: colors.white,
  fontSize: 14,
  fontWeight: "700" as const,
};
const actionSub = { color: "rgba(255,255,255,.5)", fontSize: 12, marginTop: 3 };
