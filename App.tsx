/**
 * App.tsx — Orbit Rush: Neon Switch
 *
 * Root component. Loads fonts, preloads sounds, detects ad mode, and switches
 * between Start / Playing / Game Over screens. The game loop itself runs on
 * the Reanimated UI thread inside useOrbitEngine + OrbitCanvas.
 */
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import {
  useFonts,
  Orbitron_700Bold,
  Orbitron_900Black,
} from '@expo-google-fonts/orbitron';
import {
  Rajdhani_600SemiBold,
  Rajdhani_700Bold,
} from '@expo-google-fonts/rajdhani';

import { Colors } from './src/theme/theme';
import { useOrbitEngine } from './src/game/useOrbitEngine';
import { OrbitCanvas } from './src/game/OrbitCanvas';
import { ScoreHUD } from './src/components/ScoreHUD';
import { StartScreen } from './src/screens/StartScreen';
import { GameOverModal } from './src/components/GameOverModal';
import { TutorialOverlay } from './src/components/TutorialOverlay';
import { preloadSounds } from './src/services/sound';

export default function App() {
  const [fontsLoaded] = useFonts({
    Orbitron_700Bold,
    Orbitron_900Black,
    Rajdhani_600SemiBold,
    Rajdhani_700Bold,
  });
  const [ready, setReady] = useState(false);
  const [doubleShardsUsed, setDoubleShardsUsed] = useState(false);

  const engine = useOrbitEngine();

  // Boot: fonts + sounds
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await preloadSounds();
      } catch {
        /* ignore */
      }
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Commit run to storage when the game ends.
  useEffect(() => {
    if (engine.screen === 'over') {
      engine.endRunAndCommit();
    }
  }, [engine.screen, engine]);

  // Reset double-shards flag on a fresh run.
  useEffect(() => {
    if (engine.screen === 'playing') setDoubleShardsUsed(false);
  }, [engine.screen]);

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: engine.shakeX.value },
      { translateY: engine.shakeY.value },
    ],
  }));

  if (!fontsLoaded || !ready) {
    return <View style={styles.boot} />;
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <Animated.View style={[StyleSheet.absoluteFill, shakeStyle]}>
        {engine.screen !== 'idle' ? <OrbitCanvas engine={engine} /> : null}

        {engine.screen === 'playing' ? (
          <ScoreHUD
            score={engine.score}
            combo={engine.combo}
            shards={engine.shards}
            wallet={engine.wallet}
          />
        ) : null}
      </Animated.View>

      {engine.screen === 'playing' ? (
        <TutorialOverlay visible={true} onDismiss={() => {}} />
      ) : null}

      {engine.screen === 'idle' ? (
        <StartScreen
          highScore={engine.highScore}
          wallet={engine.wallet}
          onStart={engine.start}
        />
      ) : null}

      <GameOverModal
        visible={engine.screen === 'over'}
        score={engine.finalScore}
        shards={engine.runShards}
        wallet={engine.wallet}
        highScore={engine.highScore}
        reviveUsed={engine.reviveUsed}
        doubleShardsUsed={doubleShardsUsed}
        onRevive={engine.revive}
        onDoubleShards={() => {
          engine.doubleShards();
          setDoubleShardsUsed(true);
        }}
        onRestart={engine.start}
        onHome={() => {
          // reset to idle by forcing a re-render with screen state
          engine.start();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    backgroundColor: Colors.void,
  },
  root: {
    flex: 1,
    backgroundColor: Colors.void,
  },
});
