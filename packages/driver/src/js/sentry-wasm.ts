type WasmResult = WebAssembly.WebAssemblyInstantiatedSource;
type WorkerTarget = { postMessage(message: unknown): void };

export function registerSentryWasm(worker: WorkerTarget): (codeFile: string) => void {
  let codeFile = "";
  const instantiate = WebAssembly.instantiate;
  const wrappedInstantiate = async (source: BufferSource, imports?: WebAssembly.Imports): Promise<WasmResult> => {
    const result = await instantiate(source, imports);
    try {
      const image = createDebugImage(result.module, codeFile);
      if (image) {
        worker.postMessage({ _sentryMessage: true, _sentryWasmImages: [image] });
      }
    } catch (error) {
      console.warn("Failed to register WebAssembly debug image", error);
    }
    return result;
  };
  WebAssembly.instantiate = wrappedInstantiate as typeof WebAssembly.instantiate;
  return value => {
    codeFile = value;
  };
}

function createDebugImage(module: WebAssembly.Module, codeFile: string) {
  const buildIdSection = WebAssembly.Module.customSections(module, "build_id")[0];
  if (!buildIdSection || !codeFile) return undefined;

  const codeId = Array.from(new Uint8Array(buildIdSection), byte => byte.toString(16).padStart(2, "0")).join("");
  const externalDebugSection = WebAssembly.Module.customSections(module, "external_debug_info")[0];
  const debugFile = externalDebugSection
    ? new URL(new TextDecoder().decode(externalDebugSection), codeFile).href
    : null;
  return {
    type: "wasm",
    code_id: codeId,
    code_file: codeFile,
    debug_file: debugFile,
    debug_id: `${codeId.padEnd(32, "0").slice(0, 32)}0`,
  };
}
