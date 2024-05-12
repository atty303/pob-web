// @ts-ignore
import {default as Module} from "../dist/driver.mjs";
import {Renderer} from "./renderer";
import {ImageRepository} from "./image";
import {NodeEmscriptenFS} from "./fs";

function mouseString(e: MouseEvent) {
    return ["LEFTBUTTON", "MIDDLEBUTTON", "RIGHTBUTTON", "MOUSE4", "MOUSE5"][e.button];
}

const KEY_MAP = new Map<string, string>([
    ["Backspace", "BACK"],
    ["Tab", "TAB"],
    ["Enter", "RETURN"],
    ["Escape", "ESCAPE"],
    ["Shift", "SHIFT"],
    ["Control", "CTRL"],
    ["Alt", "ALT"],
    ["Pause", "PAUSE"],
    ["PageUp", "PAGEUP"],
    ["PageDown", "PAGEDOWN"],
    ["End", "END"],
    ["Home", "HOME"],
    ["PrintScreen", "PRINTSCREEN"],
    ["Insert", "INSERT"],
    ["Delete", "DELETE"],
    ["ArrowUp", "UP"],
    ["ArrowDown", "DOWN"],
    ["ArrowLeft", "LEFT"],
    ["ArrowRight", "RIGHT"],
    ["F1", "F1"],
    ["F2", "F2"],
    ["F3", "F3"],
    ["F4", "F4"],
    ["F5", "F5"],
    ["F6", "F6"],
    ["F7", "F7"],
    ["F8", "F8"],
    ["F9", "F9"],
    ["F10", "F10"],
    ["F11", "F11"],
    ["F12", "F12"],
    ["F13", "F13"],
    ["F14", "F14"],
    ["F15", "F15"],
    ["NumLock", "NUMLOCK"],
    ["ScrollLock", "SCROLLLOCK"],
]);

const EXTRA_KEY_MAP = new Map<string, string>([
    ["Backspace", "\b"],
    ["Tab", "\t"],
    ["Enter", "\r"],
    ["Escape", "\u001B"],
]);

type OnFetchFunction = (url: string, headers: Record<string, string>, body: string | undefined) => Promise<{
    body: string;
    status: number | undefined;
    headers: Record<string, string>;
    error: string | undefined;
}>;

export class PobWindow {
    private readonly module: Promise<any>;
    private readonly imageRepo: ImageRepository;
    private readonly renderer: Renderer;
    private readonly onError: (message: string) => void;
    private readonly onFrame: (render: boolean, time: number) => void;
    private onFetch: OnFetchFunction;

    private isRunning = false;
    private isDirty = false;
    private luaOnKeyUp: (name: string, doubleClick: number) => void = () => {};
    private luaOnKeyDown: (name: string, doubleClick: number) => void = () => {};
    private luaOnChar: (char: string, doubleClick: number) => void = () => {};
    private luaOnDownloadPageResult: (result: string) => void = () => {};
    private cursorPosX: number = 0;
    private cursorPosY: number = 0;
    private buttonState: Set<string> = new Set();

    constructor(props: {
        container: HTMLElement,
        dataPrefix: string,
        assetPrefix: string,
        onError: (message: string) => void,
        onFrame: (render: boolean, time: number) => void,
        onFetch: OnFetchFunction,
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

        props.container.tabIndex = 0;
        this.registerEventHandlers(props.container);
        props.container.focus();

        this.onError = props.onError;
        this.onFrame = props.onFrame;
        this.onFetch = props.onFetch;
    }

    destroy() {
        this.isRunning = false;
        this.renderer.destroy();
    }

    async mount(value: any) {
        let module = await this.module;
        module.FS.mkdir("/Builds");
        module.FS.mount(new NodeEmscriptenFS(module.FS, module.PATH, module.ERRNO_CODES, value), { root: "/" }, "/Builds");
    }

    async start() {
        this.isRunning = true;

        await document.fonts.ready;
        let module = await this.module;

        module._init();

        this.luaOnKeyUp = module.cwrap("on_key_up", "number", ["string", "number"]);
        this.luaOnKeyDown = module.cwrap("on_key_down", "number", ["string", "number"]);
        this.luaOnChar = module.cwrap("on_char", "number", ["string", "number"]);
        this.luaOnDownloadPageResult = module.cwrap("on_download_page_result", "number", ["string"]);
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
            container.focus();
        });

        container.addEventListener("mouseup", (e) => {
            e.preventDefault();
            const name = mouseString(e);
            if (name) {
                this.buttonState.delete(name);
                this.luaOnKeyUp(name, -1);
                this.invalidate();
            }
            container.focus();
        });

        container.addEventListener("dblclick", (e) => {
            e.preventDefault();
            const name = mouseString(e);
            if (name) {
                this.luaOnKeyDown(name, 1);
                this.invalidate();
            }
            container.focus();
        });

        container.addEventListener("wheel", (e) => {
            e.preventDefault();
            const name = e.deltaY > 0 ? "WHEELDOWN" : "WHEELUP";
            this.luaOnKeyUp(name, 0);
            this.invalidate();
            container.focus();
        });

        container.addEventListener("keydown", (e: KeyboardEvent) => {
            ["Tab", "Escape", "Enter"].includes(e.key) && e.preventDefault();
            const key = e.key.length === 1 ? e.key.toLowerCase() : KEY_MAP.get(e.key);
            if (key) {
                this.luaOnKeyDown(key, 0);
                this.buttonState.add(key);
                const ex = EXTRA_KEY_MAP.get(e.key);
                if (ex) {
                    this.luaOnChar(ex, 0);
                }
                this.invalidate();
            }
        });

        container.addEventListener("keypress", (e: KeyboardEvent) => {
            e.preventDefault();
            this.luaOnChar(e.key, 0);
        });

        container.addEventListener("keyup", (e: KeyboardEvent) => {
            e.preventDefault();
            const key = e.key.length === 1 ? e.key.toLowerCase() : KEY_MAP.get(e.key);
            if (key) {
                this.luaOnKeyUp(key, 0);
                this.buttonState.delete(key);
                this.invalidate();
            }
        });
    }

    private callbacks(module: any) {
        return {
            onError: (message: string) => this.onError(message),
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
            getStringCursorIndex: (size: number, font: number, text: string, cursorX: number, cursorY: number) => this.renderer.measureTextCursorIndex(size, font, text, cursorX, cursorY),
            copy: (text: string) => navigator.clipboard.writeText(text),
            paste: async () => {
                let data = await navigator.clipboard.read();
                for (let item of data) {
                    if (item.types.includes("text/plain")) {
                        const data = await item.getType("text/plain");
                        return await data.text();
                    }
                }
                return "";
            },
            fetch: async (url: string, header: string | undefined, body: string | undefined) => {
                try {
                    const headers = header ? header.split("\n").map(_ => _.split(":")).reduce((acc, [k, v]) => ({...acc, [k.trim()]: v.trim()}), {}) : {};
                    const r = await this.onFetch(url, headers, body);
                    const headerText = Object.entries(r.headers ?? {}).map(([k, v]) => `${k}: ${v}`).join("\n");
                    this.luaOnDownloadPageResult(JSON.stringify({body: r.body, status: r.status, header: headerText, error: r.error }));
                } catch (e: any) {
                    console.error(e);
                    this.luaOnDownloadPageResult(JSON.stringify({body: undefined, status: undefined, header: undefined, error: e.message }));
                }
            },
        };
    }
}
