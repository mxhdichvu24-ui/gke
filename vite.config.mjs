import { defineConfig, loadEnv } from 'vite';
import { generatePages } from './scripts/pages.mjs';
import {bootstrapPreview} from './server/bootstrap-preview.mjs';
import { apiMiddleware } from './scripts/local-api.mjs';

export default defineConfig(({ mode, command }) => {
  const env = {...loadEnv(mode, process.cwd(), ''), ...process.env};
  for (const key of ['GOOGLE_TRANSLATE_API_KEY','GKE_DEMO_RATES', 'GKE_QUOTE_INTAKE', 'SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'GKE_RATE_LIMIT_SECRET', 'GKE_ADMIN_USERNAME', 'GKE_ADMIN_EMAIL', 'GKE_ADMIN_PASSWORD_HASH', 'GKE_SESSION_SECRET']) {
    if (process.env[key] === undefined && env[key] !== undefined) process.env[key] = env[key];
  }
  if (command === 'serve') process.env.GKE_LOCAL_DEV = '1';
  const maps = generatePages(env);
  return {
    plugins: [{
      name: 'gke-local-api',
      async configureServer(server) { await bootstrapPreview(); server.middlewares.use(apiMiddleware); },
      configurePreviewServer(server) { server.middlewares.use(apiMiddleware); },
    }],
    build: { rollupOptions: { input: maps } },
  };
});
