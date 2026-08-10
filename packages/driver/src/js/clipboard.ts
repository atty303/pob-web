export type ClipboardAction = { type: "copy" } | { type: "paste"; text: string };

export type ClipboardShortcut = ClipboardAction["type"];

export function resolveClipboardShortcut(key: string, primaryModifier: boolean): ClipboardShortcut | undefined {
  if (!primaryModifier) return undefined;
  switch (key.toLowerCase()) {
    case "c":
      return "copy";
    case "v":
      return "paste";
    default:
      return undefined;
  }
}

type TextClipboard = {
  readText(): Promise<string>;
  writeText(text: string): Promise<void>;
};

export class ClipboardController {
  constructor(
    private readonly clipboard: TextClipboard,
    private readonly warn: (message: string, error: unknown) => void = (message, error) => console.warn(message, error),
  ) {}

  async readText(): Promise<string | undefined> {
    try {
      return await this.clipboard.readText();
    } catch (error) {
      this.warn("Clipboard read was denied", error);
      return undefined;
    }
  }

  async writeText(text: string): Promise<void> {
    try {
      await this.clipboard.writeText(text);
    } catch (error) {
      this.warn("Clipboard write was denied", error);
    }
  }
}

export class PasteBuffer {
  private values: string[] = [];

  push(text: string): void {
    this.values.push(text);
  }

  take(): string | undefined {
    return this.values.shift();
  }

  clear(): void {
    this.values = [];
  }
}
