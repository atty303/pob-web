import { Zip } from "@zenfs/archives";
import * as zenfs from "@zenfs/core";
import { WebAccess } from "@zenfs/dom";
import * as Comlink from "comlink";
import type { FilesystemConfig } from "./driver.ts";
import { isLocalUserStorageOperation, markEnvironmentError } from "./error.ts";
import { CloudflareKV } from "./fs.ts";
import { exposeRpcPort, prepareFetchHeaders, type RpcResult } from "./rpc.ts";
import type { SubScriptWorker } from "./sub.ts";
import SubWorkerObject from "./sub.ts?worker";

type BrokerCallbacks = {
  fetch: (url: string, headers: Record<string, string>, body?: string) => Promise<unknown>;
  paste: () => Promise<string>;
};

class AsyncBroker {
  private callbacks: BrokerCallbacks | undefined;
  private eventPort: MessagePort | undefined;
  private nextSubscriptId = 1;
  private subscripts = new Map<number, { worker: Worker; port: MessagePort }>();
  private localUserFds = new Set<number>();
  private cloudDirectory: string | undefined;

  async start(
    port: MessagePort,
    eventPort: MessagePort,
    assetPrefix: string,
    config: FilesystemConfig,
    fetchCallback: BrokerCallbacks["fetch"],
    pasteCallback: BrokerCallbacks["paste"],
  ) {
    this.callbacks = { fetch: fetchCallback, paste: pasteCallback };
    this.eventPort = eventPort;
    this.localUserFds.clear();
    this.cloudDirectory = config.cloudflareKvAccessToken ? `/user/${config.userDirectory}/Builds/Cloud` : undefined;
    let rootZipData: ArrayBuffer;
    try {
      const rootZip = await fetch(`${assetPrefix}/root.zip`);
      if (!rootZip.ok) throw new Error(`Failed to load root.zip (${rootZip.status} ${rootZip.statusText})`);
      rootZipData = await rootZip.arrayBuffer();
    } catch (error) {
      throw markEnvironmentError(error, "assetLoad");
    }

    const rootFileSystem = await zenfs.resolveMountConfig({ backend: Zip, data: rootZipData, name: "root.zip" });

    let userFileSystem: Awaited<ReturnType<typeof zenfs.resolveMountConfig<typeof WebAccess>>>;
    try {
      const userDirectory = await navigator.storage.getDirectory();
      userFileSystem = await zenfs.resolveMountConfig({
        backend: WebAccess,
        handle: userDirectory,
        disableAsyncCache: true,
      });
    } catch (error) {
      throw markEnvironmentError(error, "storage");
    }

    await zenfs.configure({
      mounts: {
        "/root": rootFileSystem,
        "/user": userFileSystem,
      },
    });
    if (config.cloudflareKvAccessToken) {
      const cloud = await zenfs.resolveMountConfig({
        backend: CloudflareKV,
        prefix: config.cloudflareKvPrefix,
        token: config.cloudflareKvAccessToken,
        namespace: config.cloudflareKvUserNamespace,
      });
      const directory = this.cloudDirectory!;
      if (!(await zenfs.promises.exists(directory))) await zenfs.promises.mkdir(directory, { recursive: true });
      zenfs.mount(directory, cloud);
      if (!(await zenfs.promises.exists(`${directory}/Public`))) await zenfs.promises.mkdir(`${directory}/Public`);
    }
    exposeRpcPort(port, (operation, args, data) => this.handle(operation, args, data));
  }

  private async handle(operation: string, args: unknown[], data?: Uint8Array): Promise<RpcResult> {
    try {
      return await this.handleOperation(operation, args, data);
    } catch (error) {
      if (isLocalUserStorageOperation(operation, args, this.localUserFds, this.cloudDirectory)) {
        throw markEnvironmentError(error, "storage");
      }
      throw error;
    }
  }

