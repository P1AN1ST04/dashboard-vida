/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  /** URL del proyecto Supabase (ej: https://tcpbqfzclmzhujjsifgc.supabase.co) */
  readonly VITE_SUPABASE_URL?: string;
  /** Clave anon/public del proyecto Supabase. NUNCA la service_role. */
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "*.css" {
  const content: string;
  export default content;
}

declare module "*.png" {
  const src: string;
  export default src;
}

declare module "*.svg" {
  const src: string;
  export default src;
}

declare module "*.json" {
  const value: unknown;
  export default value;
}
