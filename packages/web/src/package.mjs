import { default as PoBEngine } from '/pob_engine.mjs';

export class Engine {
    constructor() {
    }

    async test() {
        const engine = await PoBEngine();
        engine._test();
    }
}