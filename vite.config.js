import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    define: {
      'process.env.OPENROUTER_KEY': JSON.stringify(env.OPENROUTER_KEY),
      'process.env.MODEL_ID': JSON.stringify(env.MODEL_ID),
    },
  };
});