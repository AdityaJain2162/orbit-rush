# agent.md — Orbit Rush: Neon Switch — Technical Playbook for AI Agents

> **Read this file before touching any code in this repository.**
> It is the single source of truth for architecture, game math, monetization
> state machine, and the operational rules every future agent MUST follow.

---

## 1. System Architecture

```
App.tsx                         ← root: font loading, sound preload, ad detection, screen routing
├── src/theme/theme.ts          ← Colors, Fonts, GameGeometry, Spacing, Radius (no side-effects)
├── src/game/
│   ├── useOrbitEngine.ts       ← Game state machine + Reanimated SharedValues + useFrameCallback
│   └── OrbitCanvas.tsx          ← Pure UI-thread renderer (reads SharedValues, renders orbs/hazards/shards)
├── src/components/
│   ├── NeonButton.tsx           ← Spring-pressable button with border glow + light haptic
│   ├── GlassModal.tsx           ← Blurred overlay card (Game Over / Revive)
│   ├── ScoreHUD.tsx             ← Top HUD: score/combo/shards via useAnimatedProps (UI thread text)
│   └── GameOverModal.tsx        ← Game Over card with Revive + Double Shards ad hooks
├── src/screens/
│   └── StartScreen.tsx          ← Title screen with high score + shard bank
├── src/services/
│   ├── sound.ts                 ← Crash-proof expo-av wrapper + expo-haptics
│   ├── ads.ts                   ← Crash-proof Google Mobile Ads manager (native + mock)
│   └── storage.ts               ← AsyncStorage wrapper for wallet + high score
├── assets/sounds/              ← CC0 WAV sound effects (synthesized, see scripts/generate-sounds.js)
└── scripts/generate-sounds.js  ← Node script that synthesizes the 4 CC0 sound effects
```

### State layers

| Layer | Where | Thread | Purpose |
|-------|-------|--------|---------|
| **Game loop** | `useOrbitEngine.ts` → `useFrameCallback` | Reanimated UI thread | Per-frame motion: θ, ω, radius spring, spawning, collision, scoring |
| **Render** | `OrbitCanvas.tsx` → `useAnimatedStyle` | Reanimated UI thread | Translates SharedValues → view transforms (no React re-render) |
| **HUD text** | `ScoreHUD.tsx` → `useAnimatedProps` | Reanimated UI thread | Displays score/combo/shards as text via TextInput (no JS bridge) |
| **Screen routing** | `App.tsx` → `useState<Screen>` | JS thread | Discrete state: idle / playing / over (changes only on events) |
| **Persistence** | `storage.ts` → AsyncStorage | JS thread (async) | Shard wallet + high score (committed on game over) |

### SharedValues (engine → canvas)

All continuous values are `SharedValue<number>` and live on the UI thread:

| SharedValue | Type | Meaning |
|-------------|------|---------|
| `theta` | number | Player angular position (radians, 0–2π) |
| `radius` | number | Current player track radius (springs between R_in and R_out) |
| `omega` | number | Angular velocity (rad/s), starts 2.4, caps 4.5 |
| `score` | number | Accumulated score (dt × 10 + event bonuses) |
| `combo` | number | Near-miss combo multiplier |
| `shards` | number | Shards collected this run |
| `shakeX` / `shakeY` | number | Screen shake offset (decays ×0.85/frame) |
| `nearMissPulse` | number | 0→1 pulse for purple plasma ring (decays over 0.5s) |
| `gameState` | number | 0=idle, 1=playing, 2=over (UI-thread authoritative) |
| `center` | {x,y} | Screen center for polar→cartesian conversion |
| `hazardAngle[N]` | number | Angular position of hazard i (−999 = inactive) |
| `hazardTrack[N]` | number | 0=inside, 1=outside |
| `hazardActive[N]` | number | 1=active, 0=inactive |
| `hazardPassed[N]` | number | 1=already scored as near-miss (prevents double-counting) |
| `shardAngle[N]` | number | Angular position of shard i |
| `shardTrack[N]` | number | 0=inside, 1=outside |
| `shardActive[N]` | number | 1=active, 0=collected/inactive |