  private async handleOperation(operation: string, args: unknown[], data?: Uint8Array): Promise<RpcResult> {
    const fs = zenfs.fs;
    switch (operation) {
      case "readdir": {
        const entries = await fs.promises.readdir(args[0] as string, { withFileTypes: true });
        return { value: entries.map(entry => [entry.name, entry.isFile() ? 1 : entry.isDirectory() ? 2 : 3]) };
      }
      case "lstat":
        return { value: this.serializeStat(await fs.promises.lstat(args[0] as string)) };
      case "stat":
        return { value: this.serializeStat(await fs.promises.stat(args[0] as string)) };
      case "fstat":
        return {
          value: this.serializeStat(
            await new Promise<zenfs.Stats>((resolve, reject) =>
              fs.fstat(args[0] as number, (e, value) => (e ? reject(e) : resolve(value!))),
            ),
          ),
        };
      case "open": {
        const fd = (await fs.promises.open(args[0] as string, args[1] as string, args[2] as number | undefined)).fd;
        if (isLocalUserStorageOperation(operation, args, this.localUserFds, this.cloudDirectory)) {
          this.localUserFds.add(fd);
        }
        return {
          value: fd,
        };
      }
      case "close":
        await new Promise<void>((resolve, reject) => fs.close(args[0] as number, e => (e ? reject(e) : resolve())));
        this.localUserFds.delete(args[0] as number);
        return { value: 0 };
      case "read": {
        const buffer = new Uint8Array(args[1] as number);
        const bytesRead = await new Promise<number>((resolve, reject) =>
          fs.read(args[0] as number, buffer, 0, buffer.length, args[2] as number, (e, n) =>
            e ? reject(e) : resolve(n ?? 0),
          ),
        );
        return { value: bytesRead, data: buffer.subarray(0, bytesRead) };
      }
      case "write": {
        const written = await new Promise<number>((resolve, reject) =>
          fs.write(args[0] as number, data!, 0, data!.length, args[1] as number, (e, n) =>
            e ? reject(e) : resolve(n ?? 0),
          ),
        );
        return { value: written };
      }
      case "mkdir":
        await fs.promises.mkdir(args[0] as string, args[1] as number);
        return { value: 0 };
      case "unlink":
        await fs.promises.unlink(args[0] as string);
        return { value: 0 };
      case "rmdir":
        await fs.promises.rmdir(args[0] as string);
        return { value: 0 };
      case "rename":
        await fs.promises.rename(args[0] as string, args[1] as string);
        return { value: 0 };
      case "truncate":
        await fs.promises.truncate(args[0] as string, args[1] as number);
        return { value: 0 };
      case "ftruncate":
        await new Promise<void>((resolve, reject) =>
          fs.ftruncate(args[0] as number, args[1] as number, e => (e ? reject(e) : resolve())),
        );
        return { value: 0 };
      case "fetch": {
        const headers = prepareFetchHeaders(args[1] as Record<string, string>);
        return {
          value: await this.callbacks!.fetch(args[0] as string, headers, args[2] as string | undefined),
        };
      }
      case "paste":
        return { value: await this.callbacks!.paste() };
      case "subscript_start": {
        const id = this.nextSubscriptId++;
        const worker = new SubWorkerObject();
        const remote = Comlink.wrap<SubScriptWorker>(worker);
        const channel = new MessageChannel();
        this.subscripts.set(id, { worker, port: channel.port1 });
        exposeRpcPort(channel.port1, (nestedOperation, nestedArgs, nestedData) =>
          this.handle(nestedOperation, nestedArgs, nestedData),
        );
        const finish = (result: Uint8Array) => {
          if (!this.subscripts.has(id)) return;
          this.eventPort?.postMessage({ type: "subscript_finished", id, data: result }, [result.buffer]);
          this.finishSubscript(id);
        };
        const fail = (message: string) => {
          if (!this.subscripts.has(id)) return;
          this.eventPort?.postMessage({ type: "subscript_error", id, message });
          this.finishSubscript(id);
        };
        void remote
          .start(
            args[0] as string,
            data!,
            Comlink.transfer(channel.port2, [channel.port2]),
            Comlink.proxy(finish),
            Comlink.proxy(fail),
          )
          .catch(error => fail(error instanceof Error ? error.message : String(error)));
        return { value: id };
      }
      case "subscript_abort":
        this.finishSubscript(args[0] as number);
        return { value: 0 };
      case "subscript_running":
        return { value: this.subscripts.has(args[0] as number) };
      default:
        throw new Error(`Unknown RPC operation: ${operation}`);
    }
  }

  private serializeStat(stat: zenfs.Stats) {
    return { mode: stat.mode, size: stat.size };
  }

  private finishSubscript(id: number) {
    const subscript = this.subscripts.get(id);
    subscript?.worker.terminate();
    subscript?.port.close();
    this.subscripts.delete(id);
  }
}

Comlink.expose(new AsyncBroker());
