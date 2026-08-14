import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  GestureResponderEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../../theme";

interface PlayerControlsProps {
  visible: boolean;
  loading: boolean;
  playing: boolean;
  showBigPlay: boolean;
  muted: boolean;
  fullscreen: boolean;
  title: string;
  subtitle?: string;
  currentTime: number;
  duration: number;
  bufferedTime: number;
  seekFeedback: -10 | 10 | null;
  hasPreviousEpisode: boolean;
  hasNextEpisode: boolean;
  hasTrackOptions: boolean;
  onBack: () => void;
  onTogglePlay: () => void;
  onToggleMute: () => void;
  onSeek: (seconds: number) => void;
  onPreviousEpisode: () => void;
  onNextEpisode: () => void;
  onOpenTrackSettings: () => void;
  onFullscreen: () => void;
  onSurfacePress: (x: number, width: number) => void;
  onInteraction: () => void;
}

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds < 0) return "00:00";
  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainingSeconds = total % 60;
  return hours
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(
        remainingSeconds,
      ).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(
        remainingSeconds,
      ).padStart(2, "0")}`;
};

export const PlayerControls = React.memo(function PlayerControls({
  visible,
  loading,
  playing,
  showBigPlay,
  muted,
  fullscreen,
  title,
  subtitle,
  currentTime,
  duration,
  bufferedTime,
  seekFeedback,
  hasPreviousEpisode,
  hasNextEpisode,
  hasTrackOptions,
  onBack,
  onTogglePlay,
  onToggleMute,
  onSeek,
  onPreviousEpisode,
  onNextEpisode,
  onOpenTrackSettings,
  onFullscreen,
  onSurfacePress,
  onInteraction,
}: PlayerControlsProps) {
  const insets = useSafeAreaInsets();
  const [surfaceWidth, setSurfaceWidth] = useState(1);
  const [timelineWidth, setTimelineWidth] = useState(1);
  const progress = duration > 0 ? clamp(currentTime / duration, 0, 1) : 0;
  const buffered = duration > 0 ? clamp(bufferedTime / duration, 0, 1) : 0;

  const seekFromEvent = useCallback(
    (event: GestureResponderEvent) => {
      if (!duration) return;
      const fraction = clamp(event.nativeEvent.locationX / timelineWidth, 0, 1);
      onInteraction();
      onSeek(fraction * duration);
    },
    [duration, onInteraction, onSeek, timelineWidth],
  );

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <Pressable
        style={StyleSheet.absoluteFill}
        onLayout={(event) => setSurfaceWidth(event.nativeEvent.layout.width)}
        onPress={(event) =>
          onSurfacePress(event.nativeEvent.locationX, surfaceWidth)
        }
      />

      {loading ? (
        <View pointerEvents="none" style={controlsStyles.loading}>
          <ActivityIndicator color={colors.white} size="large" />
        </View>
      ) : null}

      {seekFeedback ? (
        <View
          pointerEvents="none"
          style={[
            controlsStyles.feedback,
            seekFeedback < 0
              ? controlsStyles.feedbackLeft
              : controlsStyles.feedbackRight,
          ]}
        >
          <Ionicons
            name={seekFeedback < 0 ? "play-back" : "play-forward"}
            size={23}
            color={colors.white}
          />
          <Text style={controlsStyles.feedbackText}>
            {seekFeedback > 0 ? "+" : ""}
            {seekFeedback}s
          </Text>
        </View>
      ) : null}

      <View
        pointerEvents={visible ? "box-none" : "none"}
        style={[StyleSheet.absoluteFill, !visible && controlsStyles.hidden]}
      >
        <LinearGradient
          pointerEvents="none"
          colors={["rgba(0,0,0,.78)", "transparent"]}
          style={controlsStyles.topGradient}
        />
        <LinearGradient
          pointerEvents="none"
          colors={["transparent", "rgba(0,0,0,.88)"]}
          style={controlsStyles.bottomGradient}
        />

        <View
          style={[
            controlsStyles.header,
            { paddingTop: Math.max(insets.top, 12) },
          ]}
        >
          <Pressable
            accessibilityLabel="Voltar"
            style={controlsStyles.roundButton}
            onPress={() => {
              onInteraction();
              onBack();
            }}
          >
            <Ionicons name="chevron-back" size={28} color={colors.white} />
          </Pressable>
          <View style={controlsStyles.headingText}>
            <Text style={controlsStyles.title} numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={controlsStyles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>

        {!loading && showBigPlay ? (
          <Pressable
            accessibilityLabel={playing ? "Pausar" : "Reproduzir"}
            style={controlsStyles.bigPlay}
            onPress={() => {
              onInteraction();
              onTogglePlay();
            }}
          >
            <Ionicons
              name={playing ? "pause" : "play"}
              size={48}
              color={colors.white}
            />
          </Pressable>
        ) : null}

        <View
          style={[
            controlsStyles.bottom,
            { paddingBottom: Math.max(insets.bottom, 12) },
          ]}
        >
          <View
            style={controlsStyles.timelineTouchArea}
            onLayout={(event) =>
              setTimelineWidth(event.nativeEvent.layout.width)
            }
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderGrant={seekFromEvent}
            onResponderMove={seekFromEvent}
            onResponderRelease={seekFromEvent}
          >
            <View style={controlsStyles.timeline}>
              <View
                style={[
                  controlsStyles.buffer,
                  { width: `${buffered * 100}%` },
                ]}
              />
              <View
                style={[
                  controlsStyles.progress,
                  { width: `${progress * 100}%` },
                ]}
              />
              <View
                style={[
                  controlsStyles.thumb,
                  { left: `${progress * 100}%` },
                ]}
              />
            </View>
          </View>

          <View style={controlsStyles.actionRow}>
            <View style={controlsStyles.leftActions}>
              <Pressable
                accessibilityLabel={playing ? "Pausar" : "Reproduzir"}
                style={controlsStyles.controlButton}
                onPress={() => {
                  onInteraction();
                  onTogglePlay();
                }}
              >
                <Ionicons
                  name={playing ? "pause" : "play"}
                  size={23}
                  color={colors.white}
                />
              </Pressable>
              <Text style={controlsStyles.time}>
                {formatTime(currentTime)} / {formatTime(duration)}
              </Text>

              {hasPreviousEpisode || hasNextEpisode ? (
                <View style={controlsStyles.episodeNavigation}>
                  <Pressable
                    accessibilityLabel="Episódio anterior"
                    disabled={!hasPreviousEpisode}
                    style={[
                      controlsStyles.controlButton,
                      !hasPreviousEpisode && controlsStyles.disabled,
                    ]}
                    onPress={() => {
                      onInteraction();
                      onPreviousEpisode();
                    }}
                  >
                    <Ionicons
                      name="play-skip-back"
                      size={21}
                      color={colors.white}
                    />
                  </Pressable>
                  <Pressable
                    accessibilityLabel="Próximo episódio"
                    disabled={!hasNextEpisode}
                    style={[
                      controlsStyles.controlButton,
                      !hasNextEpisode && controlsStyles.disabled,
                    ]}
                    onPress={() => {
                      onInteraction();
                      onNextEpisode();
                    }}
                  >
                    <Ionicons
                      name="play-skip-forward"
                      size={21}
                      color={colors.white}
                    />
                  </Pressable>
                </View>
              ) : null}
            </View>

            <View style={controlsStyles.rightActions}>
              {hasTrackOptions ? (
                <Pressable
                  accessibilityLabel="Velocidade, áudio e legendas"
                  style={controlsStyles.controlButton}
                  onPress={() => {
                    onInteraction();
                    onOpenTrackSettings();
                  }}
                >
                  <Ionicons name="settings-outline" size={22} color={colors.white} />
                </Pressable>
              ) : null}
              <Pressable
                accessibilityLabel={muted ? "Ativar som" : "Silenciar"}
                style={controlsStyles.controlButton}
                onPress={() => {
                  onInteraction();
                  onToggleMute();
                }}
              >
                <Ionicons
                  name={muted ? "volume-mute" : "volume-high"}
                  size={23}
                  color={colors.white}
                />
              </Pressable>
              <Pressable
                accessibilityLabel={fullscreen ? "Sair da tela cheia" : "Tela cheia"}
                style={controlsStyles.controlButton}
                onPress={() => {
                  onInteraction();
                  onFullscreen();
                }}
              >
                <Ionicons
                  name={fullscreen ? "contract" : "expand"}
                  size={24}
                  color={colors.white}
                />
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
});

const controlsStyles = StyleSheet.create({
  hidden: { opacity: 0 },
  loading: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,.35)",
  },
  topGradient: {
    position: "absolute",
    top: 0,
    right: 0,
    left: 0,
    height: "28%",
  },
  bottomGradient: {
    position: "absolute",
    right: 0,
    bottom: 0,
    left: 0,
    height: "42%",
  },
  header: {
    position: "absolute",
    top: 0,
    right: 0,
    left: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  roundButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
  },
  headingText: { flex: 1, marginLeft: 8, marginRight: 12 },
  title: {
    color: colors.white,
    fontFamily: "Montserrat_700Bold",
    fontSize: 17,
  },
  subtitle: {
    color: "rgba(255,255,255,.68)",
    fontFamily: "Montserrat_400Regular",
    fontSize: 11,
    marginTop: 2,
  },
  bigPlay: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: 76,
    height: 76,
    marginTop: -38,
    marginLeft: -38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 38,
    backgroundColor: "rgba(0,0,0,.28)",
  },
  bottom: {
    position: "absolute",
    right: 0,
    bottom: 0,
    left: 0,
    paddingHorizontal: 12,
  },
  timelineTouchArea: {
    height: 28,
    justifyContent: "center",
  },
  timeline: {
    height: 7,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,.28)",
  },
  buffer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,.38)",
  },
  progress: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    borderRadius: 999,
    backgroundColor: "#e50914",
  },
  thumb: {
    position: "absolute",
    top: -5,
    width: 17,
    height: 17,
    marginLeft: -8.5,
    borderRadius: 9,
    backgroundColor: "#e50914",
  },
  actionRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  leftActions: {
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  rightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  controlButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
  },
  time: {
    color: colors.white,
    fontFamily: "Montserrat_400Regular",
    fontSize: 11,
    marginHorizontal: 4,
  },
  episodeNavigation: {
    flexDirection: "row",
    paddingLeft: 3,
    borderLeftWidth: 1,
    borderLeftColor: "rgba(255,255,255,.2)",
  },
  disabled: { opacity: 0.3 },
  feedback: {
    position: "absolute",
    zIndex: 20,
    top: "50%",
    width: 70,
    height: 70,
    marginTop: -35,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 35,
    backgroundColor: "rgba(0,0,0,.48)",
  },
  feedbackLeft: { left: "17%" },
  feedbackRight: { right: "17%" },
  feedbackText: {
    color: colors.white,
    fontFamily: "Montserrat_700Bold",
    fontSize: 12,
    marginTop: 2,
  },
});
