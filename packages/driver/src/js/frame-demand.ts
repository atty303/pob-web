/** Outstanding frames, coalesced without shortening an existing render budget. */
export class FrameDemand {
  private remaining = 0;

  get pending(): number {
    return this.remaining;
  }

  request(count: number): void {
    if (Number.isFinite(count)) this.remaining = Math.max(this.remaining, Math.ceil(count));
  }

  /** Consume before rendering so requests made during that frame remain pending. */
  consume(): void {
    this.remaining = Math.max(0, this.remaining - 1);
  }

  clear(): void {
    this.remaining = 0;
  }
}
