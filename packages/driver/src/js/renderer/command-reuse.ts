/** Bounded, collision-free identity check for one previously rendered frame. */
export class CommandReuse {
  private bytes = new Uint8Array(0);
  private length = -1;
  private generation: number | string = -1;
  invalidate() {
    this.length = -1;
  }
  matches(view: DataView, generation: number | string): boolean {
    if (view.byteLength !== this.length || generation !== this.generation) return false;
    // DataView supports any native buffer alignment; four-byte chunks avoid a
    // hash collision ever suppressing a changed draw command.
    const previous = new DataView(this.bytes.buffer);
    let i = 0;
    for (; i + 4 <= view.byteLength; i += 4) if (view.getUint32(i) !== previous.getUint32(i)) return false;
    for (; i < view.byteLength; i++) if (view.getUint8(i) !== this.bytes[i]) return false;
    return true;
  }
  remember(view: DataView, generation: number | string) {
    if (view.byteLength > 8 * 1024 * 1024) {
      this.invalidate();
      return;
    }
    if (this.bytes.byteLength < view.byteLength) {
      this.bytes = new Uint8Array(2 ** Math.ceil(Math.log2(view.byteLength)));
    }
    this.bytes.set(new Uint8Array(view.buffer, view.byteOffset, view.byteLength));
    this.length = view.byteLength;
    this.generation = generation;
  }
}
