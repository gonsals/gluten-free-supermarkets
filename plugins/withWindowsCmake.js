const { withProjectBuildGradle } = require('expo/config-plugins');

module.exports = function withWindowsCmake(config) {
  if (process.platform !== 'win32') return config;
  return withProjectBuildGradle(config, (next) => {
    const marker = '// SinGluten: Windows CMake paths (v4)';
    if (!next.modResults.contents.includes(marker)) {
      const block = `
${marker}
subprojects { child ->
  ['com.android.library', 'com.android.application'].each { androidPlugin ->
    child.plugins.withId(androidPlugin) {
      def androidConfig = child.extensions.findByName('android')
      androidConfig.defaultConfig.externalNativeBuild.cmake.arguments.add('-DCMAKE_OBJECT_PATH_MAX=240')
      def ninjaPath = System.getenv('SINGLUTEN_NINJA')
      if (ninjaPath) androidConfig.defaultConfig.externalNativeBuild.cmake.arguments.add('-DCMAKE_MAKE_PROGRAM=' + ninjaPath.replace('\\\\', '/'))
      def rootHash = Integer.toHexString(rootProject.projectDir.absolutePath.hashCode())
      def moduleHash = Integer.toHexString(child.name.hashCode())
      def stagingRoot = System.getenv('SINGLUTEN_CXX_ROOT') ?: new File(System.getProperty('java.io.tmpdir'), 'sg-cxx').absolutePath
      androidConfig.externalNativeBuild.cmake.buildStagingDirectory = new File(stagingRoot, rootHash + '/' + moduleHash)
    }
  }
}
`;
      next.modResults.contents = next.modResults.contents.replace(
        'apply plugin: "expo-root-project"',
        block + '\napply plugin: "expo-root-project"',
      );
    }
    return next;
  });
};
