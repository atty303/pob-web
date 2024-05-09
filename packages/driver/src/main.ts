// @ts-ignore
import {default as Module} from "../dist/driver.mjs";
import {Renderer} from "./renderer";
import {ImageRepository} from "./image";

function mouseString(e: MouseEvent) {
    switch (e.button) {
        case 0:
            return "LEFTBUTTON";
        case 1:
            return "MIDDLEBUTTON";
        case 2:
            return "RIGHTBUTTON";
    }
}

export class PobWindow {
    private readonly module: Promise<any>;
    private readonly imageRepo: ImageRepository;
    private readonly renderer: Renderer;

    private isRunning = false;
    private isDirty = false;
    private luaOnKeyUp: (name: string, arg: number) => void = () => {};
    private luaOnKeyDown: (name: string, arg: number) => void = () => {};
    private cursorPosX: number = 0;
    private cursorPosY: number = 0;
    private buttonState: Set<string> = new Set();

    constructor({container, dataPrefix, assetPrefix}: {container: HTMLElement, dataPrefix: string, assetPrefix: string}) {
        this.imageRepo = new ImageRepository(assetPrefix);
        this.renderer = new Renderer(container, this.imageRepo);
        this.module = Module({
            print: console.log,
            printErr: console.error,
            locateFile: (path: string, prefix: string) => {
                if (path.endsWith(".data")) return dataPrefix + path;
                return prefix + path;
            },
        });
        this.registerEventHandlers(container);
    }

    destroy() {
        this.isRunning = false;
        this.renderer.destroy();
    }

    async start() {
        this.isRunning = true;

        await document.fonts.ready;
        let module = await this.module;

        module._init();

        this.luaOnKeyUp = module.cwrap("on_key_up", "number", ["string", "number"]);
        this.luaOnKeyDown = module.cwrap("on_key_down", "number", ["string", "number"]);
        Object.assign(module, this.callbacks(module));

        if (!this.isRunning) return;

        module._start();

        let frameTime = 0;
        let frameCount = 0;
        const tick = () => {
            if (this.isDirty) {
                const start = performance.now();
                module._on_frame();
                this.isDirty = false;
                const time = performance.now() - start;
                frameTime += time;
                frameCount++;
                console.log(`average frame: ${frameTime / frameCount}ms, frame: ${time}ms`);
            }
            if (this.isRunning) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }

    private invalidate() {
        this.isDirty = true;
    }

    private registerEventHandlers(container: HTMLElement) {
        container.addEventListener("contextmenu", (e) => {
            e.preventDefault();
        });

        container.addEventListener("mousemove", (e) => {
            this.cursorPosX = e.offsetX;
            this.cursorPosY = e.offsetY;
            this.invalidate();
        });

        container.addEventListener("mousedown", (e) => {
            e.preventDefault();
            const name = mouseString(e);
            if (name) {
                this.buttonState.add(name);
                this.luaOnKeyDown(name, 0);
                this.invalidate();
            }
        });

        container.addEventListener("mouseup", (e) => {
            e.preventDefault();
            const name = mouseString(e);
            if (name) {
                this.buttonState.delete(name);
                this.luaOnKeyUp(name, -1);
                this.invalidate();
            }
        });

        container.addEventListener("dblclick", (e) => {
            e.preventDefault();
            const name = mouseString(e);
            if (name) {
                this.luaOnKeyDown(name, 1);
                this.invalidate();
            }
        });

        container.addEventListener("wheel", (e) => {
            e.preventDefault();
            const name = e.deltaY > 0 ? "WHEELDOWN" : "WHEELUP";
            this.luaOnKeyUp(name, 0);
            this.invalidate();
        });
    }

    private callbacks(module: any) {
        return {
            getCursorPosX: () => this.cursorPosX,
            getCursorPosY: () => this.cursorPosY,
            isKeyDown: (name: string) => this.buttonState.has(name),
            imageLoad: (handle: number, filename: string) => {
                this.imageRepo.load(handle, filename).then(() => {
                    this.invalidate();
                });
            },
            drawCommit: (bufferPtr: number, size: number) => this.renderer.render(new DataView(module.HEAPU8.buffer, bufferPtr, size)),
            getStringWidth: (size: number, font: number, text: string) => this.renderer.measureText(size, font, text),
        };
    }
}
