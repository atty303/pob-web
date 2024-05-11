import {PobWindow as PobWindowInternal} from "pob-driver/src/main.ts";
import {useEffect, useRef} from "react";

export default function PobWindow(props: { onFrame: (render: boolean, time: number) => void }) {
    const win = useRef<HTMLDivElement>(null);
    useEffect(() => {
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
        pob.start();
        return () => {
            pob.destroy();
        };
    }, [win]);

    return (
        <div ref={win} className="h-full border border-base-300 bg-base-300"/>
    );
}