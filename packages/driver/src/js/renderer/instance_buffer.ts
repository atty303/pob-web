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

  pushQuad(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number,
    x4: number,
    y4: number,
    s1: number,
    t1: number,
    s2: number,
    t2: number,
    s3: number,
    t3: number,
    s4: number,
    t4: number,
    viewportX: number,
    viewportY: number,
    viewportWidth: number,
    viewportHeight: number,
    textureSlot: number,
    textureLayer: number,
    maskLayer: number,
    glyph: boolean,
    packedColor: number,
  ) {
    this.ensureCapacity(this.count + 1);
    const byteOffset = this.count * INSTANCE_STRIDE;
    const floatOffset = byteOffset / 4;
    this.floats[floatOffset] = x1;
    this.floats[floatOffset + 1] = y1;
    this.floats[floatOffset + 2] = x2;
    this.floats[floatOffset + 3] = y2;
    this.floats[floatOffset + 4] = x3;
    this.floats[floatOffset + 5] = y3;
    this.floats[floatOffset + 6] = x4;
    this.floats[floatOffset + 7] = y4;
    this.floats[floatOffset + 8] = s1;
    this.floats[floatOffset + 9] = t1;
    this.floats[floatOffset + 10] = s2;
    this.floats[floatOffset + 11] = t2;
    this.floats[floatOffset + 12] = s3;
    this.floats[floatOffset + 13] = t3;
    this.floats[floatOffset + 14] = s4;
    this.floats[floatOffset + 15] = t4;
    this.floats[floatOffset + 16] = viewportX;
    this.floats[floatOffset + 17] = viewportY;
    this.floats[floatOffset + 18] = viewportWidth;
    this.floats[floatOffset + 19] = viewportHeight;
    this.floats[floatOffset + 20] = textureSlot;
    this.floats[floatOffset + 21] = textureLayer;
    this.floats[floatOffset + 22] = maskLayer;
    this.floats[floatOffset + 23] = glyph ? 1 : 0;
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
