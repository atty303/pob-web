import { useAuth0 } from "@auth0/auth0-react";
import * as Sentry from "@sentry/react";
import { Driver } from "pob-driver/driver";
import type { RenderStats } from "pob-driver/renderer";
import { type Game, gameData } from "pob-game";
import { useEffect, useRef, useState } from "react";
import * as use from "react-use";
import {
  collectDiagnosticReport,
  createDiagnosticReport,
  type DiagnosticReport,
  type ErrorPhase,
} from "../lib/error-report.ts";
import { log, tag } from "../lib/logger.ts";
import {
  authenticateWithPoe,
  authorizePoeWithRedirect,
  corsFetchPolicy,
  createPoeOAuthBridge,
} from "../lib/poe-oauth.ts";
import { registerSentryWorker } from "../lib/sentry.ts";
import ErrorDialog from "./ErrorDialog.tsx";

const { useHash } = use;
type FetchResult = Awaited<ReturnType<ConstructorParameters<typeof Driver>[2]["onFetch"]>>;

export default function PoBWindow(props: {
  game: Game;
  version: string;
  onFrame: (at: number, time: number, stats?: RenderStats) => void;
  onTitleChange: (title: string) => void;
  onLayerVisibilityCallbackReady?: (callback: (layer: number, sublayer: number, visible: boolean) => void) => void;
  toolbarComponent?: React.ComponentType<{ position: "top" | "bottom" | "left" | "right"; isLandscape: boolean }>;
  onDriverReady?: (driver: Driver | null) => void;
}) {
  const auth0 = useAuth0();
  const auth0Ref = useRef(auth0);
  const skipCloudTokenUpdateRef = useRef(false);
  auth0Ref.current = auth0;

  const container = useRef<HTMLDivElement>(null);
  const driverRef = useRef<Driver | null>(null);
  const onFrameRef = useRef(props.onFrame);
  const onTitleChangeRef = useRef(props.onTitleChange);
  const onLayerVisibilityCallbackReadyRef = useRef(props.onLayerVisibilityCallbackReady);
  const onDriverReadyRef = useRef(props.onDriverReady);

  onFrameRef.current = props.onFrame;
  onTitleChangeRef.current = props.onTitleChange;
  onLayerVisibilityCallbackReadyRef.current = props.onLayerVisibilityCallbackReady;
  onDriverReadyRef.current = props.onDriverReady;

  const [token, setToken] = useState<string>();
  useEffect(() => {
    async function getToken() {
      if (auth0.isAuthenticated) {
        if (skipCloudTokenUpdateRef.current) {
          skipCloudTokenUpdateRef.current = false;
          return;
        }
        const t = await auth0.getAccessTokenSilently();
        setToken(t);
      }
    }
    getToken();
  }, [auth0.getAccessTokenSilently, auth0.isAuthenticated]);

  const [hash, _setHash] = useHash();
  const [buildCode, setBuildCode] = useState("");
  useEffect(() => {
    if (hash.startsWith("#build=")) {
      const code = hash.slice("#build=".length);
      setBuildCode(code);
    } else if (hash.startsWith("#=")) {
      const code = hash.slice("#=".length);
      setBuildCode(code);
    }
  }, [hash]);

  const [loading, setLoading] = useState(true);
  const [errorReport, setErrorReport] = useState<DiagnosticReport>();
  const [showErrorDialog, setShowErrorDialog] = useState(true);

  useEffect(() => {
    if (driverRef.current && props.toolbarComponent) {
      driverRef.current.setExternalToolbarComponent(props.toolbarComponent);
    }
  }, [props.toolbarComponent]);

  useEffect(() => {
    onDriverReadyRef.current?.(null);
    setErrorReport(undefined);
    const assetPrefix = `${__ASSET_PREFIX__}/games/${props.game}/versions/${props.version}`;
    const poeOAuthBridge = createPoeOAuthBridge(
      () => auth0Ref.current,
      async (forceAuthorization, timeoutMs) => {
        const skipCloudTokenUpdate = !auth0Ref.current.isAuthenticated;
        skipCloudTokenUpdateRef.current = skipCloudTokenUpdate;
        try {
          return await authenticateWithPoe(
            auth0Ref.current,
            forceAuthorization,
            (force) => authorizePoeWithRedirect(force, timeoutMs),
          );
        } catch (error) {
          if (skipCloudTokenUpdate) skipCloudTokenUpdateRef.current = false;
          throw error;
        }
      },
    );
    log.debug(tag.pob, "loading assets from", assetPrefix);

    const showError = (error: unknown, phase: ErrorPhase) => {
      const report = createDiagnosticReport({ error, phase, game: props.game, pobVersion: props.version });
      collectDiagnosticReport(report, {
        warn: (value) => log.warn(tag.pob, "Expected environment error", value),
        error: (value) => log.error(tag.pob, "Path of Building error", value),
        captureException: (exception, context) => {
          Sentry.withScope((scope) => {
            scope.setTag("pob.game", context.game);
            scope.setTag("pob.version", context.pobVersion);
            scope.setTag("pob.error_phase", context.phase);
            scope.setContext("pob.diagnostics", context);
            Sentry.captureException(exception);
          });
        },
      });
      setErrorReport(report);
      setShowErrorDialog(true);
    };

    const _driver = new Driver(
      "release",
      assetPrefix,
      {
        onError: (error) => {
          showError(error, "driver-runtime");
        },
        onFrame: (at, time, stats) => onFrameRef.current(at, time, stats),
        onFetch: async (url, headers, body) => {
          const oauthResponse = await poeOAuthBridge.exchange(url, body);
          if (oauthResponse) {
            return {
              body: oauthResponse,
              error: undefined,
              headers: { "content-type": "application/json" },
              status: 200,
            };
          }

          let rep: FetchResult | undefined;

          const corsPolicy = corsFetchPolicy(url, window.location.origin);
          if (corsPolicy) {
            try {
              const r = await fetch(url, {
                method: body ? "POST" : "GET",
                body,
                headers,
              });
              const directResult = {
                body: await r.text(),
                error: undefined,
                headers: Object.fromEntries(r.headers.entries()),
                status: r.status,
              };
              if (corsPolicy === "direct" || r.ok) {
                rep = directResult;
                log.debug(tag.pob, "CORS fetch complete", url, { status: rep.status });
              } else {
                log.warn(tag.pob, "CORS fetch failed, falling back to proxy", url, { status: r.status });
              }
            } catch (e) {
              log.warn(tag.pob, "CORS fetch error", e);
              if (corsPolicy === "direct") {
                rep = {
                  body: "",
                  error: e instanceof Error ? e.message : String(e),
                  headers: {},
                  status: undefined,
                };
              }
            }
          }

          if (!rep) {
            const r = await fetch("/api/fetch", {
              method: "POST",
              body: JSON.stringify({ url, headers, body }),
            });
            rep = (await r.json()) as FetchResult;
          }

          return rep;
        },
        onOAuthAuthorize: (authorizationUrl, timeoutMs) => poeOAuthBridge.authorize(authorizationUrl, timeoutMs),
        onOAuthLogout: () => {
          void auth0Ref.current.logout({ logoutParams: { returnTo: window.location.origin } });
        },
        onTitleChange: (title) => onTitleChangeRef.current(title),
      },
      { onWorkerCreated: registerSentryWorker },
    );

    driverRef.current = _driver;

    (async () => {
      let phase: ErrorPhase = "driver-start";
      try {
        await _driver.start({
          userDirectory: gameData[props.game].userDirectory,
          cloudflareKvPrefix: "/api/kv",
          cloudflareKvAccessToken: token,
          cloudflareKvUserNamespace: gameData[props.game].cloudflareKvNamespace,
        });
        log.debug(tag.pob, "started", container.current);
        if (buildCode) {
          phase = "build-load";
          log.info(tag.pob, "loading build from ", buildCode);
          await _driver.loadBuildFromCode(buildCode);
        }
        phase = "renderer-attach";
        if (container.current) await _driver.attachToDOM(container.current);

        if (props.toolbarComponent) {
          _driver.setExternalToolbarComponent(props.toolbarComponent);
        }

        onLayerVisibilityCallbackReadyRef.current?.((layer: number, sublayer: number, visible: boolean) => {
          _driver.setLayerVisible(layer, sublayer, visible);
        });

        onDriverReadyRef.current?.(_driver);

        setLoading(false);
      } catch (e) {
        showError(e, phase);
        setLoading(false);
      }
    })();

    return () => {
      _driver.detachFromDOM();
      _driver.destory();
      driverRef.current = null;
      onDriverReadyRef.current?.(null);
      setLoading(true);
    };
  }, [props.game, props.version, token, buildCode]);

  if (errorReport) {
    return (
      <>
        {showErrorDialog && (
          <ErrorDialog
            report={errorReport}
            onReload={() => window.location.reload()}
            onClose={() => setShowErrorDialog(false)}
          />
        )}
        <div
          ref={container}
          className={`w-full h-full border border-neutral focus:outline-none bg-black ${
            loading ? "rounded-none skeleton" : ""
          }`}
        />
      </>
    );
  }

  return (
    <div
      ref={container}
      className={`w-full h-full border border-neutral focus:outline-none bg-black ${
        loading ? "rounded-none skeleton" : ""
      }`}
    />
  );
}
