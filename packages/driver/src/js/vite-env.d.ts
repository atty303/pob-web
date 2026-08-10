/// <reference types="vite/client" />
declare const __ASSET_PREFIX__: string;

declare const __RUN_GAME__: string;
declare const __RUN_VERSION__: string;
declare const __RUN_BUILD__: "release" | "debug";

type PoBTestState = {
  started: boolean;
  frameCount: number;
  renderStats: import("./overlay/index.ts").RenderStats | null;
  title: string;
  errors: string[];
  frameSamples: { totalTime: number; rendererTime: number }[];
  resetFrameSamples: () => void;
  loadBuildFromCode?: (code: string) => Promise<void>;
  getBuildCode?: () => Promise<string>;
};

interface Window {
  __POB_TEST__?: PoBTestState;
}
