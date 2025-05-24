/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEBUG_MODE?: string;
  readonly VITE_AUTO_SCROLL_CAMERA?: string;
  readonly VITE_CAMERA_SCROLL_SPEED?: string;
  readonly VITE_INSTANT_DEATH_MODE?: string;
  // Add other environment variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}