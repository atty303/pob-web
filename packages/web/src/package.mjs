import {default as PoBEngine} from '/pob_engine.mjs';

const engine = PoBEngine();

const imageHandles = [];

let bgHandle = -1;
window.ImageHandleLoad = (handle, name) => {
    // console.log('ImageHandleLoad', handle, name);
    if (name === "TreeData/Background2.png") {
        bgHandle = handle;
    }
    const info = {
        image: new Image(),
        bitmap: undefined,
    };

    imageHandles[handle] = info;
    info.image.src = name;
    info.image.loading = 'eager';
    info.image.onload = async (e) => {
        info.bitmap = await createImageBitmap(info.image);
        paint = true;
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
        // 312 32 1608 1016 -12.257495 -7.7447853 12.257495 7.7447853
        if (tLeft < 0 || tTop < 0 || tRight > 1 || tBottom > 1) {
            const pattern = ctx.createPattern(image.image, 'repeat');
            ctx.fillStyle = pattern;
            ctx.fillRect(viewport.x + x, viewport.y + y, width, height);
        } else {
            const sx = image.image.width * tLeft;
            const sy = image.image.height * tTop;
            const sw = image.image.width * (tRight - tLeft);
            let sh = image.image.height * (tBottom - tTop);
            // if (sh < 0) {
            //     sh = -sh;
            //     ctx.scale(1, -1);
            // }
            ctx.drawImage(image.bitmap, sx, sy, sw, sh, viewport.x + x, viewport.y + y, width, height);
        }
    } else if (imageHandle === 0) {
        ctx.fillRect(viewport.x + x, viewport.y + y, width, height);
    }
};

function setFont(ctx, height, font) {
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
}

window.DrawStringWidth = (height, font, text) => {
    // console.log('DrawStringWidth', height, font, text);
    const ctx = getCanvas().getContext('2d');
    setFont(ctx, height, font);
    const m = ctx.measureText(text);
    return m.width;
};
window.DrawString = (x, y, align, height, font, text) => {
    // console.log('DrawString', x, y, align, height, font, text);
    const ctx = getCanvas().getContext('2d');
    setFont(ctx, height, font);
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

let paint = false;

export const driver = {
    init: async () => {
        document.head.insertAdjacentHTML('beforeend', '<link rel="stylesheet" href="https://fonts.cdnfonts.com/css/liberation-sans">');
        document.head.insertAdjacentHTML('beforeend', '<link rel="stylesheet" href="https://fonts.cdnfonts.com/css/bitstream-vera-sans-mono">');
        SetDrawLayer(0, 0);

        (await engine)._test();

        const root = document.getElementById("layers");
        root.addEventListener("mousemove", (e) => {
            const rect = root.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            paint = true;
            // (await engine)._on_mouse_move(x, y);
        });

        const tick = async () => {
            if (paint) {
                paint = false;

                const start = performance.now();
                (await engine)._on_frame();
                const end = performance.now();
                console.debug(`Frame: ${end - start}ms`);
            }
            requestAnimationFrame(tick);
        };
        await tick();
    },
};
