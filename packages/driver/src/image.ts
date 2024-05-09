type ImageInfo = {
    element: HTMLImageElement;
    bitmap: ImageBitmap | undefined,
};

export class ImageRepository {
    private images: Map<number, ImageInfo> = new Map();

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
            image.src = __ASSET_PREFIX__ + src;
        });

        info.bitmap = await createImageBitmap(image);
    }

    get(handle: number): ImageInfo | undefined {
        return this.images.get(handle);
    }
}