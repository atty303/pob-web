import * as path from "@std/path";
import { reactRouter } from "@react-router/dev/vite";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { createHash } from "node:crypto";
import { defineConfig, normalizePath, searchForWorkspaceRoot } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";
import { wranglerDev } from "./wrangler-dev.ts";
import { diagnosticsDevPlugin } from "./diagnostics-dev.ts";
import { POB_SENTRY_APPLICATION_KEY } from "./sentry.config.ts";

const packageDir = path.dirname(path.fromFileUrl(import.meta.url));
const rootDir = path.resolve(packageDir, "../..");
const packerR2Dir = path.resolve(packageDir, "../packer/r2");
const appVersion = Deno.readTextFileSync(path.join(rootDir, "version.txt")).trim();
const dependencyHash = createHash("sha256")
  .update(Deno.readTextFileSync(path.join(rootDir, "deno.lock")))
  .digest("hex")
  .slice(0, 12);

// https://vitejs.dev/config/
export default defineConfig(({ mode, isSsrBuild }) => {
  const productionClient = mode === "production" && !isSsrBuild;
  const usePobCoolAsset = mode === "development" && Deno.env.get("POB_COOL_ASSET") === "true";
  const publicDev = mode === "development" && Deno.env.get("PUBLIC_DEV_SERVER") === "true";
  const renderingMax = mode === "development" && Deno.env.has("POB_RENDERING_MAX")
    ? Number(Deno.env.get("POB_RENDERING_MAX"))
    : undefined;
  if (renderingMax !== undefined && (!Number.isInteger(renderingMax) || renderingMax <= 0)) {
    throw new Error("POB_RENDERING_MAX must be a positive integer");
  }

  return {
    cacheDir: path.join(packageDir, "node_modules", `.vite-${dependencyHash}`),
    resolve: {
      dedupe: ["react", "react-dom"],
      alias: {
        ...(mode === "development" ? {} : {
          "./runtime-diagnostics-dev.ts": path.join(
            packageDir,
            "src/lib/runtime-diagnostics-disabled.ts",
          ),
        }),
        dds: path.join(rootDir, "packages/dds/src/index.ts"),
        "pob-driver/driver": path.join(rootDir, "packages/driver/src/js/driver.ts"),
        "pob-driver/error": path.join(rootDir, "packages/driver/src/js/error.ts"),
        "pob-driver/renderer": path.join(rootDir, "packages/driver/src/js/renderer/index.ts"),
        "pob-game": path.join(rootDir, "packages/game/src/index.ts"),
      },
    },
    server: {
      host: true,
      proxy: {
        "/api": "http://localhost:8788",
        ...(usePobCoolAsset
          ? {
            "/__pob_asset": {
              target: "https://asset.pob.cool",
              changeOrigin: true,
              rewrite: (path) => path.replace(/^\/__pob_asset/, ""),
            },
          }
          : {}),
      },
      sourcemapIgnoreList(file) {
        return file.includes("node_modules") || file.includes("logger.ts");
      },
      fs: {
        allow: [searchForWorkspaceRoot(Deno.cwd()), rootDir],
      },
      // Owner's Cloudflare Tunnel domain for mobile testing
      allowedHosts: [
        "local.pob.cool",
        ...(publicDev ? [".pinggy.link", ".pinggy-free.link", ".free.pinggy.net"] : []),
      ],
      ...(publicDev
        ? {
          host: "127.0.0.1",
          port: Number(Deno.env.get("PUBLIC_DEV_PORT") ?? "4173"),
          strictPort: true,
          hmr: { protocol: "wss", clientPort: 443 },
        }
        : {}),
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    },
    build: {
      chunkSizeWarningLimit: 1024,
      sourcemap: true,
      ssr: false,
    },
    define: {
      __BPTC_SUPPORT_OVERRIDE__: Deno.env.get("BPTC_SUPPORT_OVERRIDE") === "false" ? "false" : "undefined",
      __MAX_RENDERING_DIMENSION_OVERRIDE__: renderingMax === undefined ? "undefined" : JSON.stringify(renderingMax),
      APP_VERSION: JSON.stringify(appVersion),
      __SENTRY_RELEASE__: Deno.env.get("VITE_SENTRY_RELEASE") === undefined
        ? "undefined"
        : JSON.stringify(Deno.env.get("VITE_SENTRY_RELEASE")),
      __VERSION_URL__: JSON.stringify(
        mode === "test" || (mode === "development" && !usePobCoolAsset)
          ? `/@fs/${rootDir}/version.json`
          : usePobCoolAsset
          ? "/__pob_asset/version.json"
          : "https://asset.pob.cool/version.json",
      ),
      __ASSET_PREFIX__: JSON.stringify(
        mode === "test"
          ? `/@fs/${packerR2Dir}`
          : mode === "development" && !usePobCoolAsset
          ? `/@fs/${packerR2Dir}`
          : usePobCoolAsset
          ? "/__pob_asset"
          : "https://asset.pob.cool",
      ),
    },
    worker: {
      format: "es",
      plugins: () => productionClient ? [sentryApplicationKeyPlugin()] : [],
    },
    ssr: {
      optimizeDeps: {
        exclude: ["react"],
      },
    },
    optimizeDeps: {
      exclude: ["@bokuweb/zstd-wasm"],
      include: [
        "@auth0/auth0-react",
        "@heroicons/react/24/solid",
        "@sentry/react",
        "@sentry/wasm",
        "@zenfs/archives",
        "@zenfs/core",
        "@zenfs/dom",
        "comlink",
        "dayjs",
        "dayjs/plugin/localeData",
        "dayjs/plugin/localizedFormat",
        "dayjs/plugin/utc",
        "isbot",
        "jose",
        "missionlog",
        "react",
        "react-dom",
        "react-dom/server.browser",
        "react-icons/ci",
        "react-icons/hi2",
        "react-icons/md",
        "react-icons/pi",
        "react-use",
      ],
      esbuildOptions: {
        target: "es2020",
      },
    },
    plugins: [
      ...(mode === "development" ? [diagnosticsDevPlugin()] : []),
      {
        name: "cross-origin-isolation",
        configureServer(server) {
          server.middlewares.use((request, response, next) => {
            const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
            if (pathname !== "/auth/poe-popup") {
              response.setHeader("Cross-Origin-Opener-Policy", "same-origin");
              response.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
            }
            next();
          });
        },
      },
      ...(mode === "development" ? [wranglerDev()] : []),
      reactRouter(),
      tailwindcss(),
      ...(!isSsrBuild
        ? [
          viteStaticCopy({
            targets: [
              {
                src: normalizePath(path.join(rootDir, "packages/driver/dist/debug/*")),
                dest: "dist/debug/",
              },
              {
                src: normalizePath(path.join(rootDir, "packages/driver/dist/release/!(*.debug.wasm)")),
                dest: "dist/release/",
              },
              {
                src: normalizePath(path.join(rootDir, "node_modules/texture2ddecoder-wasm/wasm/*")),
                dest: "texture2ddecoder/",
              },
            ],
          }),
        ]
        : []),
      ...(productionClient ? [sentryApplicationKeyPlugin()] : []),
    ],
  };
});

function sentryApplicationKeyPlugin() {
  return sentryVitePlugin({
    applicationKey: POB_SENTRY_APPLICATION_KEY,
    // An empty name prevents the plugin from inferring a Git release. Release
    // metadata and source maps remain owned by the existing sentry-cli tasks.
    release: { name: "" },
    sourcemaps: { disable: true },
  });
}
