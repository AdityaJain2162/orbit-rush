/**
 * withNoBackup — Expo config plugin that disables Android Auto Backup.
 *
 * Android 6+ automatically backs up app data (including AsyncStorage) to
 * Google Drive and restores it on reinstall. This means high scores and
 * shard wallets survive uninstall/reinstall, which is undesirable for a
 * game (fresh install should start at zero). Setting `allowBackup="false"`
 * in the AndroidManifest prevents this.
 */
const { withAndroidManifest } = require('expo/config-plugins');

module.exports = function withNoBackup(config) {
  return withAndroidManifest(config, (manifest) => {
    const application = manifest.modResults.manifest.application;
    if (application && application.length > 0) {
      application[0].$['android:allowBackup'] = 'false';
      application[0].$['android:fullBackupContent'] = 'false';
      application[0].$['android:dataExtractionRules'] = 'false';
    }
    return manifest;
  });
};