Pool size: `POOL_SIZE = 24` (hazards + shards each). Object pooling avoids
per-frame allocations on the UI thread.

---

## 2. Game Loop & Math Spec

### Coordinate system (polar, radians)

```
centerX = screenWidth  / 2
centerY = screenHeight / 2

x = centerX + r · cos(θ)
y = centerY + r · sin(θ)

R      = 115 px  (base track radius)
R_in   = R − 26 = 89 px   (inside track)
R_out  = R + 26 = 141 px  (outside track)
```

### Player controls

- **Tap anywhere** → toggle `playerTrack` between `'inside'` and `'outside'`.
- Radius transition: `withSpring(targetRadius, { damping: 14, stiffness: 220 })`.
- The spring runs on the UI thread; the JS thread only fires the toggle.

### Angular velocity (difficulty ramp)

```
ω₀     = 2.4 rad/s   (start)
ω_step = +5% per 10s of survival
ω_max  = 4.5 rad/s   (hard cap)
```

Implementation: `survivalTime` accumulates dt; every 10s, `omega *= 1.05`
(capped at 4.5). The spawn interval also shrinks as ω increases:
`spawnInterval = max(0.45, 0.9 − (ω − ω₀) × 0.12)`.

### Hazard spawning

- Hazards spawn at `θ_player + LEAD_ANGLE` (LEAD_ANGLE = 1.4 rad ≈ 80°).
- Minimum angular gap between consecutive hazards: 60° (enforced by spawn
  interval, not by explicit angular check — the interval is tuned so that at
  max ω, hazards are ≥60° apart).
- Each hazard randomly attaches to inside (track=0) or outside (track=1).
- 50% chance per spawn to also drop a shard on the **opposite** track.

### Hitbox thresholds

| Event | Condition | Effect |
|-------|-----------|--------|
| **Collision** | `|Δθ| < 8°` AND same track | Game Over, crash haptic, screen shake |
| **Near-miss** | `|Δθ| < 14°` AND opposite track | +50 score, combo++, purple pulse, heavy haptic, screen shake |
| **Shard pickup** | `|Δθ| < 10°` AND same track | +10 score, +1 shard, medium haptic |

Angular difference is computed via shortest-arc:
```
Δθ = ((θ_a − θ_b + π) mod 2π) − π
```

### Player trail

3 ghost orbs trail the player at angular offsets 5°, 10°, 15° behind, with
opacities 0.5, 0.3, 0.15. Rendered as semi-transparent cyan circles.

### Screen shake

On near-miss and crash, `shakeX`/`shakeY` are set to `±6px` (random), then
decay by `×0.85` per frame. The root `<Animated.View>` applies the offset via
`useAnimatedStyle`.

---

## 3. Monetization & Ad State Machine

### Modes

| Mode | When | Behavior |
|------|------|----------|
| `native` | Dev build / standalone (native binary present) | Real AdMob rewarded video via `RewardedAd.createForAdRequest(TestIds.REWARDED)` |
| `mock` | Expo Go / no native binary | Transparent countdown overlay "Simulating Rewarded Ad (2s)..." → `onRewarded()` after 2s |

### Detection (`detectAdMode()`)

1. Attempt `import('react-native-google-mobile-ads')`.
2. If import fails → `mode = 'mock'`.
3. If import succeeds, attempt `RewardedAd.createForAdRequest(TestIds.REWARDED)`.
4. If creation throws → `mode = 'mock'`.
5. Otherwise → `mode = 'native'`.

The result is cached; `detectAdMode()` only runs once per app lifetime.

### Native ad lifecycle

```
loadRewardedAd()
  └→ RewardedAd.createForAdRequest(TestIds.REWARDED)
       .addAdEventListener(LOADED, () => adLoaded = true)
       .addAdEventListener(ERROR,  () => adLoaded = false)
       .load()

showRewardedAd(opts)
  ├─ if mode === 'mock' → runMockAd(opts)
  ├─ if adLoaded → rewardedAd.show()
  │    ├─ EARNED_REWARD → opts.onRewarded(reward)
  │    ├─ CLOSED        → opts.onClosed(), loadRewardedAd() (preload next)
  │    └─ ERROR         → fallback to runMockAd(opts)
  └─ if !adLoaded → loadRewardedAd() + runMockAd(opts) (graceful fallback)
```

