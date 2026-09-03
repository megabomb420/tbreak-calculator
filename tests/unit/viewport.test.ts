import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveViewportCss, type ViewportBox } from '../../src/ui/viewport-metrics.ts';

function box(overrides: Partial<ViewportBox>): ViewportBox {
  return {
    visualHeight: 800,
    innerHeight: 800,
    outerHeight: 800,
    screenHeight: 874,
    clientHeight: 800,
    narrow: true,
    standalone: false,
    ...overrides,
  };
}

describe('viewport metrics (iOS 26 Liquid Glass overlay)', () => {
  it('leaves CSS variables to the stylesheet on a wide desktop viewport', () => {
    const css = resolveViewportCss(box({ narrow: false, standalone: false, outerHeight: 1200, screenHeight: 1080 }));
    assert.equal(css.appHeightPx, null);
    assert.equal(css.chromeBleedPx, null);
  });

  it('fills behind an expanded iOS 26 bottom toolbar and pads the in-flow chrome', () => {
    const css = resolveViewportCss(
      box({
        visualHeight: 658,
        innerHeight: 658,
        outerHeight: 874,
        screenHeight: 874,
        clientHeight: 658,
        narrow: true,
      }),
    );
    assert.equal(css.appHeightPx, 874);
    assert.equal(css.chromeBleedPx, 216);
  });

  it('shrinks the bleed when overlay chrome collapses', () => {
    const css = resolveViewportCss(
      box({
        visualHeight: 754,
        innerHeight: 754,
        outerHeight: 874,
        screenHeight: 874,
        clientHeight: 754,
        narrow: true,
      }),
    );
    assert.equal(css.appHeightPx, 874);
    assert.equal(css.chromeBleedPx, 120);
  });

  it('does not invent bleed in a standalone PWA where the viewports agree', () => {
    const css = resolveViewportCss(
      box({
        visualHeight: 874,
        innerHeight: 874,
        outerHeight: 874,
        screenHeight: 874,
        clientHeight: 874,
        narrow: true,
        standalone: true,
      }),
    );
    assert.equal(css.appHeightPx, 874);
    assert.equal(css.chromeBleedPx, 0);
  });

  it('does not treat a desktop outerHeight larger than the screen as fill', () => {
    const css = resolveViewportCss(
      box({
        visualHeight: 800,
        innerHeight: 800,
        outerHeight: 1100,
        screenHeight: 874,
        clientHeight: 800,
        narrow: true,
      }),
    );
    assert.equal(css.appHeightPx, 800);
    assert.equal(css.chromeBleedPx, 0);
  });

  it('does not use outerHeight when the window is not nearly fullscreen', () => {
    const css = resolveViewportCss(
      box({
        visualHeight: 844,
        innerHeight: 844,
        outerHeight: 900,
        screenHeight: 1080,
        clientHeight: 844,
        narrow: true,
      }),
    );
    assert.equal(css.appHeightPx, 844);
    assert.equal(css.chromeBleedPx, 0);
  });

  it('does not treat the on-screen keyboard as overlay chrome', () => {
    const css = resolveViewportCss(
      box({
        visualHeight: 400,
        innerHeight: 874,
        outerHeight: 874,
        screenHeight: 874,
        clientHeight: 874,
        narrow: true,
      }),
    );
    assert.equal(css.appHeightPx, 874);
    assert.equal(css.chromeBleedPx, 0);
  });
});
