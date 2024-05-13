import * as zenfs from "@zenfs/core";
import { WebStorage } from "@zenfs/dom";
import { Zip } from "@zenfs/zip";
import { PobDriver } from "pob-driver/src/main.ts";
import { useEffect, useRef } from "react";
import { useAsync } from "react-use";
import { cat } from "shelljs";
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
		const blob = await r.blob();
		return new Uint8Array(await blob.arrayBuffer());
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

// const versionState = atom<string>({
// 	key: "currentVersion",
// 	default: "2.42.0",
// 	effects: [
// 		({ setSelf, onSet, trigger }) => {
// 			const load = async () => {};
//
// 			if (trigger === "get") {
// 			}
// 			onSet(async (version) => {
// 				const rootZip = await fetch(`${__ASSET_PREFIX__}/v${version}/root.zip`);
// 				const zipFs = await zenfs.resolveMountConfig({
// 					backend: Zip,
// 					zipData: await rootZip.arrayBuffer(),
// 					name: "root.zip",
// 				});
// 				zenfs.mount("/root", zipFs);
// 				return () => {
// 					zenfs.umount("/root");
// 				};
// 			});
// 		},
// 	],
// });

// const driverState = selector<PobDriver>({
// 	key: "PoBDriver",
// 	get: ({ get }) => {
// 		const version = get(versionState);
// 		return new PobDriver({
// 			assetPrefix: `${__ASSET_PREFIX__}/v${version}`,
// 			onError: (message) => {
// 				throw new Error(message);
// 			},
// 			onFrame: (render, time) => {},
// 			onFetch: async (url, headers, body) => {
// 				const rep = await fetch("/api/fetch", {
// 					method: "POST",
// 					body: JSON.stringify({ url, headers, body }),
// 				});
// 				return await rep.json();
// 			},
// 		});
// 	},
// });

export default function PobWindow(props: {
	version: string;
	onFrame: (render: boolean, time: number) => void;
}) {
	// const auth0 = useAuth0();
	//
	// const [token, setToken] = useState<string>();
	// useEffect(() => {
	// 	async function getToken() {
	// 		const t = await auth0.getAccessTokenSilently();
	// 		setToken(t);
	// 	}
	// 	getToken();
	// }, [auth0]);

	// useEffect(() => {
	// 	if (token) {
	// 		(async () => {
	// 			const kvfs = await zenfs.resolveMountConfig({
	// 				backend: KvFS,
	// 				accessToken: token,
	// 			});
	// 			zenfs.mount("/cloud", kvfs);
	// 			log.info(tag.vfs, "KvFS is mounted");
	// 		})();
	// 	}
	// }, [token]);

	// const [version] = useRecoilValue(versionState);

	const driver = useAsync(async () => {
		log.debug(tag.pob, "loading version", props.version);
		const rootZip = await fetch(
			`${__ASSET_PREFIX__}/v${props.version}/root.zip`,
		);
		const zipFs = await zenfs.resolveMountConfig({
			backend: Zip,
			zipData: await rootZip.arrayBuffer(),
			name: "root.zip",
		});
		if (zenfs.existsSync("/root")) {
			zenfs.umount("/root");
		}
		zenfs.mount("/root", zipFs);

		const browserFs = await zenfs.resolveMountConfig({
			backend: WebStorage,
			storage: localStorage,
		});
		// if (!zenfs.existsSync("/user")) zenfs.mkdirSync("/user");

		if (zenfs.existsSync("/user")) {
			zenfs.umount("/user");
		}
		zenfs.mount("/user", browserFs);

		// if (!zenfs.existsSync("/user/Path of Building"))
		// 	zenfs.mkdirSync("/user/Path of Building");
		//
		// if (zenfs.existsSync("/user/Path of Building/Builds")) {
		// 	zenfs.umount("/user/Path of Building/Builds");
		// }

		return new PobDriver({
			assetPrefix: `${__ASSET_PREFIX__}/v${props.version}`,
			onError: (message) => {
				throw new Error(message);
			},
			onFrame: props.onFrame,
			onFetch: async (url, headers, body) => {
				const rep = await fetch("/api/fetch", {
					method: "POST",
					body: JSON.stringify({ url, headers, body }),
				});
				return await rep.json();
			},
		});
	}, [props.version]);

	if (driver.error) {
		log.error(tag.pob, driver.error);
	}

	const container = useRef<HTMLDivElement>(null);

	useEffect(() => {
		// log.debug(tag.pob, "hook started");

		if (driver.loading || driver.error || !container.current) {
			return;
		}

		if (!zenfs.existsSync("/root")) {
			log.debug(tag.pob, "/root not mounted");
			return;
		}

		driver.value?.mountToDOM(container.current);

		(async () => {
			await driver.value?.start(zenfs.fs);
		})();

		return () => {
			log.debug(tag.pob, "hook cleanup");
			try {
				driver.value?.unmountFromDOM();
			} catch (e: unknown) {
				console.warn(e);
			}
			driver.value?.destroy();
		};
	}, [driver]);

	if (driver.loading) {
		return <div>Loading...</div>;
	}
	if (driver.error) {
		return <div>Error: {driver.error.message}</div>;
	}
	return (
		<div
			ref={container}
			className="h-full border border-base-300 bg-base-300"
		/>
	);
}
