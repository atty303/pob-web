import { Zip } from "@zenfs/archives";
import * as zenfs from "@zenfs/core";
import { WebAccess } from "@zenfs/dom";
import * as Comlink from "comlink";
import type { FilesystemConfig } from "./driver.ts";
import { markEnvironmentError } from "./error.ts";
import { FilesystemRpcHandler } from "./filesystem-handler.ts";
import { CloudflareKV } from "./fs.ts";
import type { PoeOAuthAuthorization } from "./poe-oauth.ts";
import { exposeRpcPort, prepareFetchHeaders, type RpcResult } from "./rpc.ts";
import type { SubScriptWorker } from "./sub.ts";
// @ts-types="./vite-worker.d.ts"
import SubWorkerObject from "./sub.ts?worker";

type BrokerCallbacks = {
  fetch: (url: string, headers: Record<string, string>, body?: string) => Promise<unknown>;
  oauthAuthorize: (url: string, timeoutMs: number) => Promise<PoeOAuthAuthorization>;
  paste: () => Promise<string>;
};

class AsyncBroker {
  private callbacks: BrokerCallbacks | undefined;
  private eventPort: MessagePort | undefined;
  private nextSubscriptId = 1;
  private subscripts = new Map<number, { worker: Worker; port: MessagePort }>();
  private filesystem = new FilesystemRpcHandler();
  private cloudDirectory: string | undefined;

  async start(
    port: MessagePort,
    eventPort: MessagePort,
    assetPrefix: string,
    config: FilesystemConfig,
    fetchCallback: BrokerCallbacks["fetch"],
    oauthAuthorizeCallback: BrokerCallbacks["oauthAuthorize"],
    pasteCallback: BrokerCallbacks["paste"],
  ) {
    this.callbacks = { fetch: fetchCallback, oauthAuthorize: oauthAuthorizeCallback, paste: pasteCallback };
    this.eventPort = eventPort;
    this.cloudDirectory = config.cloudflareKvAccessToken ? `/user/${config.userDirectory}/Builds/Cloud` : undefined;
    this.filesystem.reset(this.cloudDirectory);
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
    if (this.filesystem.handles(operation)) return await this.filesystem.handle(operation, args, data);
    return await this.handleOperation(operation, args, data);
  }

  private async handleOperation(operation: string, args: unknown[], data?: Uint8Array): Promise<RpcResult> {
    switch (operation) {
      case "fetch": {
        const headers = prepareFetchHeaders(args[1] as Record<string, string>);
        return {
          value: await this.callbacks!.fetch(args[0] as string, headers, args[2] as string | undefined),
        };
      }
      case "paste":
        return { value: await this.callbacks!.paste() };
      case "oauth_authorize":
        return { value: await this.callbacks!.oauthAuthorize(args[0] as string, args[1] as number) };
      case "subscript_start": {
        const id = this.nextSubscriptId++;
        const worker = new SubWorkerObject();
        const remote = Comlink.wrap<SubScriptWorker>(worker);
        const channel = new MessageChannel();
        this.subscripts.set(id, { worker, port: channel.port1 });
        exposeRpcPort(
          channel.port1,
          (nestedOperation, nestedArgs, nestedData) => this.handle(nestedOperation, nestedArgs, nestedData),
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
          .catch((error) => fail(error instanceof Error ? error.message : String(error)));
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

  private finishSubscript(id: number) {
    const subscript = this.subscripts.get(id);
    subscript?.worker.terminate();
    subscript?.port.close();
    this.subscripts.delete(id);
  }
}

Comlink.expose(new AsyncBroker());
