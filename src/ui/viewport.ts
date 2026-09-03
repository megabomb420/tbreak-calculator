import { resolveViewportCss, type ViewportBox, type ViewportCss } from './viewport-metrics.ts';

export { resolveViewportCss } from './viewport-metrics.ts';
export type { ViewportBox, ViewportCss } from './viewport-metrics.ts';

export function applyViewportCss(style: CSSStyleDeclaration, css: ViewportCss): void {
  if (css.appHeightPx === null || css.chromeBleedPx === null) {
    style.removeProperty('--app-height');
    style.removeProperty('--chrome-bleed');
    return;
  }
  style.setProperty('--app-height', `${css.appHeightPx}px`);
  style.setProperty('--chrome-bleed', `${css.chromeBleedPx}px`);
}

export function readViewportBox(win: Window): ViewportBox {
  const visual = win.visualViewport;
  const nav = win.navigator as Navigator & { standalone?: boolean };
  return {
    visualHeight: visual?.height ?? 0,
    innerHeight: win.innerHeight,
    outerHeight: win.outerHeight,
    screenHeight: win.screen.height,
    clientHeight: win.document.documentElement.clientHeight,
    narrow: win.matchMedia('(max-width: 719px)').matches,
    standalone: win.matchMedia('(display-mode: standalone)').matches || nav.standalone === true,
  };
}

export function startViewportSync(win: Window = window): () => void {
  const root = win.document.documentElement;
  const apply = (): void => {
    applyViewportCss(root.style, resolveViewportCss(readViewportBox(win)));
  };
  apply();
  win.addEventListener('resize', apply);
  win.addEventListener('orientationchange', apply);
  win.visualViewport?.addEventListener('resize', apply);
  win.visualViewport?.addEventListener('scroll', apply);
  return () => {
    win.removeEventListener('resize', apply);
    win.removeEventListener('orientationchange', apply);
    win.visualViewport?.removeEventListener('resize', apply);
    win.visualViewport?.removeEventListener('scroll', apply);
  };
}
