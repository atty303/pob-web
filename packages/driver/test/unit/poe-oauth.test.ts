import { assertEquals } from "@std/assert";
import {
  deserializeSubScriptValues,
  poeOAuthAuthorizationUrl,
  serializeSubScriptValues,
} from "../../src/js/poe-oauth.ts";

Deno.test("subscript values round trip through the browser serializer", () => {
  const values = [123.5, true, false, "result", "", undefined] as const;
  assertEquals(deserializeSubScriptValues(serializeSubScriptValues(values)), [...values]);
});

Deno.test("PoE OAuth LaunchServer requests are recognized without matching unrelated subscripts", () => {
  const script = 'local luaSocket = require("socket")\n-- OAuth authorization code';
  const url = "https://www.pathofexile.com/oauth/authorize?client_id=pob&response_type=code&scope=" +
    "account%3Aprofile%20account%3Aleagues%20account%3Acharacters%20account%3Atrade&state=sentinel";

  assertEquals(poeOAuthAuthorizationUrl(script, serializeSubScriptValues([url])), url);
  assertEquals(poeOAuthAuthorizationUrl("return true", serializeSubScriptValues([url])), undefined);
  assertEquals(
    poeOAuthAuthorizationUrl(script, serializeSubScriptValues([url.replace("client_id=pob", "client_id=other")])),
    undefined,
  );
});
