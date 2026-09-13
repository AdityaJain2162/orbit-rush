# Orbit Rush: Neon Switch

A hypercasual neon runner game built with Expo, React Native, and Reanimated.
Tap to switch between two lanes, dodge hazards, collect shards, and chain
near-misses for combo multipliers. Features a procedural pattern system with
8 difficulty-gated patterns (zigzag, tunnel, wall gap, pulse, and more).

## Features

- **One-tap controls** — tap anywhere to switch between left/right lanes
- **Procedural pattern system** — 8 patterns (zigzag, wallGap, alternating, tunnel, diamond, doubleHazard, corridor, pulse) with difficulty gating
- **Near-miss combo system** — pass hazards on the opposite lane for +50 and combo multiplier
- **Shard collectibles** — gold shards spawn in patterns for +10 score each
- **Difficulty ramp** — scroll speed increases 6% every 10 seconds (capped at 720 px/s)
- **Neon cyberpunk visual identity** — Orbitron + Rajdhani fonts, high-contrast neon palette
- **Spring-physics lane switching** — smooth `withSpring` X interpolation
- **Player trail** — 3 ghost orbs trail behind the player with decaying opacity
- **Screen shake** — near-misses and crashes shake the screen ±6px
- **Crash-proof audio** — CC0 sound effects with silent fallback in Expo Go
- **Tactile haptics** — light/medium/heavy impact + error notification feedback
- **Rewarded ads** — revive run + double shards via Google Mobile Ads (mocked in Expo Go)
- **Persistent shard wallet** — shards saved to AsyncStorage across sessions
- **60/120 FPS** — all motion runs on the Reanimated UI thread, JS thread stays free

## Gameplay

1. The player orb is fixed near the bottom of the screen.
2. The world scrolls downward at increasing speed.
3. Hazards (red orbs) and shards (gold orbs) spawn in patterns from the top.
4. Tap to switch lanes to dodge hazards and collect shards.
5. If you pass a hazard on the opposite lane within 48px, you trigger a **near-miss** (+50, combo++).
6. Crashing into a hazard ends the run.
7. Watch a rewarded ad to revive (once per run) or double your shards.

## Controls

- **Tap anywhere** — switch between left/right lane

## Tech Stack

- [Expo](https://expo.dev) SDK 57
- [React Native](https://reactnative.dev) 0.86
- [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/) — UI-thread animation
- [expo-haptics](https://docs.expo.dev/versions/latest/sdk/haptics/) — tactile feedback
- [expo-audio](https://docs.expo.dev/versions/latest/sdk/audio/) — sound playback
- [react-native-google-mobile-ads](https://docs.expo.dev/versions/latest/sdk/google-mobile-ads/) — rewarded ads
- [@react-native-async-storage/async-storage](https://react-native-async-storage.github.io/async-storage/) — persistence
- [@expo-google-fonts/orbitron](https://github.com/expo/google-fonts) & [@expo-google-fonts/rajdhani](https://github.com/expo/google-fonts) — typography

## Getting Started

```bash
# Install dependencies
npm install

# Start the dev server (use --clear after dependency changes)
npx expo start --clear

# Run on device
npm run android   # Android
npm run ios       # iOS (requires macOS)
npm run web       # Web
```

## Testing Real Ads

Real Google Mobile Ads cannot run in Expo Go. To test real ads:

```bash
# Install EAS CLI
npm install -g eas-cli

# Build a development client
eas build --platform android --profile development

# OR build locally
npx expo run:android
```

In Expo Go, the mock ad flow (2s countdown overlay) is used automatically.

## Build for Production

```bash
# Build Android APK
eas build --platform android --profile preview

# Build Android AAB (Play Store)
eas build --platform android --profile production

# Build iOS
eas build --platform ios --profile production
```

## Asset Credits

| Asset | Source | License |
|-------|--------|---------|
| Orbitron font | Google Fonts | SIL Open Font License 1.1 |
| Rajdhani font | Google Fonts | SIL Open Font License 1.1 |
| Sound effects | Synthesized in-repo (`scripts/generate-sounds.js`) | CC0 1.0 (Public Domain) |

## Documentation

For the full technical reference (architecture, game math, pattern system, ad
state machine, operational guidelines for AI agents), see [agent.md](./agent.md).

## License

This project's source code is provided as-is. Fonts are under the SIL Open
Font License. Sound effects are CC0 (public domain).
