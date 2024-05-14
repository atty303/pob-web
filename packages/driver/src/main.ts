import * as Comlink from "comlink";

import { UIEventManager } from "./event.ts";
import type { DriverWorker, HostCallbacks } from "./worker.ts";
import WorkerObject from "./worker.ts?worker";

export type FilesystemConfig = {
	rootZip: ArrayBuffer;
};

export class PobDriver {
	private isStarted = false;
	private uiEventManager: UIEventManager | undefined;
	private root: HTMLElement | undefined;
	private worker: Comlink.Remote<DriverWorker> | undefined;
	private resizeObserver: ResizeObserver | undefined;

	constructor(
		readonly assetPrefix: string,
		readonly hostCallbacks: HostCallbacks,
	) {}

	start(fileSystemConfig: FilesystemConfig) {
		if (this.isStarted) throw new Error("Already started");
		this.isStarted = true;

		this.worker = Comlink.wrap<DriverWorker>(new WorkerObject());
		return this.worker.start(
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

	attachToDOM(root: HTMLElement) {
		if (this.root) throw new Error("Already attached");
		this.root = root;

		const r = root.getBoundingClientRect();
		const canvas = document.createElement("canvas");
		canvas.width = r.width;
		canvas.height = r.height;
		canvas.style.position = "absolute";

		const offscreenCanvas = canvas.transferControlToOffscreen();
		this.worker?.setCanvas(
			Comlink.transfer(offscreenCanvas, [offscreenCanvas]),
		);

		root.style.position = "relative";
		root.appendChild(canvas);
		root.tabIndex = 0;
		root.focus();

		this.resizeObserver = new ResizeObserver((entries) => {
			for (const entry of entries) {
				const { width, height } = entry.contentRect;
				this.worker?.resize({ width, height });
			}
		});
		this.resizeObserver.observe(root);

		this.uiEventManager = new UIEventManager(root, {
			onKeyDown: (name, doubleClick) =>
				this.worker?.handleKeyDown(name, doubleClick),
			onKeyUp: (name, doubleClick) =>
				this.worker?.handleKeyUp(name, doubleClick),
			onChar: (char, doubleClick) => this.worker?.handleChar(char, doubleClick),
			invalidate: () => this.worker?.invalidate(),
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
