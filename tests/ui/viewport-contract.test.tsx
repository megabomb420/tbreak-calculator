import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fireEvent, render, screen } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { App } from '../../src/ui/app.tsx';
import { FIRST_LAUNCH } from '../../src/ui/copy.ts';
import { createMemoryStorage } from '../../src/infrastructure/storage/storage-adapter.ts';
import { fixedClock } from '../../src/infrastructure/clock.ts';
import { toInstant } from '../../src/domain/schemas/time.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
// Keep selector assertions portable across Git's LF/CRLF checkout settings.
const CSS = readFileSync(resolve(ROOT, 'src/ui/styles.css'), 'utf8').replace(/\r\n/g, '\n');
const INDEX_HTML = readFileSync(resolve(ROOT, 'index.html'), 'utf8');
const clock = fixedClock(toInstant(1787184000000));

function blockFor(css: string, startMarker: string): string {
  const start = css.indexOf(startMarker);
  expect(start, `missing CSS block starting ${startMarker}`).toBeGreaterThan(-1);
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  return css.slice(open + 1, close);
}

function declarationValues(block: string, property: string): string[] {
  const pattern = new RegExp(`(?:^|\\n)\\s*${property}:\\s*([^;]+);`, 'g');
  return [...block.matchAll(pattern)].map((match) => match[1].trim());
}

describe('viewport CSS contract', () => {
  const rootBlock = blockFor(CSS, 'html,\nbody,\n#app,\n.boot-shell');
  const shellBlock = blockFor(CSS, '.app-shell {');
  const mainBlock = blockFor(CSS, '.app-main {');
  const tabBlock = blockFor(CSS, '.tab-bar {');

  it('sizes the root column to the large viewport, not svh/dvh', () => {
    expect(CSS).toMatch(/--app-height:\s*100vh/);
    expect(CSS).toMatch(/--chrome-bleed:\s*env\(safe-area-inset-bottom,\s*0px\)/);
    expect(CSS).toMatch(/@supports\s*\(height:\s*100lvh\)\s*\{[^}]*--app-height:\s*100lvh/);
    const heights = declarationValues(rootBlock, 'height');
    expect(heights[0]).toBe('100%');
    expect(heights.at(-1)).toBe('var(--app-height)');
    expect(heights).not.toContain('100svh');
    expect(CSS).not.toMatch(/(?:html|body|#app|\.boot-shell)[^{]*\{[^}]*height:\s*100svh/);
  });

  it('keeps the shell as a flex column with an in-flow tab bar', () => {
    expect(declarationValues(shellBlock, 'display')).toContain('flex');
    expect(declarationValues(shellBlock, 'flex-direction')).toContain('column');
    expect(declarationValues(shellBlock, 'height')).toContain('100%');

    expect(declarationValues(mainBlock, 'flex')[0]).toBe('1');
    expect(declarationValues(mainBlock, 'min-height')).toContain('0');
    expect(declarationValues(mainBlock, 'overflow')).toContain('auto');

    expect(declarationValues(tabBlock, 'flex')).toContain('none');
    expect(declarationValues(tabBlock, 'position')).not.toContain('fixed');
    expect(tabBlock).toMatch(/var\(--chrome-bleed\)/);
  });

  it('keeps viewport-fit=cover and does not reintroduce fixed bottom chrome', () => {
    expect(INDEX_HTML).toMatch(/name="viewport"[^>]*viewport-fit=cover/);
    expect(CSS).not.toMatch(/\.tab-bar\s*\{[^}]*position:\s*fixed/);
  });
});

describe('viewport shell structure', () => {
  it('places the tab bar in normal flow inside the shell', () => {
    render(<App storage={createMemoryStorage()} clock={clock} />);
    const shell = screen.getByTestId('app-shell');
    const tabBar = screen.getByTestId('tab-bar');
    expect(shell.contains(tabBar)).toBe(true);
    expect(shell.querySelector('.app-main')).toBeTruthy();
    expect(screen.getByRole('button', { name: FIRST_LAUNCH.cta })).toBeTruthy();
  });

  it('uses the same shell on History as on Today', () => {
    render(<App storage={createMemoryStorage()} clock={clock} />);
    fireEvent.click(screen.getByRole('button', { name: 'History' }));
    const shell = screen.getByTestId('app-shell');
    expect(shell.getAttribute('data-active-tab')).toBe('history');
    expect(screen.getByTestId('history-view')).toBeTruthy();
    expect(shell.contains(screen.getByTestId('tab-bar'))).toBe(true);
    expect(shell.querySelector('.app-main')).toBeTruthy();
  });
});
