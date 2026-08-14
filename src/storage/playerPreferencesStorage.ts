import AsyncStorage from "@react-native-async-storage/async-storage";
import { SubtitleTrackType } from "../utils/playerTracks";

const PLAYER_PREFERENCES_KEY = "flixnext:player:preferences:v1";

export interface PlayerTrackPreference {
  language: string | null;
  label: string | null;
  type?: SubtitleTrackType | null;
}

export interface PlayerPreferences {
  audio: PlayerTrackPreference | null;
  subtitle: PlayerTrackPreference | null;
  subtitlesEnabled: boolean;
}

class PlayerPreferencesStorage {
  async read(): Promise<PlayerPreferences | null> {
    const raw = await AsyncStorage.getItem(PLAYER_PREFERENCES_KEY);
    if (!raw) return null;

    try {
      const preferences = JSON.parse(raw) as PlayerPreferences;
      if (typeof preferences.subtitlesEnabled !== "boolean") return null;
      return preferences;
    } catch {
      await AsyncStorage.removeItem(PLAYER_PREFERENCES_KEY);
      return null;
    }
  }

  save(preferences: PlayerPreferences) {
    return AsyncStorage.setItem(
      PLAYER_PREFERENCES_KEY,
      JSON.stringify(preferences),
    );
  }
}

export const playerPreferencesStorage = new PlayerPreferencesStorage();
