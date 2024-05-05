import {default as PoBEngine} from '/pob_engine.mjs';

const viewport = {
    x: 0,
    y: 0,
    width: 1920,
    height: 1080,
};

window.SetViewport = (x, y, width, height) => {
    // console.log('SetViewport', x, y, width, height);
    viewport.x = x;
    viewport.y = y;
    viewport.width = width;
    viewport.height = height;
};

window.SetDrawColor = (r, g, b, a) => {
    // console.log('SetDrawColor', r, g, b, a);
    const ctx = document.getElementById('canvas').getContext('2d');
    ctx.fillStyle = `rgba(${r * 255}, ${g * 255}, ${b * 255}, ${a * 255})`;
};
window.DrawImage = (x, y, width, height, a, b, c, d) => {
    // console.log('DrawImage', left, top, width, height, a, b, c, d);
    const ctx = document.getElementById('canvas').getContext('2d');
    ctx.fillRect(viewport.x + x, viewport.y + y, width, height);
};
window.DrawStringWidth = (height, font, text) => {
    // console.log('DrawStringWidth', height, font, text);
    const ctx = document.getElementById('canvas').getContext('2d');
    switch (font) {
        case "VAR":
            ctx.font = `${height - 1}px 'Liberation Sans'`;
            break;
        case "VAR BOLD":
            ctx.font = `${height - 1}px 'Liberation Sans'`;
            break;
        case "FIXED":
        default:
            ctx.font = `${height - 1}px 'Bitstream Vera Sans Mono'`;
            break;
    }

    const m = ctx.measureText(text);
    return m.width;
};
window.DrawString = (x, y, align, height, font, text) => {
    // console.log('DrawString', x, y, align, height, font, text);
    const ctx = document.getElementById('canvas').getContext('2d');
    switch (font) {
        case "VAR":
            ctx.font = `${height - 1}px 'Liberation Sans'`;
            break;
        case "VAR BOLD":
            ctx.font = `${height - 1}px 'Liberation Sans'`;
            break;
        case "FIXED":
        default:
            ctx.font = `${height - 1}px 'Bitstream Vera Sans Mono'`;
            break;
    }

    const m = ctx.measureText(text);
    const h = m.fontBoundingBoxAscent + m.fontBoundingBoxDescent;
    // console.log(m);

    ctx.textAlign = "left";
    switch (align) {
        case "LEFT":
            break;
        case "CENTER":
            x = (1920 - m.width) / 2 + x;
            break;
        case "RIGHT":
            x = 1920 - m.width - x;
            break;
        case "CENTER_X":
            ctx.textAlign = "center";
            break;
        case "RIGHT_X":
            // ctx.textAlign = "right";
            x = x - m.width + 5;
            break;

    }
    ctx.fillText(text, viewport.x + x, viewport.y + y + h + m.ideographicBaseline);
};

export class Engine {
    constructor() {
        this.engine = PoBEngine();
        document.head.insertAdjacentHTML('beforeend', '<link rel="stylesheet" href="https://fonts.cdnfonts.com/css/liberation-sans">');
        document.head.insertAdjacentHTML('beforeend', '<link rel="stylesheet" href="https://fonts.cdnfonts.com/css/bitstream-vera-sans-mono">');
    }

    async test() {
        (await this.engine)._test();
    }

    async on_frame() {
        // (await this.engine)._on_frame();
    }
}