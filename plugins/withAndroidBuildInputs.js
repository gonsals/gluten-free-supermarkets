const { withAppBuildGradle } = require('expo/config-plugins');

module.exports = function withAndroidBuildInputs(config) {
  return withAppBuildGradle(config, (next) => {
    if (next.modResults.language !== 'groovy')
      throw new Error('Android build input configuration requires the Expo Groovy template.');
    const marker = '// SinGluten: bounded bundle inputs and workers (v1)';
    if (!next.modResults.contents.includes(marker)) {
      next.modResults.contents += `
${marker}
tasks.withType(com.facebook.react.tasks.BundleHermesCTask).configureEach {
    sources.exclude('**/node_modules-sdk52/**', '**/artifacts/**', '**/dist/**', '**/test-results/**', '**/coverage/**', '**/functions/lib/**')
    extraPackagerArgs.addAll(['--max-workers', '2'])
}
`;
    }
    return next;
  });
};
