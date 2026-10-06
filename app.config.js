const fs = require('fs');
const path = require('path');

// Carrega .env.local nativamente no Node.js caso as variáveis ainda não estejam no ambiente
const envLocalPath = path.resolve(__dirname, '.env.local');
if (fs.existsSync(envLocalPath) && typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile(envLocalPath);
  } catch (_e) {
    // silencioso para não interromper se já estiver no ambiente
  }
}

module.exports = ({ config }) => {
  return {
    ...config,
    android: {
      ...config.android,
      package: 'com.jardinagem.app',
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '',
        },
      },
    },
  };
};
