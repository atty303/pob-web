import {PobWindow as PobWindowInternal} from "pob-driver/src/main.ts";
import {useEffect, useRef, useState} from "react";

import * as zenfs from "@zenfs/core";
import {WebStorage} from "@zenfs/dom";
import {useAuth0} from "@auth0/auth0-react";

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

    async put(key: bigint, data: Uint8Array, overwrite: boolean): Promise<boolean> {
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

async function fs() {
    try {
        await zenfs.configure({
            mounts: {
                "/local": {backend: WebStorage, options: {storage: localStorage}},
            }
        });
    } catch (e) {
    }
    return zenfs.fs;
}

export default function PobWindow(props: { onFrame: (render: boolean, time: number) => void }) {
    const auth0 = useAuth0();

    const [token, setToken] = useState<string>();
    useEffect(() => {
        async function getToken() {
            const t = await auth0.getAccessTokenSilently();
            setToken(t);
        }
        getToken();
    }, [auth0]);

    useEffect(() => {
        if (token) {
            (async () => {
                const kvfs = await zenfs.resolveMountConfig({ backend: KvFS, accessToken: token });
                zenfs.mount("/cloud", kvfs);
            })();
        }
    }, [token]);

    const win = useRef<HTMLDivElement>(null);
    useEffect(() => {
        let isRunning = true;
        const pob = new PobWindowInternal({
            container: win.current!,
            dataPrefix: __DATA_PREFIX__,
            assetPrefix: __ASSET_PREFIX__,
            onError: (message) => { throw new Error(message); },
            onFrame: props.onFrame,
            onFetch: async (url, headers, body) => {
                const rep = await fetch("/api/fetch", {
                    method: "POST",
                    body: JSON.stringify({ url, headers, body }),
                });
                return await rep.json();
            },
        });

        async function start() {
            const nodefs = await fs();
            pob.mount(nodefs);
            if (isRunning) pob.start();
        }
        start();

        return () => {
            isRunning = false;
            pob.destroy();
        };
    }, [win, token]);

    return (
        <div ref={win} className="h-full border border-base-300 bg-base-300"/>
    );
}