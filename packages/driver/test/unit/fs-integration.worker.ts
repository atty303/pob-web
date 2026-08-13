import { configure, fs, InMemory } from "@zenfs/core";
import { FilesystemRpcHandler } from "../../src/js/filesystem-handler.ts";
import { exposeRpcPort, type RpcResult } from "../../src/js/rpc.ts";

type TraceEntry = {
  operation: string;
  args: unknown[];
  requestBytes: number;
  value: unknown;
  responseBytes: number;
};

const trace: TraceEntry[] = [];
const handler = new FilesystemRpcHandler();

self.onmessage = async ({ data }: MessageEvent<{ type: "start"; port: MessagePort } | { type: "snapshot" }>) => {
  if (data.type === "start") {
    await configure({ mounts: { "/": InMemory } });
    fs.mkdirSync("/user", { recursive: true });
    fs.mkdirSync("/user/Persisted");
    fs.writeFileSync("/user/Persisted/existing.xml", '<PathOfBuilding name="existing"/>');
    handler.reset();
    exposeRpcPort(data.port, recordFilesystemOperation);
    self.postMessage({ type: "ready" });
    return;
  }

  self.postMessage({
    type: "snapshot",
    snapshot: {
      files: {
        "/user/Path of Building/Builds/Saved Builds/alpha.xml": fs.readFileSync(
          "/user/Path of Building/Builds/Saved Builds/alpha.xml",
          "utf8",
        ),
        "/user/Path of Building/Builds/Saved Builds/beta.xml": fs.readFileSync(
          "/user/Path of Building/Builds/Saved Builds/beta.xml",
          "utf8",
        ),
      },
      trace,
    },
  });
};

async function recordFilesystemOperation(
  operation: string,
  args: unknown[],
  data?: Uint8Array,
): Promise<RpcResult> {
  const result = await handler.handle(operation, args, data);
  trace.push({
    operation,
    args,
    requestBytes: data?.byteLength ?? 0,
    value: result.value,
    responseBytes: result.data?.byteLength ?? 0,
  });
  return result;
}
