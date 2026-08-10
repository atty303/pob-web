export const environmentErrorNames = {
  capability: "PobEnvironmentCapabilityError",
  assetLoad: "PobEnvironmentAssetLoadError",
  storage: "PobEnvironmentStorageError",
  renderingContext: "PobEnvironmentRenderingContextError",
} as const;

export type EnvironmentErrorCategory = keyof typeof environmentErrorNames;

const storagePathOperations = new Set(["readdir", "lstat", "stat", "open", "mkdir", "unlink", "rmdir", "truncate"]);
const storageDescriptorOperations = new Set(["fstat", "close", "read", "write", "ftruncate"]);

export function isLocalUserStorageOperation(
  operation: string,
  args: unknown[],
  localUserFds: ReadonlySet<number>,
  cloudDirectory?: string,
): boolean {
  const isLocalPath = (value: unknown) => {
    if (typeof value !== "string" || (value !== "/user" && !value.startsWith("/user/"))) return false;
    return !cloudDirectory || (value !== cloudDirectory && !value.startsWith(`${cloudDirectory}/`));
  };
  if (storagePathOperations.has(operation)) return isLocalPath(args[0]);
  if (operation === "rename") return isLocalPath(args[0]) && isLocalPath(args[1]);
  return storageDescriptorOperations.has(operation) && localUserFds.has(args[0] as number);
}

export function markEnvironmentError(error: unknown, category: EnvironmentErrorCategory): Error {
  const marked = error instanceof Error ? error : new Error(String(error));
  const stack = marked.stack;
  marked.name = environmentErrorNames[category];
  if (stack !== undefined) marked.stack = stack;
  return marked;
}

export function environmentErrorCategory(error: unknown): EnvironmentErrorCategory | undefined {
  if (!(error instanceof Error)) return undefined;

  for (const [category, name] of Object.entries(environmentErrorNames)) {
    if (error.name === name) return category as EnvironmentErrorCategory;
  }
  return undefined;
}

export function isEnvironmentError(error: unknown): boolean {
  return environmentErrorCategory(error) !== undefined;
}
