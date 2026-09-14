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
│   ├── OrbitCanvas.tsx         ← Pure UI-thread renderer (reads SharedValues, renders lanes/orbs/hazards/shards)
│   └── patterns.ts             ← 8 procedural pattern templates (zigzag, wallGap, tunnel, etc.)
├── src/components/
│   ├── NeonButton.tsx          ← Spring-pressable button with border glow + light haptic
│   ├── GlassModal.tsx          ← Blurred overlay card (Game Over / Revive)
│   ├── ScoreHUD.tsx            ← Top HUD: score/combo/shards via useAnimatedProps (UI thread text)
│   └── GameOverModal.tsx       ← Game Over card with Revive + Double Shards ad hooks
├── src/screens/
│   └── StartScreen.tsx         ← Title screen with high score + shard bank
├── src/services/
│   ├── sound.ts                ← Crash-proof expo-audio wrapper + expo-haptics
│   ├── ads.ts                  ← Crash-proof Google Mobile Ads manager (native + mock)
│   └── storage.ts              ← AsyncStorage wrapper for wallet + high score
├── assets/sounds/              ← CC0 WAV sound effects (synthesized, see scripts/generate-sounds.js)
└── scripts/generate-sounds.js  ← Node script that synthesizes the 4 CC0 sound effects
```

### State layers

| Layer | Where | Thread | Purpose |
|-------|-------|--------|---------|
| **Game loop** | `useOrbitEngine.ts` → `useFrameCallback` | Reanimated UI thread | Per-frame motion: scroll offset, speed, collision, scoring |
| **Pattern spawning** | `useOrbitEngine.ts` → `setInterval(50ms)` | JS thread | Discrete spawning events (reads SharedValues, writes to pools) |
| **Render** | `OrbitCanvas.tsx` → `useAnimatedStyle` | Reanimated UI thread | Translates SharedValues → view transforms (no React re-render) |
| **HUD text** | `ScoreHUD.tsx` → `useAnimatedProps` | Reanimated UI thread | Displays score/combo/shards as text via TextInput (no JS bridge) |
| **Screen routing** | `App.tsx` → `useState<Screen>` | JS thread | Discrete state: idle / playing / over (changes only on events) |
| **Persistence** | `storage.ts` → AsyncStorage | JS thread (async) | Shard wallet + high score (committed on game over) |

### SharedValues (engine → canvas)

All continuous values are `SharedValue<number>` and live on the UI thread:

| SharedValue | Type | Meaning |
|-------------|------|---------|
| `scrollOffset` | number | Total world-space pixels scrolled (increases over time) |
| `playerX` | number | Player X position (springs between lane X positions) |
| `playerLane` | number | Current lane: 0=left, 1=right |
| `speed` | number | Scroll speed in px/s, starts 320, caps 720 |
| `score` | number | Accumulated score (dt × 10 + event bonuses) |
| `combo` | number | Near-miss combo multiplier |
| `shards` | number | Shards collected this run |
| `shakeX` / `shakeY` | number | Screen shake offset (decays ×0.85/frame) |
| `nearMissPulse` | number | 0→1 pulse for purple plasma ring (decays over 0.5s) |
| `gameState` | number | 0=idle, 1=playing, 2=over (UI-thread authoritative) |
| `screenW` / `screenH` | number | Screen dimensions for coordinate calculations |
| `objWorldY[N]` | number | World-space Y of object i (−9999 = inactive) |
| `objLane[N]` | number | Lane of object i: 0=left, 1=right |
| `objType[N]` | number | 0=empty, 1=hazard, 2=shard |
| `objActive[N]` | number | 1=active, 0=inactive |
| `objPassed[N]` | number | 1=already scored as near-miss (prevents double-counting) |

Pool size: `POOL_SIZE = 48` (enough for the longest pattern + gap). Object
pooling avoids per-frame allocations.

---

## 2. Game Loop & Math Spec

### Coordinate system (linear, world-space)

```
screenW, screenH                 ← window dimensions
playerY = screenH × 0.75         ← fixed player Y (near bottom)
lane0X  = screenW × 0.33          ← left lane X
lane1X  = screenW × 0.67          ← right lane X

