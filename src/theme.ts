import { StyleSheet } from "react-native";

export const colors = {
  background: "#141414",
  surface: "#242424",
  surfaceLight: "#343434",
  red: "#d42c2c",
  redSelected: "#aa2323",
  white: "#e6e6e6",
  muted: "#a0a0a0",
};
export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 18, paddingBottom: 32 },
  title: {
    color: colors.white,
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 13,
  },
  eyebrow: {
    color: "#f05a5a",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  button: {
    backgroundColor: colors.white,
    borderRadius: 5,
    paddingHorizontal: 16,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  buttonText: { color: colors.background, fontWeight: "700" },
});
