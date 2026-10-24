const expoConfig = require('eslint-config-expo/flat');

module.exports = [
  ...expoConfig,
  { ignores: ['node_modules/**', 'android/**', 'ios/**', '.expo/**', 'dist/**'] },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': 'error',
    },
  },
];
