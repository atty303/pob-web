export const INSTANCE_STRIDE = 100;

export class InstanceBuffer {
  private buffer = new ArrayBuffer(INSTANCE_STRIDE * 1024);
  private bytes = new Uint8Array(this.buffer);
  private floats = new Float32Array(this.buffer);
  private view = new DataView(this.buffer);
  private count = 0;

  get length() {
    return this.count;
  }

  get data() {
    return new Uint8Array(this.buffer, 0, this.count * INSTANCE_STRIDE);
  }

  reset() {
    this.count = 0;
  }

  push(
    coords: number[],
    texCoords: number[],
    tintColor: number[],
    viewport: number[],
    textureSlot: number,
    textureLayer: number,
    maskLayer: number,
    glyph: boolean,
  ) {
    this.ensureCapacity(this.count + 1);
    const byteOffset = this.count * INSTANCE_STRIDE;
    const floatOffset = byteOffset / 4;
    this.floats.set(coords, floatOffset);
    this.floats.set(texCoords, floatOffset + 8);
    this.floats.set(viewport, floatOffset + 16);
    this.floats[floatOffset + 20] = textureSlot;
    this.floats[floatOffset + 21] = textureLayer;
    this.floats[floatOffset + 22] = maskLayer;
    this.floats[floatOffset + 23] = glyph ? 1 : 0;
    const packedColor = (Math.round(tintColor[0] * 255) << 24) |
      (Math.round(tintColor[1] * 255) << 16) |
      (Math.round(tintColor[2] * 255) << 8) |
      Math.round(tintColor[3] * 255);
    this.view.setUint32(byteOffset + 96, packedColor, true);
    this.count++;
  }

  private ensureCapacity(required: number) {
    const requiredBytes = required * INSTANCE_STRIDE;
    if (requiredBytes <= this.buffer.byteLength) return;
    const buffer = new ArrayBuffer(Math.max(requiredBytes, this.buffer.byteLength * 2));
    new Uint8Array(buffer).set(this.bytes);
    this.buffer = buffer;
    this.bytes = new Uint8Array(buffer);
    this.floats = new Float32Array(buffer);
    this.view = new DataView(buffer);
  }
}
