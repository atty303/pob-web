import {default as PoBEngine} from '/pob_engine.mjs';

window.SetDrawColor = (r, g, b, a) => {
    // console.log('SetDrawColor', r, g, b, a);
    const ctx = document.getElementById('canvas').getContext('2d');
    ctx.fillStyle = `rgba(${r * 255}, ${g * 255}, ${b * 255}, ${a * 255})`;
};
window.DrawImage = (x, y, width, height, a, b, c, d) => {
    // console.log('DrawImage', left, top, width, height, a, b, c, d);
    const ctx = document.getElementById('canvas').getContext('2d');
    ctx.fillRect(x, y, width, height);
};
window.DrawString = (x, y, align, height, font, text) => {
    console.log('DrawString', x, y, align, height, font, text);
    const ctx = document.getElementById('canvas').getContext('2d');
    switch (font) {
        case "VAR":
            ctx.font = `${height}px 'Liberation Sans'`;
            break;
        case "VAR BOLD":
            ctx.font = `${height}px 'Liberation Sans'`;
            break;
        case "FIXED":
        default:
            ctx.font = `${height}px 'Bitstream Vera Sans Mono'`;
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
    ctx.fillText(text, x, y + h + m.ideographicBaseline);
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
        (await this.engine)._on_frame();
    }
}