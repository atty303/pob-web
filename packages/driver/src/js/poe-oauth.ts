const decoder = new TextDecoder();
const encoder = new TextEncoder();

const TYPE_DOUBLE = 0;
const TYPE_BOOLEAN = 1;
const TYPE_STRING = 2;

export type SubScriptValue = number | boolean | string | undefined;

export type PoeOAuthAuthorization = {
  code?: string;
  error?: string;
  state: string;
  port: number;
};

export type PoeOAuthAuthorizationRequest = {
  url: string;
  timeoutMs: number;
};

export function serializePoeOAuthAuthorization(result: PoeOAuthAuthorization): Uint8Array {
  return serializeSubScriptValues([result.code, result.error, result.state, result.port]);
}

export function deserializeSubScriptValues(data: Uint8Array): SubScriptValue[] {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let offset = 0;
  const readUint32 = () => {
    const value = view.getUint32(offset, true);
    offset += 4;
    return value;
  };
  const count = readUint32();
  const values: SubScriptValue[] = [];
  for (let index = 0; index < count; index += 1) {
    const type = readUint32();
    if (type === TYPE_DOUBLE) {
      values.push(view.getFloat64(offset, true));
      offset += 8;
    } else if (type === TYPE_BOOLEAN) {
      values.push(readUint32() !== 0);
    } else if (type === TYPE_STRING) {
      const length = readUint32();
      if (length === 0) {
        values.push(undefined);
      } else {
        values.push(decoder.decode(data.subarray(offset, offset + length - 1)));
        offset += length;
      }
    } else {
      throw new Error(`Unsupported subscript value type ${type}`);
    }
  }
  if (offset !== data.length) throw new Error("Unexpected trailing subscript data");
  return values;
}

export function serializeSubScriptValues(values: readonly SubScriptValue[]): Uint8Array {
  const encoded = values.map((value) => typeof value === "string" ? encoder.encode(value) : undefined);
  const byteLength = 4 + values.reduce<number>((size, value, index) => {
    if (typeof value === "number") return size + 4 + 8;
    if (typeof value === "boolean") return size + 4 + 4;
    return size + 4 + 4 + (encoded[index]?.length ?? -1) + 1;
  }, 0);
  const data = new Uint8Array(byteLength);
  const view = new DataView(data.buffer);
  let offset = 0;
  const writeUint32 = (value: number) => {
    view.setUint32(offset, value, true);
    offset += 4;
  };
  writeUint32(values.length);
  values.forEach((value, index) => {
    if (typeof value === "number") {
      writeUint32(TYPE_DOUBLE);
      view.setFloat64(offset, value, true);
      offset += 8;
    } else if (typeof value === "boolean") {
      writeUint32(TYPE_BOOLEAN);
      writeUint32(value ? 1 : 0);
    } else {
      writeUint32(TYPE_STRING);
      const bytes = encoded[index];
      writeUint32(bytes ? bytes.length + 1 : 0);
      if (bytes) {
        data.set(bytes, offset);
        offset += bytes.length + 1;
      }
    }
  });
  return data;
}

export function poeOAuthAuthorizationRequest(
  script: string,
  data: Uint8Array,
): PoeOAuthAuthorizationRequest | undefined {
  if (!script.includes('require("socket")') || !script.includes("OAuth authorization code")) return undefined;
  const timeoutSeconds = Number(script.match(/local stopAt = os\.time\(\) \+ (\d+)/)?.[1]);
  if (!Number.isInteger(timeoutSeconds) || timeoutSeconds < 1 || timeoutSeconds > 300) return undefined;
  const [url] = deserializeSubScriptValues(data);
  if (typeof url !== "string") return undefined;
  const authorizationUrl = new URL(url);
  const scopes = new Set(authorizationUrl.searchParams.get("scope")?.split(" "));
  const requiredScopes = ["account:profile", "account:leagues", "account:characters", "account:trade"];
  if (
    authorizationUrl.origin !== "https://www.pathofexile.com" ||
    authorizationUrl.pathname !== "/oauth/authorize" ||
    authorizationUrl.searchParams.get("client_id") !== "pob" ||
    authorizationUrl.searchParams.get("response_type") !== "code" ||
    !requiredScopes.every((scope) => scopes.has(scope)) ||
    !authorizationUrl.searchParams.has("state")
  ) {
    return undefined;
  }
  return { url, timeoutMs: timeoutSeconds * 1_000 };
}
