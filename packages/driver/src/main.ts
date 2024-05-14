import * as Comlink from "comlink";

import { UIEventManager } from "./event.ts";
import type { DriverWorker, HostCallbacks } from "./worker.ts";
import WorkerObject from "./worker.ts?worker";

export type FilesystemConfig = {};

export class PobDriver {
	private isStarted = false;
	private uiEventManager: UIEventManager | undefined;
	private root: HTMLElement | undefined;
	private worker: Worker | undefined;
	private driverWorker: Comlink.Remote<DriverWorker> | undefined;
	private resizeObserver: ResizeObserver | undefined;

	constructor(
		readonly assetPrefix: string,
		readonly hostCallbacks: HostCallbacks,
	) {}

	start(fileSystemConfig: FilesystemConfig) {
		if (this.isStarted) throw new Error("Already started");
		this.isStarted = true;

		this.worker = new WorkerObject();
		this.driverWorker = Comlink.wrap<DriverWorker>(this.worker);
		return this.driverWorker.start(
			this.assetPrefix,
			fileSystemConfig,
			Comlink.proxy(this.hostCallbacks.onError),
			Comlink.proxy(this.hostCallbacks.onFrame),
			Comlink.proxy(this.hostCallbacks.onFetch),
			Comlink.proxy(async () => {
				const pos = this.uiEventManager?.cursorPosition ?? { x: 0, y: 0 };
				return {
					x: pos.x,
					y: pos.y,
					keys: this.uiEventManager?.keyState ?? new Set(),
				};
			}),
			Comlink.proxy((text: string) => this.copy(text)),
			Comlink.proxy(() => this.paste()),
		);
	}

	destory() {
		console.log("destroy");
		this.driverWorker?.destroy();
		this.worker?.terminate();
	}

	attachToDOM(root: HTMLElement) {
		if (this.root) throw new Error("Already attached");
		this.root = root;

		for (const child of [...this.root.children]) {
			this.root.removeChild(child);
		}

		const r = root.getBoundingClientRect();
		const canvas = document.createElement("canvas");
		canvas.width = r.width;
		canvas.height = r.height;
		canvas.style.position = "absolute";

		const offscreenCanvas = canvas.transferControlToOffscreen();
		this.driverWorker?.setCanvas(
			Comlink.transfer(offscreenCanvas, [offscreenCanvas]),
		);

		root.style.position = "relative";
		root.appendChild(canvas);
		root.tabIndex = 0;
		root.focus();

		this.resizeObserver = new ResizeObserver((entries) => {
			for (const entry of entries) {
				const { width, height } = entry.contentRect;
				this.driverWorker?.resize({ width, height });
			}
		});
		this.resizeObserver.observe(root);

		this.uiEventManager = new UIEventManager(root, {
			onKeyDown: (name, doubleClick) =>
				this.driverWorker?.handleKeyDown(name, doubleClick),
			onKeyUp: (name, doubleClick) =>
				this.driverWorker?.handleKeyUp(name, doubleClick),
			onChar: (char, doubleClick) =>
				this.driverWorker?.handleChar(char, doubleClick),
			invalidate: () => this.driverWorker?.invalidate(),
		});
	}

	detachFromDOM() {
		this.resizeObserver?.disconnect();
		if (this.root) {
			for (const child of [...this.root.children]) {
				this.root.removeChild(child);
			}
		}
		this.uiEventManager?.destroy();
	}

	copy(text: string) {
		return navigator.clipboard.writeText(text);
	}

	async paste() {
		const data = await navigator.clipboard.read();
		for (const item of data) {
			if (item.types.includes("text/plain")) {
				const data = await item.getType("text/plain");
				return await data.text();
			}
		}
		return "";
	}
}
