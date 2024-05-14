import { useAuth0 } from "@auth0/auth0-react";
import * as zenfs from "@zenfs/core";
import { PobDriver } from "pob-driver/src/main.ts";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAsync } from "react-use";
import { log, tag } from "./logger.ts";

class KvStore implements zenfs.AsyncStore {
	get name() {
		return "KvStore";
	}

	constructor(readonly accessToken: string | undefined) {}

	async clear(): Promise<void> {
		// throw new Error("Method not implemented.");
	}
	beginTransaction(): zenfs.AsyncTransaction {
		return new KvTransaction(this.accessToken);
	}
}

class KvTransaction implements zenfs.AsyncTransaction {
	constructor(readonly accessToken: string | undefined) {}

	async get(key: bigint): Promise<Uint8Array> {
		const r = await fetch(`/api/kv/${key}`, {
			method: "GET",
			headers: {
				Authorization: `Bearer ${this.accessToken}`,
			},
		});
		if (r.ok) {
			const blob = await r.blob();
			return new Uint8Array(await blob.arrayBuffer());
		}
		return undefined as any;
	}

	async put(
		key: bigint,
		data: Uint8Array,
		overwrite: boolean,
	): Promise<boolean> {
		const r = await fetch(`/api/kv/${key}?overwrite=${overwrite}`, {
			method: "PUT",
			body: data,
			headers: {
				Authorization: `Bearer ${this.accessToken}`,
			},
		});
		return r.status === 201;
	}

	async remove(key: bigint): Promise<void> {
		await fetch(`/api/kv/${key}`, {
			method: "DELETE",
			headers: {
				Authorization: `Bearer ${this.accessToken}`,
			},
		});
	}

	async commit(): Promise<void> {
		// throw new Error("Method not implemented.");
	}
	async abort(): Promise<void> {
		// throw new Error("Method not implemented.");
	}
}

interface KvFSOptions {
	accessToken?: string;
}

const KvFS = {
	name: "KvFS",
	options: {
		accessToken: {
			type: "string",
			required: false,
			description: "Access Token (optional)",
		},
	},

	isAvailable(): boolean {
		return true;
	},

	create(opts: KvFSOptions) {
		return new zenfs.AsyncStoreFS({ store: new KvStore(opts.accessToken) });
	},
} as const satisfies zenfs.Backend<zenfs.AsyncStoreFS, KvFSOptions>;

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
			const t = await auth0.getAccessTokenSilently();
			setToken(t);
		}
		getToken();
	}, [auth0]);

	const onFrame = useCallback(props.onFrame, []);

	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<any>();
	useEffect(() => {
		log.debug(tag.pob, "loading version", props.version);

		const _driver = new PobDriver(`${__ASSET_PREFIX__}/v${props.version}`, {
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
				await _driver.start({});
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
		};
	}, [props.version, onFrame]);

	if (error) {
		log.error(tag.pob, error);
	}

	return (
		<div
			ref={container}
			className="h-full border border-base-300 bg-base-300"
		/>
	);
}
