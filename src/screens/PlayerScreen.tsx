import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, BackHandler, Pressable, StyleSheet, Text, View } from "react-native";
import { useEventListener } from "expo";
import {
  AudioTrack,
  SubtitleTrack,
  VideoSource,
  VideoView,
  useVideoPlayer,
} from "expo-video";
import * as NavigationBar from "expo-navigation-bar";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { PlayerControls } from "../components/player/PlayerControls";
import { PlayerTrackSettings } from "../components/player/PlayerTrackSettings";
import { StillWatchingPrompt } from "../components/player/StillWatchingPrompt";
import { useCatalog } from "../contexts/CatalogContext";
import { PlaybackSource } from "../domain/content";
import { RootStackParamList } from "../navigation/types";
import { progressService } from "../services/ProgressService";
import { playbackTrackingService } from "../services/PlaybackTrackingService";
import { navigationProgressService } from "../services/NavigationProgressService";
import {
  PlayerPreferences,
  playerPreferencesStorage,
} from "../storage/playerPreferencesStorage";
import { colors } from "../theme";
import { titleFor } from "../utils/contentSelectors";
import { languageKey, normalizeLanguage } from "../utils/language";
import { subtitleTrackType } from "../utils/playerTracks";

type Props = NativeStackScreenProps<RootStackParamList, "Player">;

interface PlaybackViewState {
  playing: boolean;
  buffering: boolean;
  currentTime: number;
  duration: number;
  bufferedTime: number;
}

interface PlaybackSnapshot {
  currentTime: number;
  duration: number;
}

const emptyPlaybackState: PlaybackViewState = {
  playing: false,
  buffering: true,
  currentTime: 0,
  duration: 0,
  bufferedTime: 0,
};

const sourceKeyFor = (source: PlaybackSource) =>
  `${source.kind}:${source.tmdbId}:${source.season ?? 0}:${source.episode ?? 0}:${source.uri}`;

const sourceForPlayer = (source: PlaybackSource): VideoSource => ({
  uri: source.uri,
  contentType: /\.m3u8(?:$|\?)/i.test(source.uri) ? "hls" : "auto",
  metadata: { title: source.title, artist: source.subtitle },
});

const mergeTracksById = <T extends { id: string }>(current: T[], incoming: T[]) => {
  if (!incoming.length) return current;
  const tracks = new Map(current.map((track) => [track.id, track]));
  incoming.forEach((track) => tracks.set(track.id, track));
  return [...tracks.values()];
};

const preferenceFor = (track: AudioTrack | SubtitleTrack) => ({
  language: track.language || null,
  label: track.label || null,
});

const subtitlePreferenceFor = (track: SubtitleTrack) => ({
  ...preferenceFor(track),
  type: subtitleTrackType(track),
});

const findPreferredTrack = <T extends AudioTrack | SubtitleTrack>(
  tracks: T[],
  preference: PlayerPreferences["audio"],
) => {
  if (!preference) return null;
  const preferredLanguage = languageKey(preference.language);
  const preferredLabel = languageKey(preference.label);
  const normalizedLanguage = normalizeLanguage(preference.language);
  const matchesType = (track: T) =>
    !preference.type ||
    subtitleTrackType(track as SubtitleTrack) === preference.type;
  return (
    tracks.find(
      (track) =>
        preferredLanguage &&
        languageKey(track.language) === preferredLanguage &&
        matchesType(track),
    ) ??
    tracks.find(
      (track) =>
        normalizedLanguage !== "Outro" &&
        normalizeLanguage(track.language) === normalizedLanguage &&
        matchesType(track),
    ) ??
    tracks.find(
      (track) =>
        preferredLabel &&
        languageKey(track.label) === preferredLabel &&
        matchesType(track),
    ) ??
    null
  );
};

