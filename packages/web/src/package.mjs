import {default as PoBEngine} from '/pob_engine.mjs';

let color;
window.SetDrawColor = (r, g, b, a) => {
    // console.log('SetDrawColor', r, g, b, a);
    color = `rgba(${r * 255}, ${g * 255}, ${b * 255}, ${a * 255})`;
};
window.DrawImage = (x, y, width, height, a, b, c, d) => {
    // console.log('DrawImage', left, top, width, height, a, b, c, d);
    const ctx = document.getElementById('canvas').getContext('2d');
    ctx.fillStyle = color;
    ctx.fillRect(x, y, width, height);
};

export class Engine {
    constructor() {
    }

    async test() {
        const engine = await PoBEngine();
        engine._test();
    }
}