const { defineConfig } = require('eslint/config');
const { fixupConfigRules } = require('@eslint/compat');
const expo = require('eslint-config-expo/flat');

module.exports = defineConfig([
  // Keep Expo's plugin rules working with the APIs removed in ESLint 10.
  ...fixupConfigRules(expo),
  {
    ignores: [
      'dist/**',
      '.expo/**',
      'node_modules-sdk52/**',
      'coverage/**',
      'test-results/**',
      'playwright-report/**',
      'functions/lib/**',
      'tests/cloud/generated.cjs',
      'android/**',
      'ios/**',
    ],
  },
  { files: ['**/*.ts', '**/*.tsx'], rules: { '@typescript-eslint/no-explicit-any': 'error' } },
  { rules: { 'no-console': ['error', { allow: ['warn', 'error'] }] } },
]);
