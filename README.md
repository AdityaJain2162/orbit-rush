# Orbit Rush: Neon Switch

A hypercasual neon arcade game built with Expo, React Native, and Reanimated.
Tap to switch between inside and outside tracks, dodge hazards, collect shards,
and chain near-misses for combo multipliers.

## Features

- **One-tap controls** — tap anywhere to switch between inside/outside tracks
- **Procedural hazards** — spikes spawn on either track with increasing frequency
- **Near-miss combo system** — dodge hazards on the opposite track for +50 and combo multiplier
- **Shard collectibles** — gold shards spawn on the opposite track for +10 score
- **Difficulty ramp** — angular velocity increases 5% every 10 seconds (capped at 4.5 rad/s)
- **Neon cyberpunk visual identity** — Orbitron + Rajdhani fonts, high-contrast neon palette
- **Spring-physics track switching** — smooth `withSpring` radius interpolation
- **Player trail** — 3 ghost orbs trail behind the player with decaying opacity
- **Screen shake** — near-misses and crashes shake the screen ±6px
- **Crash-proof audio** — CC0 sound effects with silent fallback in Expo Go
- **Tactile haptics** — light/medium/heavy impact + error notification feedback
- **Rewarded ads** — revive run + double shards via Google Mobile Ads (mocked in Expo Go)
- **Persistent shard wallet** — shards saved to AsyncStorage across sessions
- **60/120 FPS** — all motion runs on the Reanimated UI thread, JS thread stays free

## Gameplay

1. The player orb orbits a ring at a constant angular velocity.
2. Hazards (spikes) spawn ahead on either the inside or outside track.
3. Tap to switch tracks to dodge hazards.
4. If you pass a hazard on the opposite track within 14°, you trigger a **near-miss** (+50, combo++).
5. Collect gold shards for +10 score each.
6. Crashing into a hazard ends the run.
7. Watch a rewarded ad to revive (once per run) or double your shards.

## Controls

- **Tap anywhere** — switch between inside/outside track

## Tech Stack

- [Expo](https://expo.dev) SDK 57
- [React Native](https://reactnative.dev) 0.86
- [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/) — UI-thread animation
- [expo-haptics](https://docs.expo.dev/versions/latest/sdk/haptics/) — tactile feedback
- [expo-av](https://docs.expo.dev/versions/latest/sdk/av/) — sound playback
- [react-native-google-mobile-ads](https://docs.expo.dev/versions/latest/sdk/google-mobile-ads/) — rewarded ads
- [@react-native-async-storage/async-storage](https://react-native-async-storage.github.io/async-storage/) — persistence
- [@expo-google-fonts/orbitron](https://github.com/expo/google-fonts) & [@expo-google-fonts/rajdhani](https://github.com/expo/google-fonts) — typography

## Getting Started

```bash
# Install dependencies
npm install

# Start the dev server
npm start
# or: npx expo start

# Run on device
npm run android   # Android
npm run ios       # iOS (requires macOS)
npm run web       # Web
```

## Build for Production

```bash
# Install EAS CLI
npm install -g eas-cli

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

For the full technical reference (architecture, game math, ad state machine,
operational guidelines for AI agents), see [agent.md](./agent.md).

## License

This project's source code is provided as-is. Fonts are under the SIL Open
Font License. Sound effects are CC0 (public domain).
