// @ts-ignore
import {default as Module} from "/dist/driver.mjs";
import {Renderer} from "./renderer";
import {ImageRepository} from "./image";
import {DrawCommandInterpreter} from "./draw";

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

        const layers = new DrawCommandInterpreter(module.HEAPU8.buffer, bufferPtr, size).sort();
        layers.forEach((layer) => {
            layer.commands.forEach((buffer) => {
                DrawCommandInterpreter.run(buffer, {
                    onSetColor: (r: number, g: number, b: number, a: number) => {
                        renderer.setColor(r, g, b, a);
                    },
                    onDrawImage: (handle: number, x: number, y: number, width: number, height: number, s1: number, t1: number, s2: number, t2: number) => {
                        renderer.drawImage(handle, x, y, width, height, s1, t1, s2, t2);
                    },
                    onDrawImageQuad: (handle: number, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number, s1: number, t1: number, s2: number, t2: number, s3: number, t3: number, s4: number, t4: number) => {
                        renderer.drawImageQuad(handle, x1, y1, x2, y2, x3, y3, x4, y4, s1, t1, s2, t2, s3, t3, s4, t4);
                    },
                    onDrawString: (x: number, y: number, align: number, height: number, font: number, text: string) => {
                        // renderer.drawString(x, y, align, height, font, text);
                    },
                });
             });
        });

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
