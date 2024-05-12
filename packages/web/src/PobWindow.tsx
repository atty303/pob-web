import {PobWindow as PobWindowInternal} from "pob-driver/src/main.ts";
import {useEffect, useRef} from "react";

import * as zenfs from "@zenfs/core";
import {WebStorage} from "@zenfs/dom";

async function fs() {
    await zenfs.configure({ backend: WebStorage, storage: window.localStorage} as any);
    return zenfs.fs;
}

export default function PobWindow(props: { onFrame: (render: boolean, time: number) => void }) {
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
    }, [win]);

    return (
        <div ref={win} className="h-full border border-base-300 bg-base-300"/>
    );
}