### Mock ad overlay

`setMockAdRenderer(fn)` registers a UI callback. `runMockAd()` calls
`fn(true, secondsLeft)` every second for 2 seconds, then `fn(false, 0)` and
invokes `onRewarded()`. The `GameOverModal` component registers this callback
to show the countdown card.

### Monetization hooks (GameOverModal)

| Button | Condition | Ad reward | Game effect |
|--------|-----------|-----------|-------------|
| 🎬 Revive Run (1 Left) | `!reviveUsed` | Rewarded ad | Clears hazards within 180° of player, resumes run. Once per run. |
| 💎 Double Shards (2x) | `!doubleShardsUsed && shards > 0` | Rewarded ad | `shards *= 2`. Once per run. |
| ↻ Retry | Always | No ad | `engine.start()` (fresh run) |
| ⌂ Home | Always | No ad | Returns to idle screen |

### Persistence

- **Shard wallet**: `addToWallet(runShards)` on game over → AsyncStorage key `orbit_rush.wallet`.
- **High score**: `saveHighScore(score)` on game over → AsyncStorage key `orbit_rush.high_score`.

---

## 4. Audio & Haptics

### Sound files (CC0, synthesized)

All 4 sound effects are generated by `scripts/generate-sounds.js` as RIFF WAV
files (44.1 kHz, 16-bit mono). They are released to the public domain (CC0),
in the spirit of Kenney.nl asset packs.

| File | Description |
|------|-------------|
| `switch.wav` | Soft click/blip (880→1100 Hz sine, 0.12s) |
| `shard.wav` | High chime (1318 + 1760 Hz bell, 0.3s) |
| `nearmiss.wav` | Woosh/riser (filtered noise sweep + rising tone, 0.4s) |
| `crash.wav` | Deep bass thud (110→45 Hz sine + noise burst, 0.5s) |

To regenerate: `node scripts/generate-sounds.js`

### Crash-proof audio wrapper (`sound.ts`)

- `expo-av` is loaded lazily via dynamic `import()`.
- If the module is missing or `Sound.createAsync` throws, `avAvailable` is set
  to `false` and all subsequent `play()` calls return silently.
- Every playback call is wrapped in try/catch — no red screen, ever.
- The `Feedback` object bundles sound + haptic for each game event:

| Event | Sound | Haptic |
|-------|-------|--------|
| Track switch | `switch.wav` | `ImpactFeedbackStyle.Light` |
| Shard pickup | `shard.wav` | `ImpactFeedbackStyle.Medium` |
| Near-miss | `nearmiss.wav` | `ImpactFeedbackStyle.Heavy` |
| Crash | `crash.wav` | `NotificationFeedbackType.Error` |

---

## 5. Operational Guidelines for Future Agents

### STRICT commit rule

> **NEVER** append `Co-authored-by:`, `Authored-by:`, `Generated with`, or any
> bot signature trailer to any git commit. Every commit must be authored
> **solely** by **Aditya Jain** (`jaditya700@gmail.com`).

Git identity is pre-configured in `.git/config`. Do not change it.

### Animation rule

> **NEVER** use JS `setInterval`, `requestAnimationFrame`, or React state
> updates (`useState`/`setState`) for continuous per-frame animation. All
> continuous motion MUST run on the Reanimated UI thread via
> `useFrameCallback` (logic) and `useAnimatedStyle` / `useAnimatedProps`
> (rendering). React state is only for discrete events (screen changes,
> game-over commit, modal visibility).

### Expo Go rule

> **NEVER** introduce an unmocked native module that crashes standard Expo Go.
> Any new native dependency must either:
> 1. Be safe in Expo Go (JS-only or gracefully degrades), OR
> 2. Be wrapped in a try/catch with a mock fallback (see `ads.ts` and
>    `sound.ts` for the pattern).

