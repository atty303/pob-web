import {PobWindow as PobWindowInternal} from "pob-driver/src/main.ts";
import {useEffect, useRef} from "react";

export default function PobWindow() {
    const win = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const r = win.current!.getBoundingClientRect();
        console.log(r);
        const pob = new PobWindowInternal({
            container: win.current!,
            dataPrefix: __DATA_PREFIX__,
            assetPrefix: __ASSET_PREFIX__,
        });
        pob.start();
        return () => {
            pob.destroy();
        };
    }, [win]);

    return (
        <div ref={win} className="h-full"/>
    );
}