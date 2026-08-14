import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../theme";
import { navigationProgressService } from "../services/NavigationProgressService";

export function NavigationProgress() {
  const insets = useSafeAreaInsets();
  const progress = useRef(new Animated.Value(0)).current;
  const [visible, setVisible] = useState(false);
  const [navigationState, setNavigationState] = useState({
    active: false,
    revision: 0,
  });

  useEffect(
    () => navigationProgressService.subscribe(setNavigationState),
    [],
  );

  useEffect(() => {
    if (!navigationState.revision) return;
    if (navigationState.active) {
      setVisible(true);
      progress.stopAnimation();
      progress.setValue(0.12);
      Animated.timing(progress, {
        toValue: 0.9,
        duration: 1_800,
        useNativeDriver: true,
      }).start();
      const safetyTimer = setTimeout(
        () => navigationProgressService.complete(),
        10_000,
      );
      return () => {
        clearTimeout(safetyTimer);
        progress.stopAnimation();
      };
    }

    progress.stopAnimation();
    Animated.timing(progress, {
      toValue: 1,
      duration: 120,
      useNativeDriver: true,
    }).start();
    const hideTimer = setTimeout(() => {
      setVisible(false);
      progress.setValue(0);
    }, 180);

    return () => {
      clearTimeout(hideTimer);
      progress.stopAnimation();
    };
  }, [navigationState.active, navigationState.revision, progress]);

  if (!visible) return null;

  return (
    <View
      pointerEvents="none"
      style={[navigationStyles.overlay, { paddingTop: insets.top }]}
    >
      <View style={navigationStyles.track}>
        <Animated.View
          style={[
            navigationStyles.progress,
            { transform: [{ scaleX: progress }] },
          ]}
        />
      </View>
      <ActivityIndicator
        color={colors.red}
        size="small"
        style={[navigationStyles.spinner, { top: insets.top + 10 }]}
      />
    </View>
  );
}

const navigationStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
  },
  track: {
    width: "100%",
    height: 3,
    backgroundColor: "rgba(255,255,255,.08)",
  },
  progress: {
    width: "100%",
    height: "100%",
    backgroundColor: colors.red,
    transformOrigin: "left center",
    shadowColor: colors.red,
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
  },
  spinner: {
    position: "absolute",
    right: 12,
  },
});