scrollOffset += speed × dt        ← world scrolls downward
screenY = worldY − scrollOffset   ← convert world → screen
```

### Player controls

- **Tap anywhere** → toggle `playerLane` between 0 (left) and 1 (right).
- X transition: `withSpring(targetX, { damping: 14, stiffness: 220 })`.
- The spring runs on the UI thread; the JS thread only fires the toggle.

### Scroll speed (difficulty ramp)

```
speed₀    = 200 px/s   (start)
speedStep = +5% per 10s of survival (continuous, applied per-frame)
speed_max = 680 px/s   (hard cap)
```

Implementation: every frame, `speed *= (1 + speedStep * dt / 10)`, capped at
`maxSpeed`. This produces a smooth, gradual ramp instead of step-wise jumps.

### Pattern system (`patterns.ts`)

8 procedural patterns, each a grid of rows × 2 lanes. Cell values:
- `0` = empty
- `1` = hazard
- `2` = shard

| Pattern | Rows | Description | Min Speed |
|---------|------|-------------|-----------|
| zigzag | 7 | Hazards alternate lanes, forcing rhythmic toggling | — |
| wallGap | 6 | Both lanes blocked except one gap per wall | 380 |
| alternating | 7 | Single hazards with shard rows between | — |
| tunnel | 6 | Narrow safe path that shifts lanes | 400 |
| diamond | 5 | Shard cluster with hazards on edges | — |
| doubleHazard | 5 | Both lanes blocked at different rows | 360 |
| corridor | 6 | Long safe stretch with shards, then hazard wall | — |
| pulse | 6 | Rapid alternating hazards (hard) | 450 |

Patterns with `minSpeed > currentSpeed` are filtered out. The engine picks
randomly from the available pool. Every pattern is guaranteed solvable — every
row with a hazard has at least one safe lane.

### Spawning

- The spawn loop runs on a 50ms JS `setInterval` (discrete events, NOT
  continuous animation).
- It reads `scrollOffset` and `screenH` SharedValues to check if a new row
  needs to appear at the top of the screen.
- Rows are spawned into the object pool at `worldY = scrollOffset + screenH + 50`.
- Row spacing: `GameGeometry.rowHeight = 120px`.
- Gap between patterns: `GameGeometry.patternGap = 80px`.

### Hitbox thresholds

| Event | Condition | Effect |
|-------|-----------|--------|
| **Collision** | `|screenY − playerY| < 28px` AND same lane | Game Over, crash haptic, screen shake |
| **Near-miss** | `|screenY − playerY| < 48px` AND opposite lane | +50 score, combo++, purple pulse, heavy haptic, screen shake |
| **Shard pickup** | `|screenY − playerY| < 35px` AND same lane | +10 score, +1 shard, medium haptic |

### Player trail

3 ghost orbs trail the player at Y offsets 20px, 40px, 60px behind, with
opacities 0.5, 0.3, 0.15. Rendered as semi-transparent cyan circles.

### Screen shake

On near-miss and crash, `shakeX`/`shakeY` are set to `±6px` (random), then
decay by `×0.85` per frame. The root `<Animated.View>` applies the offset via
`useAnimatedStyle`.

### Object recycling

Objects that scroll past the bottom of the screen (`screenY > screenH + 100`)
are deactivated (`objActive = 0`) and returned to the pool for reuse.

---

## 3. Monetization & Ad State Machine

### Modes

| Mode | When | Behavior |
|------|------|----------|
| `native` | Dev build / standalone (native binary present) | Real AdMob rewarded video via `RewardedAd.createForAdRequest(TestIds.REWARDED)` |
| `mock` | Expo Go / no native binary | Transparent countdown overlay "Simulating Rewarded Ad (2s)..." → `onRewarded()` after 2s |

### Detection (`detectAdMode()`)

1. Check `Constants.appOwnership === 'expo'` (from `expo-constants`).
2. If Expo Go → immediately return `'mock'` WITHOUT importing the ads module.
   This is critical: `react-native-google-mobile-ads` calls
   `TurboModuleRegistry.getEnforcing('RNGoogleMobileAdsModule')` at module-eval
   time, which throws in Expo Go. By never calling `import()`, the module
   factory is never evaluated.
3. If not Expo Go → attempt `import('react-native-google-mobile-ads')` and
   `RewardedAd.createForAdRequest(TestIds.REWARDED)`.
4. If creation throws → `'mock'`.

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
| 🎬 Revive Run (1 Left) | `!reviveUsed` | Rewarded ad | Clears hazards within 200px of player, resumes run. Once per run. |
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

- Uses `expo-audio` (SDK 57 replacement for `expo-av`). The `expo-av` native
  module `ExponentAV` is NOT in the Expo Go binary for SDK 57, which caused a
  crash. `expo-audio`'s `ExpoAudio` module IS included in Expo Go.
- `expo-audio` is loaded lazily via dynamic `import()`.
- If the module is missing or `createAudioPlayer` throws, `avAvailable` is set
  to `false` and all subsequent `play()` calls return silently.
- Every playback call is wrapped in try/catch — no red screen, ever.
- API: `createAudioPlayer({ uri })` → `player.play()` + `player.seekTo(0)`,
  `player.volume` property for volume control.

### Haptics

| Event | Sound | Haptic |
|-------|-------|--------|
| Lane switch | `switch.wav` | `ImpactFeedbackStyle.Light` |
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
> (rendering).
>
> **Exception**: The pattern spawn loop uses `setInterval(50ms)` — but this is
> for discrete spawning events (a few times per second), NOT continuous
> animation. The actual scroll motion, collision detection, and rendering
> all happen on the UI thread.

### Reanimated value-during-render rule

> **NEVER** read `.value` from a SharedValue during React component render.
> All `.value` reads must happen inside `useAnimatedStyle` / `useAnimatedProps`
> worklets or event handlers. Reading `.value` during render triggers
> Reanimated strict-mode warnings and can cause stale renders.
>
> For displaying SharedValues as text (e.g. score HUD), use
> `useAnimatedProps` with a `TextInput` — see `ScoreHUD.tsx` for the pattern.

### Expo Go rule

> **NEVER** introduce an unmocked native module that crashes standard Expo Go.
> Any new native dependency must either:
> 1. Be safe in Expo Go (JS-only or gracefully degrades), OR
> 2. Be wrapped in a try/catch with a mock fallback (see `ads.ts` and
>    `sound.ts` for the pattern), OR
> 3. Be skipped entirely in Expo Go via `Constants.appOwnership === 'expo'`
>    (see `ads.ts` for the pattern — this is required for modules that
>    throw at module-eval time like `react-native-google-mobile-ads`).

### Build-test-commit workflow

> **ALWAYS** build → test → commit for each feature or fix. Do not batch
> multiple features into a single commit. Run `npx tsc --noEmit` before every
> commit. Verify the bundle compiles with `npx expo start --clear` when
> changing native module dependencies.

### Code style

- TypeScript strict mode is ON (`tsconfig.json` → `"strict": true`).
- `npx tsc --noEmit` MUST pass with zero errors before any commit.
- Do NOT add or remove comments unless explicitly asked.
- Follow existing naming: `PascalCase` for components/types, `camelCase` for
  functions/variables, `UPPER_SNAKE` for constants.
- Keep the UI thread worklet-free of JS-only APIs (no `console.log`, no
  `Date.now()`, no React imports inside `'worklet'` functions).

### Adding new patterns

1. Add the pattern to `PATTERNS` in `patterns.ts` with a unique `name`.
2. Use cell values: `0`=empty, `1`=hazard, `2`=shard.
3. Ensure every row with a hazard has at least one safe lane.
4. Optionally set `minSpeed` to gate it behind difficulty.
5. The engine automatically picks from available patterns based on speed.

---

## 6. Command Cheat Sheet

### Development

```bash
# Start Expo dev server (ALWAYS use --clear after dependency changes)
npx expo start --clear
# or: npm start

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
```

### Testing Real Ads (requires dev build)

```bash
# Install EAS CLI
npm install -g eas-cli

# Build a development client (includes native ads module)
eas build --platform android --profile development

# OR build locally
npx expo run:android
```

### EAS Builds (production)

```bash
# Build for Android (APK)
eas build --platform android --profile preview

# Build for Android (AAB for Play Store)
eas build --platform android --profile production

# Build for iOS
eas build --platform ios --profile production
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

1. **Real ads require a dev build** — Expo Go cannot load native ad modules.
   The mock flow (2s countdown) is used in Expo Go.
2. **Pattern spawning uses setInterval** — this is for discrete spawning
   events, not continuous animation. The actual game loop (scroll, collision,
   rendering) runs on the Reanimated UI thread.
3. **No background music** — only SFX are included. Add a looping ambient
   track via `expo-audio` if desired (follow the same try/catch pattern).
4. **Trail rendering** — ghost orbs use simple opacity decay. For a smoother
   trail, consider a Skia canvas path (would require `@shopify/react-native-skia`).
