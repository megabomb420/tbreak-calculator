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
  readonly outerWidth: number;
  readonly screenWidth: number;
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

/**
 * True only when the window *is* the device screen: mobile browsers, standalone
 * PWAs, fullscreen. A desktop window can be as tall as the screen while its own
 * page viewport is far shorter (390x844 page inside a 932-tall window on a
 * 932-tall screen) and desktop chrome is never painted over the page, so
 * treating such a window as "behind chrome" fill strands the header and the
 * in-flow tab bar outside the viewport with a scrollable blank strip.
 */
function pickFill(box: ViewportBox, visible: number): number {
  const inner = positive(box.innerHeight);
  const client = positive(box.clientHeight);
  const outerWidth = positive(box.outerWidth);
  const outerHeight = positive(box.outerHeight);
  const screenWidth = positive(box.screenWidth);
  const screenHeight = positive(box.screenHeight);
  const windowSpansScreen =
    screenWidth > 0 &&
    screenHeight > 0 &&
    outerWidth >= screenWidth - 2 &&
    outerWidth <= screenWidth + 2 &&
    outerHeight >= screenHeight * 0.9 &&
    outerHeight <= screenHeight + 2;
  const candidates = [visible, inner, client];
  // outerHeight is the iOS 26 "behind chrome" size. Trust it only when the
  // window spans the device screen, not when it is a desktop window frame.
  if (windowSpansScreen) {
    candidates.push(outerHeight);
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
