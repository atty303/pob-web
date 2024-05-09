type ImageInfo = {
    element: HTMLImageElement;
    bitmap: ImageBitmap | undefined,
};

export class ImageRepository {
    private readonly prefix: string;
    private images: Map<number, ImageInfo> = new Map();

    constructor(prefix: string) {
        this.prefix = prefix;
    }

    async load(handle: number, src: string): Promise<void> {
        if (this.images.has(handle)) return;

        const image = new Image();
        const info: ImageInfo = {
            element: image,
            bitmap: undefined,
        };
        this.images.set(handle, info);

        await new Promise((resolve, reject) => {
            image.onload = resolve;
            image.onerror = reject;
            image.crossOrigin = "anonymous";
            image.src = this.prefix + src;
        });

        info.bitmap = await createImageBitmap(image);
    }

    get(handle: number): ImageInfo | undefined {
        return this.images.get(handle);
    }
}