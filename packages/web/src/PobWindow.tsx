import {PobWindow as PobWindowInternal} from "pob-driver/src/main.ts";
import {useEffect, useRef} from "react";

export default function PobWindow() {
    const win = useRef(null);
    useEffect(() => {
        const pob = new PobWindowInternal(win.current!);
        pob.start();
        return () => {
            pob.destroy();
        };
    }, [win]);

    return (
        <div ref={win}/>
    );
}