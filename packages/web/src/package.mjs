import { default as PoBEngine } from '/pob_engine.mjs';

export class Engine {
    constructor() {
    }

    async test() {
        console.log("test");
        const engine = await PoBEngine();
        console.log(engine._test());
    }
}