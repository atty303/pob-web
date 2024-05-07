// @ts-ignore
import {default as Module} from "/dist/driver.mjs";
import {Renderer} from "./renderer";
import {ImageRepository} from "./image";

// TODO: copy dist/assets, dist/TreeData

Module({
    print: console.log,
    printErr: console.error,
    locateFile: (path: string, prefix: string) => {
        if (path.endsWith(".data")) return "/dist/" + path;
        return prefix + path;
    },
}).then((module: any) => {
    const imageRepo = new ImageRepository();

    const win = document.querySelector("#window") as HTMLDivElement;
    const renderer = new Renderer(win, imageRepo);

    let isDirty = true;
    const invalidate = () => {
        isDirty = true;
    };

    const on_key_up = module.cwrap("on_key_up", "number", ["string", "number"]);
    const on_key_down = module.cwrap("on_key_down", "number", ["string", "number"]);

    win.addEventListener("contextmenu", (e) => {
        e.preventDefault();
    });

    let cursorPosX = 0;
    let cursorPosY = 0;
    win.addEventListener("mousemove", (e) => {
        cursorPosX = e.clientX;
        cursorPosY = e.clientY;
        invalidate();
    });

    const mouseString = (e: MouseEvent) => {
        switch (e.button) {
            case 0:
                return "LEFTBUTTON";
            case 1:
                return "MIDDLEBUTTON";
            case 2:
                return "RIGHTBUTTON";
        }
    };

    const buttonState = new Set<string>();
    win.addEventListener("mousedown", (e) => {
        e.preventDefault();
        const name = mouseString(e);
        if (name) {
            buttonState.add(name);
            on_key_down(name, 0);
            invalidate();
        }
    });

    win.addEventListener("mouseup", (e) => {
        e.preventDefault();
        const name = mouseString(e);
        if (name) {
            buttonState.delete(name);
            on_key_up(name, -1);
            invalidate();
        }
    });

    win.addEventListener("dblclick", (e) => {
        e.preventDefault();
        const name = mouseString(e);
        if (name) on_key_down(name, 1);
        invalidate();
    });

    win.addEventListener("wheel", (e) => {
        e.preventDefault();
        const name = e.deltaY > 0 ? "WHEELDOWN" : "WHEELUP";
        on_key_up(name, 0);
        invalidate();
    });

    module.getCursorPosX = () => cursorPosX;
    module.getCursorPosY = () => cursorPosY;

    module.isKeyDown = (name: string) => {
        if (name === "LEFTBUTTON" || name === "MIDDLEBUTTON" || name === "RIGHTBUTTON") {
            return buttonState.has(name);
        }
        return false;
    };

    module.imageLoad = (handle: number, filename: string) => {
        imageRepo.load(handle, filename).then(() => {
            invalidate();
        });
    };

    module.drawCommit = (bufferPtr: number, size: number) => {
        renderer.begin();

        const view = new DataView(module.HEAPU8.buffer, bufferPtr, size);
        let i = 0;
        while (i < size) {
            const commandType = view.getUint8(i);
            i += 1;
            switch (commandType) {
                case 2: {
                    const layer = view.getUint16(i, true);
                    i += 2;
                    const sublayer = view.getUint16(i, true);
                    i += 2;
                    renderer.setLayer(layer, sublayer);
                }
                break;
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
                    const s1 = view.getFloat32(i, true);
                    i += 4;
                    const t1 = view.getFloat32(i, true);
                    i += 4;
                    const s2 = view.getFloat32(i, true);
                    i += 4;
                    const t2 = view.getFloat32(i, true);
                    i += 4;
                    renderer.drawImage(handle, x, y, width, height, s1, t1, s2, t2);
                }
                break;
                case 7: {
                    const handle = view.getInt32(i, true);
                    i += 4;
                    const x1 = view.getFloat32(i, true);
                    i += 4;
                    const y1 = view.getFloat32(i, true);
                    i += 4;
                    const x2 = view.getFloat32(i, true);
                    i += 4;
                    const y2 = view.getFloat32(i, true);
                    i += 4;
                    const x3 = view.getFloat32(i, true);
                    i += 4;
                    const y3 = view.getFloat32(i, true);
                    i += 4;
                    const x4 = view.getFloat32(i, true);
                    i += 4;
                    const y4 = view.getFloat32(i, true);
                    i += 4;
                    const s1 = view.getFloat32(i, true);
                    i += 4;
                    const t1 = view.getFloat32(i, true);
                    i += 4;
                    const s2 = view.getFloat32(i, true);
                    i += 4;
                    const t2 = view.getFloat32(i, true);
                    i += 4;
                    const s3 = view.getFloat32(i, true);
                    i += 4;
                    const t3 = view.getFloat32(i, true);
                    i += 4;
                    const s4 = view.getFloat32(i, true);
                    i += 4;
                    const t4 = view.getFloat32(i, true);
                    i += 4;
                    renderer.drawImageQuad(handle, x1, y1, x2, y2, x3, y3, x4, y4, s1, t1, s2, t2, s3, t3, s4, t4);
                }
                    break;
            }
        }

        renderer.end();
    };

    module._init();

    const tick = () => {
        if (isDirty) {
            const start = performance.now();
            module._on_frame();
            console.log(`frame: ${performance.now() - start}ms`);
            isDirty = false;
        }
        requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
});
