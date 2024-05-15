type ImageInfo = {
  bitmap: ImageBitmap | undefined;
  flags: number;
};

export enum TextureFlags {
  TF_CLAMP = 1,
  TF_NOMIPMAP = 2,
  TF_NEAREST = 4,
}

export class ImageRepository {
  private readonly prefix: string;
  private images: Map<number, ImageInfo> = new Map();

  constructor(prefix: string) {
    this.prefix = prefix;
  }

  async load(handle: number, src: string, flags: number): Promise<void> {
    if (this.images.has(handle)) return;

    const info: ImageInfo = {
      bitmap: undefined,
      flags,
    };
    this.images.set(handle, info);

    const r = await fetch(this.prefix + src, { referrerPolicy: "no-referrer" });
    if (r.ok) {
      const blob = await r.blob();
      info.bitmap = await createImageBitmap(blob);
    }
  }

  get(handle: number): ImageInfo | undefined {
    return this.images.get(handle);
  }
}
