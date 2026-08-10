export type RpcRequest = {
  operation: string;
  args: unknown[];
  data?: Uint8Array;
  shared: SharedArrayBuffer;
};

export type RpcResult<T = unknown> = { value: T; data?: Uint8Array };

export type RpcErrorMetadata = { message?: string; code?: string; name?: string };

export function restoreRpcError(metadata: RpcErrorMetadata, fallbackMessage: string): Error {
  const error = new Error(metadata.message ?? fallbackMessage);
  if (metadata.name) error.name = metadata.name;
  Object.assign(error, { code: metadata.code });
  return error;
}

export function rpcErrorMetadata(cause: unknown): RpcErrorMetadata {
  const error = cause as Error & { code?: string };
  return { message: error.message, code: error.code, name: error.name };
}

const HEADER_BYTES = 16;
const RPC_TIMEOUT_MS = 120_000;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function prepareFetchHeaders(headers: Record<string, string>) {
  if (Object.entries(headers).some(([key, value]) => /poesessid/i.test(key) || /poesessid/i.test(value))) {
    throw new Error("POESESSID is not allowed to be sent to the server");
  }
  if (Object.keys(headers).some(key => key.toLowerCase() === "content-type")) return headers;
  return { ...headers, "Content-Type": "application/x-www-form-urlencoded" };
}

export function createRpcClient(port: MessagePort) {
  let requestId = 0;
  return <T>(operation: string, args: unknown[] = [], data?: Uint8Array, capacity = 1024 * 1024): RpcResult<T> => {
    const shared = new SharedArrayBuffer(HEADER_BYTES + capacity);
    const control = new Int32Array(shared, 0, HEADER_BYTES / Int32Array.BYTES_PER_ELEMENT);
    port.postMessage({ operation, args: [++requestId, ...args], data, shared } satisfies RpcRequest);
    const deadline = performance.now() + RPC_TIMEOUT_MS;
    while (Atomics.load(control, 0) === 0) {
      const remaining = deadline - performance.now();
      if (remaining <= 0 || Atomics.wait(control, 0, 0, remaining) === "timed-out") {
        throw new Error(`RPC ${operation} timed out`);
      }
    }

    const jsonLength = Atomics.load(control, 1);
    const dataLength = Atomics.load(control, 2);
    const bytes = new Uint8Array(shared, HEADER_BYTES);
    const metadataBytes = new Uint8Array(jsonLength);
    metadataBytes.set(bytes.subarray(0, jsonLength));
    const metadata = JSON.parse(decoder.decode(metadataBytes)) as RpcErrorMetadata & { value?: T };
    if (Atomics.load(control, 0) !== 1) {
      throw restoreRpcError(metadata, `RPC ${operation} failed`);
    }
    const resultData = dataLength ? new Uint8Array(dataLength) : undefined;
    resultData?.set(bytes.subarray(jsonLength, jsonLength + dataLength));
    return { value: metadata.value as T, data: resultData };
  };
}

export function exposeRpcPort(
  port: MessagePort,
  handle: (operation: string, args: unknown[], data?: Uint8Array) => Promise<RpcResult>,
) {
  port.onmessage = async ({ data: request }: MessageEvent<RpcRequest>) => {
    const control = new Int32Array(request.shared, 0, HEADER_BYTES / Int32Array.BYTES_PER_ELEMENT);
    const output = new Uint8Array(request.shared, HEADER_BYTES);
    try {
      const result = await handle(request.operation, request.args.slice(1), request.data);
      const metadata = encoder.encode(JSON.stringify({ value: result.value }));
      const binary = result.data ?? new Uint8Array();
      if (metadata.length + binary.length > output.length)
        throw new Error(`RPC ${request.operation} response is too large`);
      output.set(metadata);
      output.set(binary, metadata.length);
      Atomics.store(control, 1, metadata.length);
      Atomics.store(control, 2, binary.length);
      Atomics.store(control, 0, 1);
    } catch (cause) {
      const metadata = encoder.encode(JSON.stringify(rpcErrorMetadata(cause)));
      output.set(metadata.subarray(0, output.length));
      Atomics.store(control, 1, Math.min(metadata.length, output.length));
      Atomics.store(control, 0, 2);
    }
    Atomics.notify(control, 0);
  };
  port.start();
}
