import { useAuth0 } from "@auth0/auth0-react";
import { Driver } from "pob-driver/src/js/driver";
import type { RenderStats } from "pob-driver/src/js/renderer";
import { type Game, gameData } from "pob-game/src";
import { useCallback, useEffect, useRef, useState } from "react";
import * as use from "react-use";
import { log, tag } from "../lib/logger";

const { useHash } = use;

export default function PoBWindow(props: {
  game: Game;
  version: string;
  onFrame: (at: number, time: number, stats?: RenderStats) => void;
  onTitleChange: (title: string) => void;
  onLayerVisibilityCallbackReady?: (callback: (layer: number, sublayer: number, visible: boolean) => void) => void;
}) {
  const auth0 = useAuth0();

  const container = useRef<HTMLDivElement>(null);

  const [token, setToken] = useState<string>();
  useEffect(() => {
    async function getToken() {
      if (auth0.isAuthenticated) {
        const t = await auth0.getAccessTokenSilently();
        setToken(t);
      }
    }
    getToken();
  }, [auth0, auth0.isAuthenticated]);

  const onFrame = useCallback(props.onFrame, []);
  const onTitleChange = useCallback(props.onTitleChange, []);

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
  const [error, setError] = useState<unknown>();

  useEffect(() => {
    const assetPrefix = `${__ASSET_PREFIX__}/games/${props.game}/versions/${props.version}`;
    log.debug(tag.pob, "loading assets from", assetPrefix);

    const _driver = new Driver("release", assetPrefix, {
      onError: message => {
        throw new Error(message);
      },
      onFrame,
      onFetch: async (url, headers, body) => {
        let rep = undefined;

        if (url.startsWith("https://pobb.in/")) {
          try {
            const r = await fetch(url, {
              method: body ? "POST" : "GET",
              body,
              headers,
            });
            if (r.ok) {
              rep = {
                body: await r.text(),
                headers: Object.fromEntries(r.headers.entries()),
                status: r.status,
              };
              log.debug(tag.pob, "CORS fetch success", url, rep);
            }
          } catch (e) {
            log.warn(tag.pob, "CORS fetch error", e);
          }
        }

        if (!rep) {
          const r = await fetch("/api/fetch", {
            method: "POST",
            body: JSON.stringify({ url, headers, body }),
          });
          rep = await r.json();
        }

        return rep;
      },
      onTitleChange,
    });

    (async () => {
      try {
        await _driver.start({
          userDirectory: gameData[props.game].userDirectory,
          cloudflareKvPrefix: "/api/kv",
          cloudflareKvAccessToken: token,
          cloudflareKvUserNamespace: gameData[props.game].cloudflareKvNamespace,
        });
        log.debug(tag.pob, "started", container.current);
        if (buildCode) {
          log.info(tag.pob, "loading build from ", buildCode);
          await _driver.loadBuildFromCode(buildCode);
        }
        if (container.current) _driver.attachToDOM(container.current);

        // Pass layer visibility control callback to parent
        props.onLayerVisibilityCallbackReady?.((layer: number, sublayer: number, visible: boolean) => {
          _driver.setLayerVisible(layer, sublayer, visible);
        });

        setLoading(false);
      } catch (e) {
        setError(e);
        setLoading(false);
      }
    })();

    return () => {
      _driver.detachFromDOM();
      _driver.destory();
      setLoading(true);
    };
  }, [props.game, props.version, onFrame, onTitleChange, props.onLayerVisibilityCallbackReady, token, buildCode]);

  if (error) {
    log.error(tag.pob, error);
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
