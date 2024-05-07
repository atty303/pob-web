// @ts-ignore
import {default as Module} from "/dist/driver.mjs";
import {Renderer} from "./renderer";

Module({
    print: console.log,
    printErr: console.error,
    locateFile: (path: string, prefix: string) => {
        if (path.endsWith(".data")) return "/dist/" + path;
        return prefix + path;
    },
}).then((module: any) => {
    console.log(module);

    const renderer = new Renderer(document.querySelector("#app") as HTMLDivElement);

    module.imageLoad = (filename: string) => {
        console.log("imageLoad", filename);
    };

    module.drawCommit = (bufferPtr: number, size: number) => {
        console.log("drawCommit", bufferPtr, size);

        renderer.begin();

        const view = new DataView(module.HEAPU8.buffer, bufferPtr, size);
        let i = 0;
        while (i < size) {
            const commandType = view.getUint8(i);
            i += 1;
            switch (commandType) {
                case 4: {
                    const r = view.getUint8(i);
                    i += 1;
                    const g = view.getUint8(i);
                    i += 1;
                    const b = view.getUint8(i);
                    i += 1;
                    const a = view.getUint8(i);
                    i += 1;
                    renderer.setColor(r, g, b, a);
                }
                break;
                case 6: {
                    const handle = view.getInt32(i, true);
                    i += 4;
                    const x = view.getFloat32(i, true);
                    i += 4;
                    const y = view.getFloat32(i, true);
                    i += 4;
                    const width = view.getFloat32(i, true);
                    i += 4;
                    const height = view.getFloat32(i, true);
                    i += 4;
                    renderer.drawImage(handle, x, y, width, height);
                }
                break;
            }
        }
    };

    console.log(module._init());

    const tick = () => {
        const start = performance.now();
        module._on_frame();
        console.log(`${performance.now() - start}ms`);
    };
    setInterval(tick, 1000);
});
