/**
 * iOS 26 Safari Liquid Glass overlay metrics.
 *
 * `100dvh` / `100svh` both end *above* the overlay toolbar. `100vh` on iOS 26
 * equals `window.outerHeight` and paints behind it. In-flow chrome then needs
 * extra bottom padding equal to (fill − visible).
 *
 * No UA sniffing, no per-device pixel tables.
 */

export interface ViewportBox {
  readonly visualHeight: number;
  readonly innerHeight: number;
  readonly outerHeight: number;
  readonly screenHeight: number;
  readonly clientHeight: number;
  readonly narrow: boolean;
  readonly standalone: boolean;
}

export interface ViewportCss {
  readonly appHeightPx: number | null;
  readonly chromeBleedPx: number | null;
}

function positive(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function pickVisible(box: ViewportBox): number {
  const inner = positive(box.innerHeight);
  const visual = positive(box.visualHeight);
  const client = positive(box.clientHeight);
  if (visual > 0 && inner > 0 && visual < inner * 0.85) {
    // Visual collapsed far below innerHeight → keyboard, not browser chrome.
    return inner;
  }
  return visual || inner || client;
}

function pickFill(box: ViewportBox, visible: number): number {
  const inner = positive(box.innerHeight);
  const client = positive(box.clientHeight);
  const outer = positive(box.outerHeight);
  const screen = positive(box.screenHeight);
  const candidates = [visible, inner, client];
  // outerHeight is the iOS 26 "behind chrome" size. Trust it only when the
  // window is nearly the device screen (Safari / standalone), not when it is
  // a smaller embedded viewport or a desktop window frame.
  const nearlyFullscreen = screen > 0 && outer >= screen * 0.9 && outer <= screen + 2;
  if (nearlyFullscreen) {
    candidates.push(outer);
  }
  return Math.max(...candidates);
}

export function resolveViewportCss(box: ViewportBox): ViewportCss {
  if (!box.narrow && !box.standalone) {
    return { appHeightPx: null, chromeBleedPx: null };
  }
  const visible = pickVisible(box);
  if (visible === 0) {
    return { appHeightPx: null, chromeBleedPx: null };
  }
  const fill = pickFill(box, visible);
  return {
    appHeightPx: Math.round(fill),
    chromeBleedPx: Math.max(0, Math.round(fill - visible)),
  };
}
