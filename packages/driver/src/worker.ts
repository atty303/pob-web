// import { default as Module } from "../dist/driver.mjs";
import * as Comlink from "comlink";

const worker = {
	start(cb: () => void) {
		console.log("worker started");
		cb();
	},
};

export type Worker = typeof worker;

Comlink.expose(worker);

// export default worker;
