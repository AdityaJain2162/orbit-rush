/**
 * withKotlinVersion.js — Expo config plugin that bumps the Kotlin version
 * in the generated `android/build.gradle` so that native modules compiled
 * with a newer Kotlin (e.g. play-services-ads 25.4.0 → Kotlin 2.3.0) can
 * be consumed by the React Native 0.86 / Expo SDK 57 build (default Kotlin
 * 2.1.20).
 *
 * Without this override, `:react-native-google-mobile-ads:compileReleaseKotlin`
 * fails with "Module was compiled with an incompatible version of Kotlin.
 * The binary version of its metadata is 2.3.0, expected version is 2.1.0."
 *
 * The RN 0.86 template's build.gradle declares the kotlin-gradle-plugin
 * classpath WITHOUT a version (the version comes from the react-native
 * gradle plugin's version catalog, pinned to 2.1.20). We override it by
 * appending an explicit version to the classpath declaration AND setting
 * kotlinVersion in buildscript.ext so that expo-modules-core picks it up.
 */
const { withProjectBuildGradle } = require('@expo/config-plugins');

const KOTLIN_VERSION = '2.3.0';

module.exports = function withKotlinVersion(config) {
  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.language !== 'groovy') {
      return config;
    }
    let buildGradle = config.modResults.contents;

    // 1. Add an explicit version to the kotlin-gradle-plugin classpath.
    //    The template has: classpath('org.jetbrains.kotlin:kotlin-gradle-plugin')
    //    We change it to:  classpath('org.jetbrains.kotlin:kotlin-gradle-plugin:2.3.0')
    buildGradle = buildGradle.replace(
      /classpath\(['"]org\.jetbrains\.kotlin:kotlin-gradle-plugin['"]\)(?!\d)/,
      `classpath('org.jetbrains.kotlin:kotlin-gradle-plugin:${KOTLIN_VERSION}')`,
    );

    // 2. Set kotlinVersion in buildscript.ext so expo-modules-core uses it.
    //    The template has no ext block in buildscript, so we add one.
    if (!/ext\s*\{/.test(buildGradle.split(/allprojects/)[0])) {
      // No ext block in buildscript — inject one right after `buildscript {`
      buildGradle = buildGradle.replace(
        /buildscript\s*{\s*\n/,
        `buildscript {
    ext {
        kotlinVersion = "${KOTLIN_VERSION}"
    }\n`,
      );
    } else if (!/kotlinVersion\s*=/.test(buildGradle)) {
      // ext block exists but no kotlinVersion — add it.
      buildGradle = buildGradle.replace(
        /buildscript\s*{\s*ext\s*{/,
        `buildscript {
    ext {
        kotlinVersion = "${KOTLIN_VERSION}"`,
      );
    } else {
      // Replace existing kotlinVersion value.
      buildGradle = buildGradle.replace(
        /kotlinVersion\s*=\s*"[^"]*"/,
        `kotlinVersion = "${KOTLIN_VERSION}"`,
      );
    }

    config.modResults.contents = buildGradle;
    return config;
  });
};
