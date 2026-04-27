import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const resolvedOpenRouterKey = env.OPENROUTER_KEY || env.OPENROUTER_API_KEY;

  return {
    define: {
      "process.env.OPENROUTER_KEY": JSON.stringify(resolvedOpenRouterKey),
      "process.env.OPENROUTER_API_KEY": JSON.stringify(resolvedOpenRouterKey),
      "process.env.MODEL_ID": JSON.stringify(env.MODEL_ID),
    },
  };
});
