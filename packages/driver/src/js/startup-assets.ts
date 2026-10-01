/** Begin independent startup prerequisites together; Lua waits for all three. */
export async function loadStartupAssets<T>(
  loadModule: () => Promise<T>,
  loadFonts: () => Promise<void>,
  filesystemReady: () => Promise<void>,
): Promise<T> {
  const [module] = await Promise.all([loadModule(), loadFonts(), filesystemReady()]);
  return module;
}
