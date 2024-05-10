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
    private readonly onFrame: (render: boolean, time: number) => void;

    private isRunning = false;
    private isDirty = false;
    private luaOnKeyUp: (name: string, doubleClick: number) => void = () => {};
    private luaOnKeyDown: (name: string, doubleClick: number) => void = () => {};
    private luaOnChar: (char: string, doubleClick: number) => void = () => {};
    private cursorPosX: number = 0;
    private cursorPosY: number = 0;
    private buttonState: Set<string> = new Set();
    private removeEventListeners: () => void;

    constructor(props: {
        container: HTMLElement,
        dataPrefix: string,
        assetPrefix: string,
        onFrame: (render: boolean, time: number) => void,
    }) {
        this.imageRepo = new ImageRepository(props.assetPrefix);
        this.renderer = new Renderer(props.container, this.imageRepo, () => this.invalidate());
        this.module = Module({
            print: console.log,
            printErr: console.error,
            locateFile: (path: string, prefix: string) => {
                if (path.endsWith(".data")) return props.dataPrefix + path;
                return prefix + path;
            },
        });

        this.registerEventHandlers(props.container);

        const onKeyDown = (e: KeyboardEvent) => {
            e.preventDefault();
            const name = e.key;
            if (name.length === 1) {
                this.luaOnChar(name, 0);
            }
            this.buttonState.add(name);
            this.invalidate();
        };
        const onKeyUp = (e: KeyboardEvent) => {
            e.preventDefault();
            const name = e.key;
            if (name.length === 1) {
                // this.luaOnKeyUp(name, 0);
            }
            this.buttonState.delete(name);
            this.invalidate();
        };
        window.addEventListener("keydown", onKeyDown);
        window.addEventListener("keyup", onKeyUp);

        this.removeEventListeners = () => {
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("keyup", onKeyUp);
        };

        this.onFrame = props.onFrame;
    }

    destroy() {
        this.isRunning = false;
        this.renderer.destroy();
        this.removeEventListeners();
    }

    async start() {
        this.isRunning = true;

        await document.fonts.ready;
        let module = await this.module;

        module._init();

        this.luaOnKeyUp = module.cwrap("on_key_up", "number", ["string", "number"]);
        this.luaOnKeyDown = module.cwrap("on_key_down", "number", ["string", "number"]);
        this.luaOnChar = module.cwrap("on_char", "number", ["string", "number"]);
        Object.assign(module, this.callbacks(module));

        if (!this.isRunning) return;

        module._start();

        const tick = () => {
            const start = performance.now();
            let render = this.renderer.onFrame() || this.isDirty;
            if (render) {
                module._on_frame();
                this.isDirty = false;
            }
            const time = performance.now() - start;
            this.onFrame(render, time);
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
            getScreenWidth: () => this.renderer.width,
            getScreenHeight: () => this.renderer.height,
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
