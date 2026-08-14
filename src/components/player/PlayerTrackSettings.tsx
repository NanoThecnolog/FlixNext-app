import React, { useMemo } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AudioTrack, SubtitleTrack } from "expo-video";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../../theme";
import { normalizeLanguage } from "../../utils/language";
import {
  subtitleTrackType,
  subtitleTrackTypeLabel,
} from "../../utils/playerTracks";

interface PlayerTrackSettingsProps {
  visible: boolean;
  audioTracks: AudioTrack[];
  subtitleTracks: SubtitleTrack[];
  selectedAudio: AudioTrack | null;
  selectedSubtitle: SubtitleTrack | null;
  playbackRate: number;
  fullscreen: boolean;
  onClose: () => void;
  onSelectAudio: (track: AudioTrack) => void;
  onSelectSubtitle: (track: SubtitleTrack | null) => void;
  onSelectPlaybackRate: (rate: number) => void;
}

const trackName = (track: AudioTrack | SubtitleTrack) => {
  const language = normalizeLanguage(track.language);
  const label = track.label?.trim();
  if (language === "Outro") return label || "Outro";
  if (!label || normalizeLanguage(label) === language) return language;
  return `${language} · ${label}`;
};

const subtitleName = (track: SubtitleTrack) =>
  `${trackName(track)} · ${subtitleTrackTypeLabel(subtitleTrackType(track))}`;

const playbackRates = [0.5, 0.75, 1, 1.25, 1.5, 2];

