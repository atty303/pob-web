type ImageInfo = {
	bitmap: ImageBitmap | undefined;
};

export class ImageRepository {
	private readonly prefix: string;
	private images: Map<number, ImageInfo> = new Map();

	constructor(prefix: string) {
		this.prefix = prefix;
	}

	async load(handle: number, src: string): Promise<void> {
		if (this.images.has(handle)) return;

		const info: ImageInfo = {
			bitmap: undefined,
		};
		this.images.set(handle, info);

		const r = await fetch(this.prefix + src);
		if (r.ok) {
			const blob = await r.blob();
			info.bitmap = await createImageBitmap(blob);
		}
	}

	get(handle: number): ImageInfo | undefined {
		return this.images.get(handle);
	}
}
