type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element;
  mozFullScreenElement?: Element;
  msFullscreenElement?: Element;
  webkitExitFullscreen?: () => void;
  webkitCancelFullScreen?: () => void;
  mozCancelFullScreen?: () => void;
  msExitFullscreen?: () => void;
};

type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => void;
  webkitEnterFullscreen?: () => void;
  mozRequestFullScreen?: () => void;
  msRequestFullscreen?: () => void;
};

export async function toggleFullscreen(
  element: HTMLElement,
  doc: FullscreenDocument = document,
  warn: (message: string, error?: unknown) => void = console.warn,
) {
  const target = element as FullscreenElement;
  const isFullscreen = !!(
    doc.fullscreenElement ||
    doc.webkitFullscreenElement ||
    doc.mozFullScreenElement ||
    doc.msFullscreenElement
  );

  try {
    if (!isFullscreen) {
      const request = target.requestFullscreen ?? target.webkitRequestFullscreen ?? target.webkitEnterFullscreen ??
        target.mozRequestFullScreen ?? target.msRequestFullscreen;
      if (!request) {
        warn("Fullscreen API not supported on this device");
        return;
      }
      await request.call(target);
      return;
    }

    const exit = doc.exitFullscreen ?? doc.webkitExitFullscreen ?? doc.webkitCancelFullScreen ??
      doc.mozCancelFullScreen ?? doc.msExitFullscreen;
    if (!exit) {
      warn("Fullscreen exit API not supported on this device");
      return;
    }
    await exit.call(doc);
  } catch (error) {
    warn("Fullscreen toggle failed", error);
  }
}
