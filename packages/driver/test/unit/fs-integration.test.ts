import { assert, assertEquals } from "@std/assert";
import { createRpcClient } from "../../src/js/rpc.ts";

type TraceEntry = {
  operation: string;
  args: unknown[];
  requestBytes: number;
  value: unknown;
  responseBytes: number;
};

type Snapshot = {
  files: Record<string, string>;
  trace: TraceEntry[];
};

Deno.test("Lua filesystem operations round trip through production RPC and ZenFS", async () => {
  const worker = new Worker(new URL("./fs-integration.worker.ts", import.meta.url).href, { type: "module" });
  const channel = new MessageChannel();

  try {
    const ready = waitForMessage<{ type: "ready" }>(worker, "ready");
    worker.postMessage({ type: "start", port: channel.port1 }, [channel.port1]);
    await ready;

    const { default: createModule } = await import("../../build/driver_fs_integration_test.mjs");
    await createModule({ rpcCall: createRpcClient(channel.port2) });

    const snapshotPromise = waitForMessage<{ type: "snapshot"; snapshot: Snapshot }>(worker, "snapshot");
    worker.postMessage({ type: "snapshot" });
    const { snapshot } = await snapshotPromise;

    assertEquals(snapshot.files, {
      "/user/Path of Building/Builds/Saved Builds/alpha.xml": '<PathOfBuilding name="alpha"/>',
      "/user/Path of Building/Builds/Saved Builds/beta.xml": '<PathOfBuilding name="beta"/>',
    });

    const operations = snapshot.trace.map((entry) => entry.operation);
    for (const operation of ["mkdir", "open", "write", "readdir", "lstat", "stat", "fstat", "read", "close"]) {
      assert(operations.includes(operation), `Missing production RPC operation: ${operation}`);
    }
    assert(
      snapshot.trace.some((entry) =>
        entry.operation === "mkdir" &&
        entry.args[0] === "/user/Path of Building/Builds/Saved Builds" &&
        typeof entry.args[1] === "number"
      ),
      "mkdir must preserve the production path and mode arguments",
    );
    assert(
      snapshot.trace.some((entry) =>
        entry.operation === "readdir" && entry.args[0] === "/user/Path of Building/Builds/Saved Builds"
      ),
      "readdir must preserve the production directory path",
    );
    assert(
      snapshot.trace.some((entry) =>
        entry.operation === "write" && typeof entry.args[0] === "number" && entry.args[1] === 0 &&
        entry.requestBytes > 0
      ),
      "write must preserve the fd, position, and binary request",
    );
    assert(
      snapshot.trace.some((entry) =>
        entry.operation === "read" && typeof entry.args[0] === "number" && typeof entry.args[1] === "number" &&
        entry.args[2] === 0 && entry.responseBytes > 0
      ),
      "read must preserve the fd, length, position, and binary response",
    );
    assert(
      snapshot.trace.some((entry) =>
        entry.operation === "readdir" &&
        Array.isArray(entry.value) &&
        entry.value.some((item) => Array.isArray(item) && item[0] === "Saved Builds" && item[1] === 2)
      ),
      "Directory entries must preserve the production directory type",
    );
    assert(
      snapshot.trace.some((entry) =>
        (entry.operation === "stat" || entry.operation === "lstat") &&
        typeof entry.value === "object" && entry.value !== null &&
        [0o040000, 0o100000].includes((entry.value as { mode: number }).mode & 0o170000)
      ),
      "Stat responses must preserve the production mode",
    );
  } finally {
    channel.port2.close();
    worker.terminate();
  }
});

function waitForMessage<T extends { type: string }>(worker: Worker, type: T["type"]): Promise<T> {
  return new Promise((resolve, reject) => {
    const onMessage = (event: MessageEvent<T>) => {
      if (event.data.type !== type) return;
      cleanup();
      resolve(event.data);
    };
    const onError = (event: ErrorEvent) => {
      cleanup();
      reject(event.error ?? new Error(event.message));
    };
    const cleanup = () => {
      worker.removeEventListener("message", onMessage as EventListener);
      worker.removeEventListener("error", onError);
    };
    worker.addEventListener("message", onMessage as EventListener);
    worker.addEventListener("error", onError);
  });
}
