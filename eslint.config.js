const { defineConfig } = require('eslint/config');
const expo = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expo,
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
