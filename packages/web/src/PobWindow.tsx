import { useAuth0 } from "@auth0/auth0-react";
import { Driver } from "pob-driver/src/js/driver.ts";
import { useCallback, useEffect, useRef, useState } from "react";
import { useFullscreen, useHash } from "react-use";
import { useRecoilState } from "recoil";
import { log, tag } from "./logger.ts";
import { isFullscreenState } from "./state.ts";

export default function PobWindow(props: {
  version: string;
  onFrame: (render: boolean, time: number) => void;
  onTitleChange: (title: string) => void;
}) {
  const auth0 = useAuth0();

  const container = useRef<HTMLDivElement>(null);

  const [isFullscreen, setFullscreen] = useRecoilState(isFullscreenState);
  useFullscreen(container, isFullscreen, { onClose: () => setFullscreen(false) });

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
    }
  }, [hash]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>();
  useEffect(() => {
    log.debug(tag.pob, "loading version", props.version);

    const _driver = new Driver("release", `${__ASSET_PREFIX__}/v${props.version}`, {
      onError: (message) => {
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
          cloudflareKvPrefix: "/api/kv",
          cloudflareKvAccessToken: token,
        });
        log.debug(tag.pob, "started", container.current);
        if (buildCode) {
          log.info(tag.pob, "loading build from ", buildCode);
          await _driver.loadBuildFromCode(buildCode);
        }
        if (container.current) _driver.attachToDOM(container.current);
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
  }, [props.version, onFrame, onTitleChange, token, buildCode]);

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
