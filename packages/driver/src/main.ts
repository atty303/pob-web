// @ts-ignore
import {default as Module} from "/dist/driver.mjs";

Module({
    print: console.log,
    printErr: console.error,
    locateFile: (path: string, prefix: string) => {
        if (path.endsWith(".data")) return "/dist/" + path;
        return prefix + path;
    },
    DrawImage: () => {
        console.log("drawImage");
    },
}).then((module: any) => {
    console.log(module);

    module.drawCommit = (bufferPtr: number, size: number) => {
        console.log("drawCommit", bufferPtr, size);
    };

    console.log(module._init());

    const tick = () => {
        const start = performance.now();
        module._on_frame();
        console.log(`${performance.now() - start}ms`);
    };
    setInterval(tick, 1000);
});
