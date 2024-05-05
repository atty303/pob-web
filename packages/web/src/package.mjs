import {default as PoBEngine} from '/pob_engine.mjs';

const engine = PoBEngine();

const imageHandles = [];

window.ImageHandleLoad = (handle, name) => {
    // console.log('ImageHandleLoad', handle, name);
    const info = {
        image: new Image(),
        bitmap: undefined,
    };

    imageHandles[handle] = info;
    info.image.src = name;
    info.image.loading = 'eager';
    info.image.onload = async (e) => {
        info.bitmap = await createImageBitmap(info.image);
    };
};

const layers = {};
let currentLayer = 0;
let currentSubLayer = 0;

function getCanvas() {
    return layers[[currentLayer, currentSubLayer]];
}

window.SetDrawLayer = (layer, subLayer) => {
    // console.log('SetDrawLayer', layer, subLayer);
    const pair = [layer || currentLayer, subLayer || 0];

    if (!layers[pair]) {
        const canvas = document.createElement('canvas');
        canvas.width = 1920;
        canvas.height = 1080;
        canvas.style.position = 'absolute';
        canvas.setAttribute("data-layer", pair[0].toString());
        canvas.setAttribute("data-sublayer", pair[1].toString());
        layers[pair] = canvas;

        const layersDiv = document.getElementById("layers");
        const children = Array.from(layersDiv.children);
        let insertPosition = children.findIndex((child) => {
            const layer = parseInt(child.getAttribute("data-layer"));
            const subLayer = parseInt(child.getAttribute("data-sublayer"));
            return (layer > pair[0] || (layer === pair[0] && subLayer > pair[1]));
        });
        if (insertPosition === -1) {
            layersDiv.appendChild(canvas);
        } else {
            layersDiv.insertBefore(canvas, children[insertPosition]);
        }
    }

    currentLayer = pair[0];
    currentSubLayer = pair[1];
};

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
    const ctx = getCanvas().getContext('2d');
    ctx.fillStyle = `rgba(${r * 255}, ${g * 255}, ${b * 255}, ${a * 255})`;
};
window.DrawImage = (imageHandle, x, y, width, height, tLeft, tTop, tRight, tBottom) => {
    // if (tLeft !== 0 || tTop !== 0 || tRight !== 1 || tBottom !== 1) {
    //     console.log('DrawImage', x, y, width, height, tLeft, tTop, tRight, tBottom);
    // }
    // console.log('DrawImage', x, y, width, height, tLeft, tTop, tRight, tBottom);
    const ctx = getCanvas().getContext('2d');
    const image = imageHandles[imageHandle];
    if (image && image.bitmap) {
        const sx = image.image.width * tLeft;
        const sy = image.image.height * tTop;
        const sw = image.image.width * (tRight - tLeft);
        const sh = image.image.height * (tBottom - tTop);
        ctx.drawImage(image.bitmap, sx, sy, sw, sh, viewport.x + x, viewport.y + y, width, height);
    } else {
        ctx.fillRect(viewport.x + x, viewport.y + y, width, height);
    }
};
window.DrawStringWidth = (height, font, text) => {
    // console.log('DrawStringWidth', height, font, text);
    const ctx = getCanvas().getContext('2d');
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
    const ctx = getCanvas().getContext('2d');
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
        layers[[0, 0]] = document.getElementById('canvas');
        document.getElementById('canvas').setAttribute("data-layer", "0");
        document.getElementById('canvas').setAttribute("data-sublayer", "0");
        document.head.insertAdjacentHTML('beforeend', '<link rel="stylesheet" href="https://fonts.cdnfonts.com/css/liberation-sans">');
        document.head.insertAdjacentHTML('beforeend', '<link rel="stylesheet" href="https://fonts.cdnfonts.com/css/bitstream-vera-sans-mono">');
    }

    async test() {
        (await engine)._test();
    }

    async on_frame() {
        (await engine)._on_frame();
    }
}