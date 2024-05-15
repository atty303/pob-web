import { useAuth0 } from "@auth0/auth0-react";
import { Driver } from "pob-driver/src/js/driver.ts";
import { useCallback, useEffect, useRef, useState } from "react";
import { log, tag } from "./logger.ts";

// const zipFs = await zenfs.resolveMountConfig({
// 	backend: Zip,
// 	zipData: await rootZip.arrayBuffer(),
// 	name: "root.zip",
// });
// if (zenfs.existsSync("/root")) {
// 	zenfs.umount("/root");
// }
// zenfs.mount("/root", zipFs);

// const browserFs = await zenfs.resolveMountConfig({
// 	backend: WebStorage,
// 	storage: localStorage,
// });
//
// if (zenfs.existsSync("/user")) {
// 	zenfs.umount("/user");
// }
// zenfs.mount("/user", browserFs);
// log.info(tag.vfs, "WebStorage is mounted");

// if (token) {
// 	const kvfs = await zenfs.resolveMountConfig({
// 		backend: KvFS,
// 		accessToken: token,
// 	});
//
// 	if (!zenfs.existsSync("/user/Path of Building"))
// 		zenfs.mkdirSync("/user/Path of Building");
// 	if (!zenfs.existsSync("/user/Path of Building/Builds")) {
// 		zenfs.mkdirSync("/user/Path of Building/Builds");
// 	}
// 	if (zenfs.existsSync("/user/Path of Building/Builds/Cloud")) {
// 		zenfs.umount("/user/Path of Building/Builds/Cloud");
// 	}
// 	zenfs.mount("/user/Path of Building/Builds/Cloud", kvfs);
// 	log.info(tag.vfs, "KvFS is mounted");
// }

export default function PobWindow(props: {
  version: string;
  onFrame: (render: boolean, time: number) => void;
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
        const rep = await fetch("/api/fetch", {
          method: "POST",
          body: JSON.stringify({ url, headers, body }),
        });
        return await rep.json();
      },
    });

    (async () => {
      try {
        await _driver.start({
          cloudflareKvPrefix: "/api/kv/",
          cloudflareKvAccessToken: token,
        });
        log.debug(tag.pob, "started", container.current);
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
  }, [props.version, onFrame, token]);

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
