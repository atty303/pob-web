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
}).then(async (module: any) => {
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
        renderer.render(new DataView(module.HEAPU8.buffer, bufferPtr, size));
    };

    module.getStringWidth = (size: number, font: number, text: string) => {
        return renderer.measureText(size, font, text);
    };

    await document.fonts.ready;

    module._init();

    // フレーム時間の平均を計算する
    let frameTime = 0;
    let frameCount = 0;
    const tick = () => {
        if (isDirty) {
            const start = performance.now();
            module._on_frame();
            isDirty = false;
            const time = performance.now() - start;
            frameTime += time;
            frameCount++;
            console.log(`average frame: ${frameTime / frameCount}ms, frame: ${time}ms`);
        }
        requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
});