export default function PlayerScreen({ route, navigation }: Props) {
  const { catalog } = useCatalog();
  const [source, setSource] = useState(route.params.source);
  const [autoPlayOnLoad, setAutoPlayOnLoad] = useState(false);
  const [playback, setPlayback] = useState(emptyPlaybackState);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [bigPlayVisible, setBigPlayVisible] = useState(true);
  const [videoReady, setVideoReady] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [resumePosition, setResumePosition] = useState<number | null>(null);
  const [seekFeedback, setSeekFeedback] = useState<-10 | 10 | null>(null);
  const [showStillWatching, setShowStillWatching] = useState(false);
  const [trackSettingsVisible, setTrackSettingsVisible] = useState(false);
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([]);
  const [subtitleTracks, setSubtitleTracks] = useState<SubtitleTrack[]>([]);
  const [selectedAudio, setSelectedAudio] = useState<AudioTrack | null>(null);
  const [selectedSubtitle, setSelectedSubtitle] =
    useState<SubtitleTrack | null>(null);
  const sourceKey = sourceKeyFor(source);
  const videoSource = useMemo(() => sourceForPlayer(source), [source]);

  // A fonte permanece fora do hook para que a instância nativa não seja
  // destruída e recriada entre episódios. As trocas usam replaceAsync abaixo.
  const player = useVideoPlayer(null, (instance) => {
    instance.loop = false;
    instance.timeUpdateEventInterval = 0.5;
    instance.audioMixingMode = "doNotMix";
  });

  const sourceRef = useRef(source);
  const sourceKeyRef = useRef(sourceKey);
  const handledRouteSourceKeyRef = useRef(
    sourceKeyFor(route.params.source),
  );
  const playbackSnapshotRef = useRef<PlaybackSnapshot>({ currentTime: 0, duration: 0 });
  const preferencesRef = useRef<PlayerPreferences | null>(null);
  const preferencesLoadedRef = useRef(false);
  const tracksAppliedForSourceRef = useRef<string | null>(null);
  const sourceLoadedKeyRef = useRef<string | null>(null);
  const playbackStartedKeyRef = useRef<string | null>(null);
  const audioTracksRef = useRef<AudioTrack[]>([]);
  const subtitleTracksRef = useRef<SubtitleTrack[]>([]);
  const startAtBeginningKeyRef = useRef<string | null>(null);
  const lastSavedAtRef = useRef(0);
  const endedSourceRef = useRef<string | null>(null);
  const resumeAppliedRef = useRef<string | null>(null);
  const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const singleTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bigPlayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTap = useRef<{ at: number; zone: "left" | "center" | "right" } | null>(null);
  const watchedEpisodes = useRef(0);
  const accumulatedPlaybackMs = useRef(0);
  const playbackSample = useRef<{ sourceKey: string; position: number } | null>(null);
  const pendingNextSource = useRef<PlaybackSource | null>(null);

  useEffect(() => {
    sourceRef.current = source;
    sourceKeyRef.current = sourceKey;
    void playbackTrackingService.track(source);
    if (__DEV__ && source.kind === "series") {
      console.log(
        `[FlixNext:Playback] Fonte selecionada | série=${source.tmdbId} | temporada=${source.season} | episódio=${source.episode}`,
      );
    }
  }, [source, sourceKey]);

  useEffect(() => {
    const routeSource = route.params.source;
    const routeSourceKey = sourceKeyFor(routeSource);
    if (handledRouteSourceKeyRef.current === routeSourceKey) return;
    handledRouteSourceKeyRef.current = routeSourceKey;
    setAutoPlayOnLoad(false);
    setSource(routeSource);
  }, [route.params.source]);

  const series = useMemo(
    () =>
      source.kind === "series"
        ? catalog.series.find((item) => item.id === source.tmdbId) ?? null
        : null,
    [catalog.series, source.kind, source.tmdbId],
  );

  const episodePlaylist = useMemo<PlaybackSource[]>(() => {
    if (!series) return [];
    return [...series.mongo.season]
      .sort((first, second) => first.s - second.s)
      .flatMap((season) =>
        [...season.episodes]
          .sort((first, second) => first.ep - second.ep)
          .filter((episode) => Boolean(episode.src))
          .map((episode) => ({
            kind: "series" as const,
            tmdbId: series.id,
            title: titleFor(series),
            subtitle: `Temporada ${season.s} · Episódio ${episode.ep}`,
            uri: episode.src,
            duration: episode.duration,
            season: season.s,
            episode: episode.ep,
          })),
      );
  }, [series]);

  const currentEpisodeIndex = useMemo(
    () =>
      episodePlaylist.findIndex(
        (episode) =>
          episode.season === source.season && episode.episode === source.episode,
      ),
    [episodePlaylist, source.episode, source.season],
  );
  const previousEpisode =
    currentEpisodeIndex > 0 ? episodePlaylist[currentEpisodeIndex - 1] : null;
  const nextEpisode =
    currentEpisodeIndex >= 0 && currentEpisodeIndex < episodePlaylist.length - 1
      ? episodePlaylist[currentEpisodeIndex + 1]
      : null;

  const saveProgress = useCallback(
    async (playbackSource: PlaybackSource, snapshot: PlaybackSnapshot, forceCompleted?: boolean) => {
      if (!snapshot.duration) return;
      const threshold = playbackSource.kind === "series" ? 0.95 : 0.9;
      const completed =
        forceCompleted ?? snapshot.currentTime / snapshot.duration >= threshold;
      await progressService.save({
        tmdbID: playbackSource.tmdbId,
        mediaType: playbackSource.kind === "movie" ? "movie" : "tv",
        season: playbackSource.season,
        episode: playbackSource.episode,
        progress: Math.floor(completed ? snapshot.duration : snapshot.currentTime),
        completed,
      });
    },
    [],
  );

  const saveCurrentProgress = useCallback(
    () => saveProgress(sourceRef.current, playbackSnapshotRef.current).catch(() => undefined),
    [saveProgress],
  );

  const resetPresenceTracking = useCallback(() => {
    watchedEpisodes.current = 0;
    accumulatedPlaybackMs.current = 0;
    playbackSample.current = null;
  }, []);

  const revealControls = useCallback(() => {
    setControlsVisible(true);
    setBigPlayVisible(true);
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    if (bigPlayTimer.current) clearTimeout(bigPlayTimer.current);
    if (playback.playing && !trackSettingsVisible) {
      bigPlayTimer.current = setTimeout(() => setBigPlayVisible(false), 1_500);
      hideControlsTimer.current = setTimeout(() => setControlsVisible(false), 2_500);
    }
  }, [playback.playing, trackSettingsVisible]);

  const registerInteraction = useCallback(() => {
    resetPresenceTracking();
    revealControls();
  }, [resetPresenceTracking, revealControls]);

  const changeSource = useCallback(
    (nextSource: PlaybackSource, autoPlay: boolean, saveCurrent = true) => {
      if (saveCurrent) void saveCurrentProgress();
      const nextSourceKey = sourceKeyFor(nextSource);
      handledRouteSourceKeyRef.current = nextSourceKey;
      startAtBeginningKeyRef.current = nextSourceKey;
      setAutoPlayOnLoad(autoPlay);
      setSource(nextSource);
      navigation.setParams({ source: nextSource });
    },
    [navigation, saveCurrentProgress],
  );

  const handlePlaybackEnded = useCallback(async () => {
    const endedKey = sourceKeyRef.current;
    const snapshot = playbackSnapshotRef.current;
    const reachedEnd =
      snapshot.duration > 0 &&
      snapshot.currentTime >= Math.max(snapshot.duration * 0.97, snapshot.duration - 3);
    if (playbackStartedKeyRef.current !== endedKey || !reachedEnd) {
      if (__DEV__) {
        console.warn(
          `[FlixNext:Playback] playToEnd ignorado | fonte=${endedKey} | posição=${Math.round(snapshot.currentTime)} | duração=${Math.round(snapshot.duration)}`,
        );
      }
      return;
    }
    if (endedSourceRef.current === endedKey) return;
    endedSourceRef.current = endedKey;
    const endedSource = sourceRef.current;
    await saveProgress(endedSource, playbackSnapshotRef.current, true).catch(() => undefined);

    const endedIndex = episodePlaylist.findIndex(
      (episode) =>
        episode.season === endedSource.season && episode.episode === endedSource.episode,
    );
    const followingEpisode =
      endedSource.kind === "series" ? episodePlaylist[endedIndex + 1] ?? null : null;

    if (endedSource.kind === "movie" || !followingEpisode) {
      navigation.goBack();
      return;
    }
    watchedEpisodes.current += 1;
    if (watchedEpisodes.current >= 5 && accumulatedPlaybackMs.current >= 90 * 60 * 1000) {
      pendingNextSource.current = followingEpisode;
      setShowStillWatching(true);
      return;
    }
    changeSource(followingEpisode, true, false);
  }, [changeSource, episodePlaylist, navigation, saveProgress]);

  const applyTrackPreferences = useCallback(
    (availableAudio: AudioTrack[], availableSubtitles: SubtitleTrack[]) => {
      if (!preferencesLoadedRef.current || tracksAppliedForSourceRef.current === sourceKeyRef.current) {
        return;
      }
      const preferences = preferencesRef.current;
      if (!preferences) {
        setSelectedAudio(player.audioTrack ?? availableAudio[0] ?? null);
        setSelectedSubtitle(player.subtitleTrack);
        tracksAppliedForSourceRef.current = sourceKeyRef.current;
        return;
      }
      const preferredAudio = findPreferredTrack(availableAudio, preferences?.audio ?? null);
      if (preferredAudio) player.audioTrack = preferredAudio;
      const preferredSubtitle = preferences?.subtitlesEnabled
        ? findPreferredTrack(availableSubtitles, preferences.subtitle)
        : null;
      player.subtitleTrack = preferredSubtitle;
      setSelectedAudio(preferredAudio ?? player.audioTrack ?? availableAudio[0] ?? null);
      setSelectedSubtitle(preferredSubtitle);
      tracksAppliedForSourceRef.current = sourceKeyRef.current;
    },
    [player],
  );

  useEffect(() => {
    let active = true;
    playerPreferencesStorage
      .read()
      .then((preferences) => {
        if (!active) return;
        preferencesRef.current = preferences;
        preferencesLoadedRef.current = true;
        tracksAppliedForSourceRef.current = null;
        if (sourceLoadedKeyRef.current === sourceKeyRef.current) {
          applyTrackPreferences(
            audioTracksRef.current,
            subtitleTracksRef.current,
          );
        }
      })
      .catch(() => {
        preferencesLoadedRef.current = true;
      });
    return () => {
      active = false;
    };
  }, [applyTrackPreferences, player]);

  useEventListener(player, "statusChange", ({ status }) => {
    setPlayback((current) => ({ ...current, buffering: status === "loading" }));
    if (status === "readyToPlay") setVideoReady(true);
    if (status === "error") setVideoError(true);
  });

  useEventListener(player, "playingChange", ({ isPlaying }) => {
    setPlayback((current) => ({ ...current, playing: isPlaying }));
  });

  useEventListener(
    player,
    "sourceLoad",
    ({ duration, availableAudioTracks, availableSubtitleTracks }) => {
      sourceLoadedKeyRef.current = sourceKeyRef.current;
      const nextAudioTracks = mergeTracksById(
        audioTracksRef.current,
        availableAudioTracks,
      );
      const nextSubtitleTracks = mergeTracksById(
        subtitleTracksRef.current,
        availableSubtitleTracks,
      );
      audioTracksRef.current = nextAudioTracks;
      subtitleTracksRef.current = nextSubtitleTracks;
      setVideoReady(true);
      setAudioTracks(nextAudioTracks);
      setSubtitleTracks(nextSubtitleTracks);
      setSelectedAudio(player.audioTrack ?? nextAudioTracks[0] ?? null);
      setSelectedSubtitle(player.subtitleTrack);
      playbackSnapshotRef.current = { currentTime: 0, duration };
      setPlayback((current) => ({ ...current, duration, buffering: false }));
      // A rotação pode recarregar os metadados sem trocar a fonte. Nesse caso,
      // o Android também precisa receber novamente as preferências selecionadas.
      tracksAppliedForSourceRef.current = null;
      applyTrackPreferences(nextAudioTracks, nextSubtitleTracks);
    },
  );

  useEventListener(player, "availableAudioTracksChange", ({ availableAudioTracks }) => {
    const nextAudioTracks = mergeTracksById(
      audioTracksRef.current,
      availableAudioTracks,
    );
    audioTracksRef.current = nextAudioTracks;
    setAudioTracks(nextAudioTracks);
    setSelectedAudio((current) =>
      current ?? player.audioTrack ?? nextAudioTracks[0] ?? null,
    );
  });

  useEventListener(
    player,
    "availableSubtitleTracksChange",
    ({ availableSubtitleTracks }) => {
      const nextSubtitleTracks = mergeTracksById(
        subtitleTracksRef.current,
        availableSubtitleTracks,
      );
      subtitleTracksRef.current = nextSubtitleTracks;
      setSubtitleTracks(nextSubtitleTracks);
    },
  );

  useEventListener(player, "audioTrackChange", ({ audioTrack }) => {
    setSelectedAudio(audioTrack ?? player.availableAudioTracks[0] ?? null);
  });

  useEventListener(player, "subtitleTrackChange", ({ subtitleTrack }) => {
    setSelectedSubtitle(subtitleTrack);
  });

  useEventListener(player, "mutedChange", ({ muted: isMuted }) => {
    setMuted(isMuted);
  });

  useEventListener(player, "playbackRateChange", ({ playbackRate: rate }) => {
    setPlaybackRate(rate);
  });

  useEventListener(player, "timeUpdate", ({ currentTime, bufferedPosition }) => {
    const duration = player.duration || playbackSnapshotRef.current.duration;
    playbackSnapshotRef.current = { currentTime, duration };
    if (
      player.playing &&
      currentTime > 0 &&
      sourceLoadedKeyRef.current === sourceKeyRef.current
    ) {
      playbackStartedKeyRef.current = sourceKeyRef.current;
    }
    setPlayback((current) => ({
      ...current,
      currentTime,
      duration,
      bufferedTime: Math.max(0, bufferedPosition),
    }));

    const previousSample = playbackSample.current;
    if (player.playing) {
      if (previousSample?.sourceKey === sourceKeyRef.current) {
        const delta = currentTime - previousSample.position;
        if (delta > 0 && delta < 2) accumulatedPlaybackMs.current += delta * 1000;
      }
      playbackSample.current = { sourceKey: sourceKeyRef.current, position: currentTime };
    } else {
      playbackSample.current = null;
    }

    if (player.playing && currentTime > 0 && Date.now() - lastSavedAtRef.current >= 60_000) {
      lastSavedAtRef.current = Date.now();
      void saveProgress(sourceRef.current, { currentTime, duration }).catch(() => undefined);
    }
  });

  useEventListener(player, "playToEnd", () => {
    void handlePlaybackEnded();
  });

  useEffect(() => {
    void player.replaceAsync(videoSource).catch(() => setVideoError(true));
  }, [player, sourceKey, videoSource]);

  useEffect(() => {
    let active = true;
    setResumePosition(null);
    setVideoReady(false);
    setVideoError(false);
    setPlayback(emptyPlaybackState);
    setAudioTracks([]);
    setSubtitleTracks([]);
    audioTracksRef.current = [];
    subtitleTracksRef.current = [];
    setSelectedAudio(null);
    setSelectedSubtitle(null);
    setTrackSettingsVisible(false);
    endedSourceRef.current = null;
    resumeAppliedRef.current = null;
    tracksAppliedForSourceRef.current = null;
    sourceLoadedKeyRef.current = null;
    playbackStartedKeyRef.current = null;
    playbackSample.current = null;
    playbackSnapshotRef.current = { currentTime: 0, duration: 0 };
    lastSavedAtRef.current = 0;

    if (
      typeof source.startPosition === "number" &&
      Number.isFinite(source.startPosition)
    ) {
      setResumePosition(Math.max(0, source.startPosition));
      return () => {
        active = false;
      };
    }

    if (startAtBeginningKeyRef.current === sourceKey) {
      startAtBeginningKeyRef.current = null;
      setResumePosition(0);
      return () => {
        active = false;
      };
    }

    progressService
      .byContent(source.tmdbId)
      .then((entries) => {
        if (!active) return;
        const entry = entries.find((value) => {
          if (value.mediaType !== (source.kind === "movie" ? "movie" : "tv")) return false;
          if (source.kind === "movie") return true;
          return value.season === source.season && value.episode === source.episode;
        });
        setResumePosition(entry && !entry.completed && entry.progress > 0 ? entry.progress : 0);
      })
      .catch(() => active && setResumePosition(0));

    return () => {
      active = false;
    };
  }, [source, sourceKey]);

  useEffect(() => {
    if (!videoReady || resumePosition === null || resumeAppliedRef.current === sourceKey) return;
    resumeAppliedRef.current = sourceKey;
    player.currentTime = Math.max(
      0,
      Math.min(resumePosition, player.duration || resumePosition),
    );
    if (autoPlayOnLoad) player.play();
  }, [autoPlayOnLoad, player, resumePosition, sourceKey, videoReady]);

  useEffect(() => {
    if ((videoReady && resumePosition !== null) || videoError) {
      navigationProgressService.complete();
    }
  }, [resumePosition, videoError, videoReady]);

  useEffect(() => {
    if (!playback.playing) {
      setControlsVisible(true);
      setBigPlayVisible(true);
      if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
      if (bigPlayTimer.current) clearTimeout(bigPlayTimer.current);
      return;
    }
    revealControls();
  }, [playback.playing, revealControls]);

  useEffect(() => {
    void NavigationBar.setVisibilityAsync("hidden").catch(() => undefined);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") void saveCurrentProgress();
    });
    return () => {
      subscription.remove();
      void saveCurrentProgress();
      void NavigationBar.setVisibilityAsync("visible").catch(() => undefined);
      if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
      if (singleTapTimer.current) clearTimeout(singleTapTimer.current);
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
      if (bigPlayTimer.current) clearTimeout(bigPlayTimer.current);
    };
  }, [player, saveCurrentProgress]);

  const togglePlay = useCallback(() => {
    if (player.status !== "readyToPlay" || resumePosition === null) return;
    if (playback.currentTime >= playback.duration && playback.duration > 0) {
      player.replay();
      return;
    }
    if (player.playing) {
      player.pause();
      resetPresenceTracking();
    } else {
      player.play();
    }
  }, [playback.currentTime, playback.duration, player, resetPresenceTracking, resumePosition]);

  const seekTo = useCallback(
    (seconds: number) => {
      player.currentTime = Math.max(0, Math.min(player.duration, seconds));
    },
    [player],
  );

  const seekBy = useCallback(
    (seconds: -10 | 10) => {
      if (player.status !== "readyToPlay") return;
      player.seekBy(seconds);
      setSeekFeedback(seconds);
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
      feedbackTimer.current = setTimeout(() => setSeekFeedback(null), 600);
    },
    [player],
  );

  const handleSurfacePress = useCallback(
    (x: number, width: number) => {
      const zone = x < width * 0.3 ? "left" : x > width * 0.7 ? "right" : "center";
      const now = Date.now();
      const previousTap = lastTap.current;
      const doubleTap = previousTap && previousTap.zone === zone && now - previousTap.at < 300;
      if (doubleTap) {
        if (singleTapTimer.current) clearTimeout(singleTapTimer.current);
        lastTap.current = null;
        registerInteraction();
        if (zone === "left") seekBy(-10);
        if (zone === "right") seekBy(10);
        return;
      }
      lastTap.current = { at: now, zone };
      if (singleTapTimer.current) clearTimeout(singleTapTimer.current);
      singleTapTimer.current = setTimeout(() => {
        registerInteraction();
        lastTap.current = null;
      }, 300);
    },
    [registerInteraction, seekBy],
  );

  const toggleMute = useCallback(() => {
    const nextMuted = !player.muted;
    player.muted = nextMuted;
    setMuted(nextMuted);
  }, [player]);

  const setFullscreenMode = useCallback(
    (enabled: boolean) => {
      setTrackSettingsVisible(false);
      setFullscreen(enabled);
      navigation.setOptions({ orientation: enabled ? "landscape" : "portrait" });
      requestAnimationFrame(revealControls);
    },
    [navigation, revealControls],
  );

  const toggleFullscreen = useCallback(() => {
    setFullscreenMode(!fullscreen);
  }, [fullscreen, setFullscreenMode]);

  useEffect(() => {
    if (!fullscreen) return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      setFullscreenMode(false);
      return true;
    });
    return () => subscription.remove();
  }, [fullscreen, setFullscreenMode]);

  const retry = useCallback(() => {
    setVideoError(false);
    setVideoReady(false);
    resumeAppliedRef.current = null;
    tracksAppliedForSourceRef.current = null;
    void player.replaceAsync(videoSource).catch(() => setVideoError(true));
  }, [player, videoSource]);

  const selectAudioTrack = useCallback(
    (track: AudioTrack) => {
      player.audioTrack = track;
      setSelectedAudio(track);
      const current = preferencesRef.current;
      const nextPreferences: PlayerPreferences = {
        audio: preferenceFor(track),
        subtitle:
          current?.subtitle ??
          (selectedSubtitle ? subtitlePreferenceFor(selectedSubtitle) : null),
        subtitlesEnabled: current?.subtitlesEnabled ?? Boolean(selectedSubtitle),
      };
      preferencesRef.current = nextPreferences;
      void playerPreferencesStorage.save(nextPreferences);
    },
    [player, selectedSubtitle],
  );

  const selectSubtitleTrack = useCallback(
    (track: SubtitleTrack | null) => {
      player.subtitleTrack = track;
      setSelectedSubtitle(track);
      const current = preferencesRef.current;
      const nextPreferences: PlayerPreferences = {
        audio: current?.audio ?? (selectedAudio ? preferenceFor(selectedAudio) : null),
        subtitle: track ? subtitlePreferenceFor(track) : current?.subtitle ?? null,
        subtitlesEnabled: Boolean(track),
      };
      preferencesRef.current = nextPreferences;
      void playerPreferencesStorage.save(nextPreferences);
    },
    [player, selectedAudio],
  );

  const continueWatching = useCallback(() => {
    setShowStillWatching(false);
    resetPresenceTracking();
    const pending = pendingNextSource.current;
    pendingNextSource.current = null;
    if (pending) changeSource(pending, true, false);
  }, [changeSource, resetPresenceTracking]);

  const stopWatching = useCallback(() => {
    setShowStillWatching(false);
    pendingNextSource.current = null;
    navigation.goBack();
  }, [navigation]);

  const handleBack = useCallback(() => {
    if (fullscreen) {
      setFullscreenMode(false);
      return;
    }
    navigation.goBack();
  }, [fullscreen, navigation, setFullscreenMode]);

  return (
    <View style={playerStyles.screen}>
      <StatusBar hidden />
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="contain"
        nativeControls={false}
        fullscreenOptions={{ enable: false }}
        useExoShutter={false}
        onFirstFrameRender={() => setVideoReady(true)}
      />

      {videoError ? (
        <View style={playerStyles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.red} />
          <Text style={playerStyles.errorTitle}>Não foi possível reproduzir este conteúdo</Text>
          <Text style={playerStyles.errorDescription}>
            Verifique sua conexão ou tente carregar o vídeo novamente.
          </Text>
          <View style={playerStyles.errorActions}>
            <Pressable style={playerStyles.retryButton} onPress={retry}>
              <Ionicons name="refresh" size={18} color={colors.white} />
              <Text style={playerStyles.retryText}>Tentar novamente</Text>
            </Pressable>
            <Pressable style={playerStyles.backButton} onPress={handleBack}>
              <Text style={playerStyles.backText}>Voltar</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <PlayerControls
          visible={controlsVisible}
          loading={!videoReady || resumePosition === null || playback.buffering}
          playing={playback.playing}
          showBigPlay={bigPlayVisible}
          muted={muted}
          fullscreen={fullscreen}
          title={source.title}
          subtitle={source.subtitle}
          currentTime={playback.currentTime}
          duration={playback.duration}
          bufferedTime={playback.bufferedTime}
          seekFeedback={seekFeedback}
          hasPreviousEpisode={Boolean(previousEpisode)}
          hasNextEpisode={Boolean(nextEpisode)}
          hasTrackOptions
          onBack={handleBack}
          onTogglePlay={togglePlay}
          onToggleMute={toggleMute}
          onSeek={seekTo}
          onPreviousEpisode={() => previousEpisode && changeSource(previousEpisode, false)}
          onNextEpisode={() => nextEpisode && changeSource(nextEpisode, false)}
          onOpenTrackSettings={() => {
            setTrackSettingsVisible(true);
            setControlsVisible(true);
          }}
          onFullscreen={toggleFullscreen}
          onSurfacePress={handleSurfacePress}
          onInteraction={registerInteraction}
        />
      )}

      <PlayerTrackSettings
        visible={trackSettingsVisible}
        audioTracks={audioTracks}
        subtitleTracks={subtitleTracks}
        selectedAudio={selectedAudio}
        selectedSubtitle={selectedSubtitle}
        playbackRate={playbackRate}
        fullscreen={fullscreen}
        onClose={() => {
          setTrackSettingsVisible(false);
          revealControls();
        }}
        onSelectAudio={selectAudioTrack}
        onSelectSubtitle={selectSubtitleTrack}
        onSelectPlaybackRate={(rate) => {
          player.playbackRate = rate;
          setPlaybackRate(rate);
        }}
      />

      <StillWatchingPrompt
        visible={showStillWatching}
        title={source.title}
        onContinue={continueWatching}
        onStop={stopWatching}
      />
    </View>
  );
}

const playerStyles = StyleSheet.create({
  screen: { flex: 1, overflow: "hidden", backgroundColor: "#000" },
  errorContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    backgroundColor: "rgba(0,0,0,.94)",
  },
  errorTitle: {
    maxWidth: 420,
    color: colors.white,
    fontFamily: "Montserrat_700Bold",
    fontSize: 21,
    lineHeight: 27,
    textAlign: "center",
    marginTop: 16,
  },
  errorDescription: {
    maxWidth: 380,
    color: colors.muted,
    fontFamily: "Montserrat_400Regular",
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 8,
  },
  errorActions: { width: "100%", maxWidth: 320, marginTop: 24, gap: 10 },
  retryButton: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 10,
    backgroundColor: colors.red,
  },
  retryText: { color: colors.white, fontFamily: "Montserrat_700Bold", fontSize: 13 },
  backButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.14)",
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,.06)",
  },
  backText: {
    color: "rgba(255,255,255,.78)",
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 13,
  },
});