const TrackRow = ({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) => (
  <Pressable
    accessibilityRole="radio"
    accessibilityState={{ selected: active }}
    style={[settingsStyles.row, active && settingsStyles.activeRow]}
    onPress={onPress}
  >
    <Text style={[settingsStyles.rowText, active && settingsStyles.activeText]}>
      {label}
    </Text>
    {active ? <Ionicons name="checkmark" size={21} color={colors.red} /> : null}
  </Pressable>
);

export const PlayerTrackSettings = React.memo(function PlayerTrackSettings({
  visible,
  audioTracks,
  subtitleTracks,
  selectedAudio,
  selectedSubtitle,
  playbackRate,
  fullscreen,
  onClose,
  onSelectAudio,
  onSelectSubtitle,
  onSelectPlaybackRate,
}: PlayerTrackSettingsProps) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const sortedAudio = useMemo(
    () =>
      [...audioTracks].sort((first, second) => {
        const priority = (track: AudioTrack) => {
          const name = normalizeLanguage(track.language);
          if (name === "Português") return 0;
          if (name === "Inglês") return 1;
          return 2;
        };
        return priority(first) - priority(second);
      }),
    [audioTracks],
  );

  return (
    <Modal
      animationType="fade"
      statusBarTranslucent
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable style={settingsStyles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            settingsStyles.panel,
            fullscreen
              ? {
                  width: Math.min(760, width - 112),
                  maxHeight: Math.max(220, height - 96),
                  alignSelf: "flex-end",
                  marginRight: 64,
                  marginBottom: 70,
                  paddingBottom: 14,
                  borderRadius: 16,
                }
              : { paddingBottom: Math.max(insets.bottom, 18) },
          ]}
          onPress={(event) => event.stopPropagation()}
        >
          <View style={settingsStyles.handle} />
          <View style={settingsStyles.header}>
            <Text style={settingsStyles.heading}>Configurações do player</Text>
            <Pressable
              accessibilityLabel="Fechar configurações"
              style={settingsStyles.close}
              onPress={onClose}
            >
              <Ionicons name="close" size={24} color={colors.white} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={[
              settingsStyles.content,
              fullscreen && settingsStyles.fullscreenContent,
            ]}
            showsVerticalScrollIndicator={false}
          >
            <View
              style={[
                settingsStyles.section,
                fullscreen && settingsStyles.fullscreenSection,
              ]}
            >
              <View style={settingsStyles.sectionTitle}>
                <Ionicons name="speedometer-outline" size={19} color={colors.white} />
                <Text style={settingsStyles.sectionText}>Velocidade</Text>
              </View>
              <View style={settingsStyles.rateList}>
                {playbackRates.map((rate) => {
                  const active = playbackRate === rate;
                  return (
                    <Pressable
                      key={rate}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: active }}
                      style={[settingsStyles.rate, active && settingsStyles.activeRate]}
                      onPress={() => onSelectPlaybackRate(rate)}
                    >
                      <Text
                        style={[
                          settingsStyles.rateText,
                          active && settingsStyles.activeText,
                        ]}
                      >
                        {rate === 1 ? "Normal" : `${rate}x`}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View
              style={[
                settingsStyles.section,
                fullscreen && settingsStyles.fullscreenSection,
              ]}
            >
              <View style={settingsStyles.sectionTitle}>
                <Ionicons name="volume-high" size={19} color={colors.white} />
                <Text style={settingsStyles.sectionText}>Áudio</Text>
              </View>
              {sortedAudio.length ? (
                sortedAudio.map((track) => (
                  <TrackRow
                    key={track.id}
                    active={selectedAudio?.id === track.id}
                    label={trackName(track)}
                    onPress={() => onSelectAudio(track)}
                  />
                ))
              ) : (
                <Text style={settingsStyles.empty}>Faixa padrão do vídeo</Text>
              )}
            </View>

            <View
              style={[
                settingsStyles.section,
                fullscreen && settingsStyles.fullscreenSection,
              ]}
            >
              <View style={settingsStyles.sectionTitle}>
                <Ionicons name="text" size={19} color={colors.white} />
                <Text style={settingsStyles.sectionText}>Legendas</Text>
              </View>
              <TrackRow
                active={!selectedSubtitle}
                label="Desativadas"
                onPress={() => onSelectSubtitle(null)}
              />
              {subtitleTracks.map((track) => (
                <TrackRow
                  key={track.id}
                  active={selectedSubtitle?.id === track.id}
                  label={subtitleName(track)}
                  onPress={() => onSelectSubtitle(track)}
                />
              ))}
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
});

const settingsStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,.7)",
  },
  panel: {
    maxHeight: "82%",
    paddingTop: 8,
    paddingHorizontal: 18,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: "#181818",
  },
  handle: {
    width: 38,
    height: 4,
    alignSelf: "center",
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,.28)",
  },
  header: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heading: {
    color: colors.white,
    fontFamily: "Montserrat_700Bold",
    fontSize: 18,
  },
  close: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
  },
  content: { paddingBottom: 6, gap: 20 },
  fullscreenContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  fullscreenSection: { flex: 1, minWidth: 170 },
  rateList: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  rate: {
    minWidth: 70,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.12)",
    borderRadius: 8,
  },
  activeRate: {
    borderColor: "rgba(229,9,20,.65)",
    backgroundColor: "rgba(229,9,20,.1)",
  },
  rateText: {
    color: "rgba(255,255,255,.74)",
    fontFamily: "Montserrat_500Medium",
    fontSize: 12,
  },
  section: { gap: 3 },
  sectionTitle: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionText: {
    color: colors.white,
    fontFamily: "Montserrat_700Bold",
    fontSize: 14,
  },
  row: {
    minHeight: 47,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  activeRow: { backgroundColor: "rgba(229,9,20,.1)" },
  rowText: {
    color: "rgba(255,255,255,.74)",
    fontFamily: "Montserrat_500Medium",
    fontSize: 13,
  },
  activeText: { color: colors.white, fontFamily: "Montserrat_600SemiBold" },
  empty: {
    minHeight: 47,
    paddingHorizontal: 12,
    paddingVertical: 14,
    color: "rgba(255,255,255,.5)",
    fontFamily: "Montserrat_400Regular",
    fontSize: 13,
  },
});
