// @ts-ignore
import { default as Module } from "../dist/driver.mjs";
import { NodeEmscriptenFS } from "./fs";
import { ImageRepository } from "./image";
import { Canvas, Renderer, TextRasterizer } from "./renderer";

function mouseString(e: MouseEvent) {
	return ["LEFTBUTTON", "MIDDLEBUTTON", "RIGHTBUTTON", "MOUSE4", "MOUSE5"][
		e.button
	];
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

type OnFetchFunction = (
	url: string,
	headers: Record<string, string>,
	body: string | undefined,
) => Promise<{
	body: string;
	status: number | undefined;
	headers: Record<string, string>;
	error: string | undefined;
}>;

export class PobDriver {
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
	private cursorPosX = 0;
	private cursorPosY = 0;
	private buttonState: Set<string> = new Set();
	private textRasterizer: TextRasterizer;
	private root: HTMLElement | undefined;
	private backend: Canvas | undefined;
	private screenSize: { width: number; height: number } = {
		width: 800,
		height: 600,
	};

	constructor(props: {
		assetPrefix: string;
		onError: (message: string) => void;
		onFrame: (render: boolean, time: number) => void;
		onFetch: OnFetchFunction;
	}) {
		this.imageRepo = new ImageRepository(`${props.assetPrefix}/root/`);
		this.textRasterizer = new TextRasterizer(this.invalidate);
		this.renderer = new Renderer(
			this.imageRepo,
			this.textRasterizer,
			this.screenSize,
		);
		this.onError = props.onError;
		this.onFrame = props.onFrame;
		this.onFetch = props.onFetch;
	}

	destroy() {
		this.isRunning = false;
	}

	async start(fs: unknown) {
		this.isRunning = true;

		const module = await Module({
			print: console.log,
			printErr: console.warn,
		});

		module.FS.mkdir("/app");
		module.FS.mount(
			new NodeEmscriptenFS(module.FS, module.PATH, module.ERRNO_CODES, fs),
			{ root: "." },
			"/app",
		);

		module._init();

		this.luaOnKeyUp = module.cwrap("on_key_up", "number", ["string", "number"]);
		this.luaOnKeyDown = module.cwrap("on_key_down", "number", [
			"string",
			"number",
		]);
		this.luaOnChar = module.cwrap("on_char", "number", ["string", "number"]);
		this.luaOnDownloadPageResult = module.cwrap(
			"on_download_page_result",
			"number",
			["string"],
		);
		Object.assign(module, this.callbacks(module));

		if (!this.isRunning) return;

		module._start();
		console.log("driver started");

		const tick = () => {
			const start = performance.now();

			let render = false;
			if (this.root) {
				const r = this.root.getBoundingClientRect();
				if (
					r.width !== this.screenSize.width ||
					r.height !== this.screenSize.height
				) {
					this.screenSize = { width: r.width, height: r.height };
					this.renderer.resize(this.screenSize);
					render = true;
				}
			}
			render = render || this.isDirty;
			if (render) {
				module._on_frame();
				this.isDirty = false;
			}
			const time = performance.now() - start;
			this.onFrame(render, time);
			if (this.isRunning) requestAnimationFrame(tick);
		};
		if (this.isRunning) requestAnimationFrame(tick);
	}

	mountToDOM(root: HTMLElement) {
		console.log("mountToDOM");
		if (this.root) throw new Error("Already mounted");
		this.root = root;

		const r = root.getBoundingClientRect();
		this.backend = new Canvas(r.width, r.height);
		this.renderer.backend = this.backend;
		root.style.position = "relative";
		root.appendChild(this.backend.element);
		root.tabIndex = 0;
		this.registerEventHandlers(root);
		root.focus();
	}

	unmountFromDOM() {
		console.log("unmountFromDOM");
		if (this.backend) this.root?.removeChild(this.backend.element);
		// this.root.event;
		this.root = undefined;
		this.backend = undefined;
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
			getScreenWidth: () => this.screenSize.width,
			getScreenHeight: () => this.screenSize.height,
			getCursorPosX: () => this.cursorPosX,
			getCursorPosY: () => this.cursorPosY,
			isKeyDown: (name: string) => this.buttonState.has(name),
			imageLoad: (handle: number, filename: string) => {
				this.imageRepo.load(handle, filename).then(() => {
					this.invalidate();
				});
			},
			drawCommit: (bufferPtr: number, size: number) =>
				this.renderer.render(
					new DataView(module.HEAPU8.buffer, bufferPtr, size),
				),
			getStringWidth: (size: number, font: number, text: string) =>
				this.textRasterizer.measureText(size, font, text),
			getStringCursorIndex: (
				size: number,
				font: number,
				text: string,
				cursorX: number,
				cursorY: number,
			) =>
				this.textRasterizer.measureTextCursorIndex(
					size,
					font,
					text,
					cursorX,
					cursorY,
				),
			copy: (text: string) => navigator.clipboard.writeText(text),
			paste: async () => {
				const data = await navigator.clipboard.read();
				for (const item of data) {
					if (item.types.includes("text/plain")) {
						const data = await item.getType("text/plain");
						return await data.text();
					}
				}
				return "";
			},
			fetch: async (
				url: string,
				header: string | undefined,
				body: string | undefined,
			) => {
				try {
					const headers = header
						? header
								.split("\n")
								.map((_) => _.split(":"))
								.reduce((acc, [k, v]) => ({ ...acc, [k.trim()]: v.trim() }), {})
						: {};
					const r = await this.onFetch(url, headers, body);
					const headerText = Object.entries(r.headers ?? {})
						.map(([k, v]) => `${k}: ${v}`)
						.join("\n");
					this.luaOnDownloadPageResult(
						JSON.stringify({
							body: r.body,
							status: r.status,
							header: headerText,
							error: r.error,
						}),
					);
				} catch (e: unknown) {
					console.error(e);
					this.luaOnDownloadPageResult(
						JSON.stringify({
							body: undefined,
							status: undefined,
							header: undefined,
							error: e,
						}),
					);
				}
			},
		};
	}
}
