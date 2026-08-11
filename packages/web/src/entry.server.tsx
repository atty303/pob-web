import { isbot } from "isbot";
import { renderToReadableStream } from "react-dom/server.browser";
import type { AppLoadContext, EntryContext } from "react-router";
import { ServerRouter } from "react-router";

export const streamTimeout = 5_000;

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
  _loadContext: AppLoadContext,
) {
  let statusCode = responseStatusCode;
  let shellRendered = false;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), streamTimeout + 1_000);

  let stream: Awaited<ReturnType<typeof renderToReadableStream>>;
  try {
    stream = await renderToReadableStream(<ServerRouter context={routerContext} url={request.url} />, {
      signal: controller.signal,
      onError(error: unknown) {
        statusCode = 500;
        if (shellRendered) console.error(error);
      },
    });

    const userAgent = request.headers.get("user-agent");
    if ((userAgent && isbot(userAgent)) || routerContext.isSpaMode) await stream.allReady;
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
  shellRendered = true;
  responseHeaders.set("Content-Type", "text/html");
  if (new URL(request.url).pathname !== "/auth/poe-popup") {
    responseHeaders.set("Cross-Origin-Opener-Policy", "same-origin");
    responseHeaders.set("Cross-Origin-Embedder-Policy", "require-corp");
  }
  void stream.allReady.then(
    () => clearTimeout(timeout),
    () => clearTimeout(timeout),
  );
  return new Response(stream, { headers: responseHeaders, status: statusCode });
}
