import { Format } from "./format.ts";

export class StorageLinear {
  readonly blockSize: number;
  readonly blockExtent: [number, number, number];

  constructor(
    readonly format: Format,
    readonly _extent: [number, number, number],
    readonly layers: number,
    readonly faces: number,
    readonly levels: number,
  ) {
    this.blockSize = Format.blockSize(this.format);
    this.blockExtent = Format.blockExtent(this.format);
  }

  blockCount(level: number) {
    const e = this.extent(level);
    return [
      ceilMultiple(e[0], this.blockExtent[0]) / this.blockExtent[0],
      ceilMultiple(e[1], this.blockExtent[1]) / this.blockExtent[1],
      ceilMultiple(e[2], this.blockExtent[2]) / this.blockExtent[2],
    ];
  }

  extent(level: number) {
    return [
      Math.max(this._extent[0] >> level, 1),
      Math.max(this._extent[1] >> level, 1),
      Math.max(this._extent[2] >> level, 1),
    ] as const;
  }

  levelSize(level: number) {
    const c = this.blockCount(level);
    return this.blockSize * c[0] * c[1] * c[2];
  }

  faceSize(baseLevel: number, maxLevel: number) {
    let size = 0;
    for (let level = baseLevel; level <= maxLevel; level++) {
      size += this.levelSize(level);
    }
    return size;
  }

  layerSize(baseFace: number, maxFace: number, baseLevel: number, maxLevel: number) {
    return this.faceSize(baseLevel, maxLevel) * (maxFace - baseFace + 1);
  }

  baseOffset(layer: number, face: number, level: number) {
    const layerSize = this.layerSize(0, this.faces - 1, 0, this.levels - 1);
    const faceSize = this.faceSize(0, this.levels - 1);

    let baseOffset = layerSize * layer + faceSize * face;
    for (let i = 0; i < level; i++) {
      baseOffset += this.levelSize(i);
    }
    return baseOffset;
  }
}

function ceilMultiple(value: number, multiple: number) {
  return Math.ceil(value / multiple) * multiple;
}
