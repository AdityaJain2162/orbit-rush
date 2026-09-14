/**
 * App.tsx — Orbit Rush: Neon Switch
 *
 * Root component. Loads fonts, preloads sounds, applies settings + skin,
 * and switches between Start / Playing / Game Over / Pause screens.
 * The game loop itself runs on the Reanimated UI thread inside
 * useOrbitEngine + OrbitCanvas.
 */
import React, { useEffect, useState } from 'react';
import { Alert, BackHandler, Platform, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
import { useKeepAwake } from 'expo-keep-awake';
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

import { Colors, setPlayerSkin } from './src/theme/theme';
import { useOrbitEngine } from './src/game/useOrbitEngine';
import { OrbitCanvas } from './src/game/OrbitCanvas';
import { ScoreHUD } from './src/components/ScoreHUD';
import { StartScreen } from './src/screens/StartScreen';
import { GameOverModal } from './src/components/GameOverModal';
import { TutorialOverlay } from './src/components/TutorialOverlay';
import { LeaderboardModal } from './src/components/LeaderboardModal';
import { ShopModal } from './src/components/ShopModal';
import { AchievementsModal } from './src/components/AchievementsModal';
import { SettingsModal } from './src/components/SettingsModal';
import { PauseModal } from './src/components/PauseModal';
import { PauseButton } from './src/components/PauseButton';
import { PowerUpBar } from './src/components/PowerUpBar';
import { preloadSounds, setSoundEnabled, setVibrationEnabled } from './src/services/sound';
import {
  addToWallet,
  loadWallet,
  loadHighScore,
  saveHighScore,
  loadLeaderboard,
  addToLeaderboard,
  loadAchievements,
  saveAchievements,
  loadDailyState,
  recordDailyRun,
  loadUnlockedSkins,
  unlockSkin,
  loadEquippedSkin,
  saveEquippedSkin,
  spendFromWallet,
  loadPowerUps,
  savePowerUps,
  loadSettings,
  saveSettings,
  loadTotalRuns,
  incrementTotalRuns,
  loadTotalShards,
  addTotalShards,
  type LeaderboardEntry,
  type DailyState,
  type Settings,
  type PowerUpState,
} from './src/services/storage';
import { getSkinById } from './src/config/skins';
import { ACHIEVEMENTS, checkAchievements } from './src/config/achievements';

type MenuScreen = 'none' | 'leaderboard' | 'shop' | 'achievements' | 'settings';

export default function App() {
  const [fontsLoaded] = useFonts({
    Orbitron_700Bold,
    Orbitron_900Black,
    Rajdhani_600SemiBold,
    Rajdhani_700Bold,
  });
  const [ready, setReady] = useState(false);
  const [doubleShardsUsed, setDoubleShardsUsed] = useState(false);
  const [paused, setPaused] = useState(false);
  const [menuScreen, setMenuScreen] = useState<MenuScreen>('none');

  // Persistent data
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [daily, setDaily] = useState<DailyState | null>(null);
  const [streak, setStreak] = useState(0);
  const [unlockedSkins, setUnlockedSkins] = useState<string[]>(['cyan']);
  const [equippedSkin, setEquippedSkin] = useState('cyan');
  const [powerUps, setPowerUps] = useState<PowerUpState>({ shields: 0, magnets: 0 });
  const [settings, setSettings] = useState<Settings>({
    soundEnabled: true,
    vibrationEnabled: true,
  });
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>([]);
  const [stats, setStats] = useState({ highScore: 0, totalRuns: 0, totalShards: 0 });

  const engine = useOrbitEngine();

  useKeepAwake();

  // Boot: fonts + sounds + load all persistent data
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await preloadSounds();
      } catch {
        /* ignore */
      }

      // Load settings and apply
      const s = await loadSettings();
      setSettings(s);
      setSoundEnabled(s.soundEnabled);
      setVibrationEnabled(s.vibrationEnabled);

      // Load skin
      const skinId = await loadEquippedSkin();
      setEquippedSkin(skinId);
      const skin = getSkinById(skinId);
      setPlayerSkin(skin.core, skin.glow, skin.trail);

      // Load all persistent data
      const [wallet, hs, lb, dl, us, pu, ach, tr, ts] = await Promise.all([
        loadWallet(),
        loadHighScore(),
        loadLeaderboard(),
        loadDailyState(),
        loadUnlockedSkins(),
        loadPowerUps(),
        loadAchievements(),
        loadTotalRuns(),
        loadTotalShards(),
      ]);

      if (cancelled) return;

      setLeaderboard(lb);
      setDaily(dl);
      setStreak(dl.streak);
      setUnlockedSkins(us);
      setPowerUps(pu);
      setUnlockedAchievements(ach.unlocked);
      setStats({ highScore: hs, totalRuns: tr, totalShards: ts });

      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fullscreen immersive mode
  useEffect(() => {
    if (Platform.OS === 'android') {
      try {
        NavigationBar.setVisibilityAsync('hidden');
        NavigationBar.setStyle('dark');
      } catch {
        /* no-op */
      }
    }
    return () => {
      if (Platform.OS === 'android') {
        try {
          NavigationBar.setVisibilityAsync('visible');
        } catch {
          /* no-op */
        }
      }
    };
  }, []);

  // Android back-button handling
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        // If a menu is open, close it
        if (menuScreen !== 'none') {
          setMenuScreen('none');
          return true;
        }
        // If paused, resume
        if (paused) {
          setPaused(false);
          engine.resume();
          return true;
        }
        // If playing, pause
        if (engine.screen === 'playing') {
          setPaused(true);
          engine.pause();
          return true;
        }
        // If game over, go home
        if (engine.screen === 'over') {
          engine.goHome();
          return true;
        }
        // Otherwise, ask to exit
        Alert.alert(
          'Exit Game?',
          'Are you sure you want to quit Orbit Rush?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Exit', style: 'destructive', onPress: () => BackHandler.exitApp() },
          ],
        );
        return true;
      },
    );
    return () => subscription.remove();
  }, [engine, menuScreen, paused]);

  // Commit run to storage when the game ends
  useEffect(() => {
    if (engine.screen === 'over') {
      setPaused(false);
      (async () => {
        await engine.endRunAndCommit();
        const runScore = engine.finalScore;
        const runShards = engine.runShards;

        // Update leaderboard
        const lb = await addToLeaderboard({
          score: runScore,
          shards: runShards,
          date: Date.now(),
        });
        setLeaderboard(lb);

        // Update lifetime stats
        const totalRuns = await incrementTotalRuns();
        const totalShards = await addTotalShards(runShards);

        // Update daily challenge
        const dl = await recordDailyRun(runScore, runShards);
        setDaily(dl);
        setStreak(dl.streak);

        // Check achievements
        const achState = await loadAchievements();
        const newlyUnlocked = checkAchievements(achState.unlocked, {
          highScore: Math.max(stats.highScore, runScore),
          totalRuns,
          totalShards,
          singleRunShards: runShards,
          singleRunScore: runScore,
        });

        if (newlyUnlocked.length > 0) {
          const allUnlocked = [...achState.unlocked, ...newlyUnlocked.map((a) => a.id)];
          await saveAchievements({ unlocked: allUnlocked });
          setUnlockedAchievements(allUnlocked);
          // Grant rewards
          let totalReward = 0;
          for (const ach of newlyUnlocked) totalReward += ach.reward;
          if (totalReward > 0) {
            await addToWallet(totalReward);
          }
        }

        setStats({
          highScore: Math.max(stats.highScore, runScore),
          totalRuns,
          totalShards,
        });
      })();
    }
  }, [engine.screen, engine]);

  // Reset double-shards flag on a fresh run
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

  // ---- Shop handlers ----
  const handleUnlockSkin = async (skinId: string, cost: number) => {
    const success = await spendFromWallet(cost);
    if (success) {
      await unlockSkin(skinId);
      const us = await loadUnlockedSkins();
      setUnlockedSkins(us);
      const w = await loadWallet();
      // Update engine wallet
      engine.wallet = w;
    }
  };

  const handleEquipSkin = async (skinId: string) => {
    await saveEquippedSkin(skinId);
    setEquippedSkin(skinId);
    const skin = getSkinById(skinId);
    setPlayerSkin(skin.core, skin.glow, skin.trail);
  };

  const handleBuyShield = async () => {
    const success = await spendFromWallet(30);
    if (success) {
      const pu = await loadPowerUps();
      pu.shields += 1;
      await savePowerUps(pu);
      setPowerUps({ ...pu });
      const w = await loadWallet();
      engine.wallet = w;
    }
  };

  const handleBuyMagnet = async () => {
    const success = await spendFromWallet(40);
    if (success) {
      const pu = await loadPowerUps();
      pu.magnets += 1;
      await savePowerUps(pu);
      setPowerUps({ ...pu });
      const w = await loadWallet();
      engine.wallet = w;
    }
  };

  // ---- Power-up use handlers ----
  const handleUseShield = () => {
    if (powerUps.shields <= 0 || engine.shieldActive) return;
    engine.equipShield();
    const pu = { ...powerUps, shields: powerUps.shields - 1 };
    setPowerUps(pu);
    savePowerUps(pu);
  };

  const handleUseMagnet = () => {
    if (powerUps.magnets <= 0 || engine.magnetActive) return;
    engine.equipMagnet();
    const pu = { ...powerUps, magnets: powerUps.magnets - 1 };
    setPowerUps(pu);
    savePowerUps(pu);
  };

  // ---- Settings handlers ----
  const handleToggleSound = () => {
    const newSettings = { ...settings, soundEnabled: !settings.soundEnabled };
    setSettings(newSettings);
    setSoundEnabled(newSettings.soundEnabled);
    saveSettings(newSettings);
  };

  const handleToggleVibration = () => {
    const newSettings = { ...settings, vibrationEnabled: !settings.vibrationEnabled };
    setSettings(newSettings);
    setVibrationEnabled(newSettings.vibrationEnabled);
    saveSettings(newSettings);
  };

  // ---- Pause handlers ----
  const handlePause = () => {
    setPaused(true);
    engine.pause();
  };

  const handleResume = () => {
    setPaused(false);
    engine.resume();
  };

  const handleQuitToHome = () => {
    setPaused(false);
    engine.goHome();
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" hidden={true} />
      <Animated.View style={[StyleSheet.absoluteFill, shakeStyle]}>
        {engine.screen !== 'idle' ? <OrbitCanvas engine={engine} /> : null}

        {engine.screen === 'playing' ? (
          <>
            <ScoreHUD
              score={engine.score}
              combo={engine.combo}
              shards={engine.shards}
              wallet={engine.wallet}
            />
            <PauseButton onPress={handlePause} />
            <PowerUpBar
              shields={powerUps.shields}
              magnets={powerUps.magnets}
              shieldActive={engine.shieldActive}
              magnetActive={engine.magnetActive}
              onUseShield={handleUseShield}
              onUseMagnet={handleUseMagnet}
            />
          </>
        ) : null}
      </Animated.View>

      {engine.screen === 'playing' ? (
        <TutorialOverlay visible={true} onDismiss={() => {}} />
      ) : null}

      {engine.screen === 'idle' ? (
        <StartScreen
          highScore={engine.highScore}
          wallet={engine.wallet}
          daily={daily}
          streak={streak}
          onStart={engine.start}
          onLeaderboard={() => setMenuScreen('leaderboard')}
          onShop={() => setMenuScreen('shop')}
          onAchievements={() => setMenuScreen('achievements')}
          onSettings={() => setMenuScreen('settings')}
        />
      ) : null}

      {/* Pause overlay */}
      <PauseModal visible={paused} onResume={handleResume} onQuit={handleQuitToHome} />

      {/* Menu modals */}
      <LeaderboardModal
        visible={menuScreen === 'leaderboard'}
        entries={leaderboard}
        onClose={() => setMenuScreen('none')}
      />
      <ShopModal
        visible={menuScreen === 'shop'}
        wallet={engine.wallet}
        unlockedSkins={unlockedSkins}
        equippedSkin={equippedSkin}
        shields={powerUps.shields}
        magnets={powerUps.magnets}
        onUnlockSkin={handleUnlockSkin}
        onEquipSkin={handleEquipSkin}
        onBuyShield={handleBuyShield}
        onBuyMagnet={handleBuyMagnet}
        onClose={() => setMenuScreen('none')}
      />
      <AchievementsModal
        visible={menuScreen === 'achievements'}
        unlocked={unlockedAchievements}
        stats={stats}
        onClose={() => setMenuScreen('none')}
      />
      <SettingsModal
        visible={menuScreen === 'settings'}
        settings={settings}
        onToggleSound={handleToggleSound}
        onToggleVibration={handleToggleVibration}
        onClose={() => setMenuScreen('none')}
      />

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
        onHome={engine.goHome}
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
