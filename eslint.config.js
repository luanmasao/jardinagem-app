// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // Pastas geradas, nativas ou que não contêm código do app.
    ignores: [
      'android/*',
      'ios/*',
      '.expo/*',
      'dist/*',
      'web-build/*',
      'scratch/*',
      'supabase/*',
      'expo-env.d.ts',
    ],
  },
  {
    // Regra pensada para o React Compiler, que não está ativo no projeto. Os casos atuais são o
    // padrão de carregar dados no useEffect; ficam visíveis como aviso, sem bloquear o lint.
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
  {
    // Configuração do Expo, executada pelo Node.js (não pelo app).
    files: ['app.config.js'],
    languageOptions: {
      globals: { __dirname: 'readonly' },
    },
  },
]);