### Code style

- TypeScript strict mode is ON (`tsconfig.json` → `"strict": true`).
- `npx tsc --noEmit` MUST pass with zero errors before any commit.
- Do NOT add or remove comments unless explicitly asked.
- Follow existing naming: `PascalCase` for components/types, `camelCase` for
  functions/variables, `UPPER_SNAKE` for constants.
- Keep the UI thread worklet-free of JS-only APIs (no `console.log`, no
  `Date.now()`, no React imports inside `'worklet'` functions).

### Adding new game events

1. Add a `SharedValue` in `useOrbitEngine.ts` if it needs per-frame updates.
2. Add the event logic inside the `useFrameCallback` worklet.
3. If the event needs JS-side side effects (sound, haptic, storage), use
   `runOnJS(handler)`.
4. Add the visual in `OrbitCanvas.tsx` via `useAnimatedStyle`.
5. Add the sound in `sound.ts` and bundle it in `Feedback`.

---

## 6. Command Cheat Sheet

### Development

```bash
# Start Expo dev server (Expo Go or dev build)
npm start
# or: npx expo start

# Start with cache cleared (use if Metro acts up)
npx expo start --clear
# or: npx expo start -c

# Run on Android / iOS / Web
npm run android
npm run ios
npm run web
```

### Linting & Type Checking

```bash
# TypeScript type check (MUST pass with zero errors)
npx tsc --noEmit

# Clear Metro cache
npx expo start --clear

# Clear npm cache (nuclear option)
rm -rf node_modules && npm install
```

### EAS Builds (production)

```bash
# Install EAS CLI
npm install -g eas-cli

# Log in to Expo
eas login

# Configure EAS
eas build:configure

# Build for Android (APK)
eas build --platform android --profile preview

# Build for Android (AAB for Play Store)
eas build --platform android --profile production

# Build for iOS
eas build --platform ios --profile production

# Submit to stores
eas submit --platform android
eas submit --platform ios
```

### Sound regeneration

```bash
node scripts/generate-sounds.js
```

### Git

```bash
# Stage and commit (NEVER add co-author trailers)
git add .
git commit -m "feat: <description>"

# Push to remote
git push origin main
```

---

## 7. AdMob Configuration

The `app.json` plugins array configures `react-native-google-mobile-ads` with
**Google's official test app IDs**:

- **Android**: `ca-app-pub-3940256099942544~3347511713`
- **iOS**: `ca-app-pub-3940256099942544~1458002511`

These test IDs are safe for development and will not generate real revenue.
**Before publishing to production**, replace them with your own AdMob app IDs
from the AdMob console, and replace `TestIds.REWARDED` in `ads.ts` with your
own rewarded ad unit ID.

> ⚠️ Never ship with test IDs in production — Google may suspend your account.

---

## 8. Asset Credits

| Asset | Source | License |
|-------|--------|---------|
| Orbitron font | Google Fonts (`@expo-google-fonts/orbitron`) | SIL Open Font License 1.1 |
| Rajdhani font | Google Fonts (`@expo-google-fonts/rajdhani`) | SIL Open Font License 1.1 |
| Sound effects | Synthesized via `scripts/generate-sounds.js` | CC0 1.0 (Public Domain) |
| Icon/splash | Expo default template assets | Replace before production |

---

## 9. Known Limitations

1. **expo-av is deprecated** — it's used because its `Audio.Sound` API is the
   most stable across Expo Go versions. If migrating to `expo-audio`, wrap it
   with the same crash-proof pattern in `sound.ts`.
2. **Mock ads in Expo Go** — real AdMob rewarded video requires a dev build or
   standalone build. Expo Go cannot load native ad modules.
3. **No background music** — only SFX are included. Add a looping ambient
   track via `expo-av` if desired (follow the same try/catch pattern).
4. **Trail rendering** — ghost orbs use simple opacity decay. For a smoother
   trail, consider a Skia canvas path (would require `@shopify/react-native-skia`).
