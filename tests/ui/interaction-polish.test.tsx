// Interaction-polish CSS contract (0.8.1).
//
// Static guards over src/ui/styles.css: app controls are not accidentally
// selectable and suppress iOS long-press web callouts + tap flash, taps use
// `touch-action: manipulation`, editable/copyable content stays selectable,
// keyboard focus-visible states survive, and the iOS 26 viewport contract is
// untouched. Deliberately newline-agnostic so the CRLF Windows checkout does
// not break the guards.

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/preact';
import { App } from '../../src/ui/app.tsx';
import { FIRST_LAUNCH } from '../../src/ui/copy.ts';
import { createMemoryStorage } from '../../src/infrastructure/storage/storage-adapter.ts';
import { fixedClock } from '../../src/infrastructure/clock.ts';
import { toInstant } from '../../src/domain/schemas/time.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const CSS = readFileSync(resolve(ROOT, 'src/ui/styles.css'), 'utf8');
const INDEX_HTML = readFileSync(resolve(ROOT, 'index.html'), 'utf8');
const clock = fixedClock(toInstant(1787184000000));

describe('interaction-polish CSS contract', () => {
  it('disables accidental selection + long-press callouts on app controls', () => {
    // Controls: buttons/summary/labels plus the shared tappable card/chip/tile
    // primitives.
    expect(CSS).toMatch(/button,[\s\S]*?user-select:\s*none/);
    expect(CSS).toMatch(/-webkit-user-select:\s*none/);
    expect(CSS).toMatch(/-webkit-touch-callout:\s*none/);
    expect(CSS).toMatch(/\.choice-card,[\s\S]*?user-select:\s*none/);
    expect(CSS).toMatch(/\.tab-button[\s\S]*?user-select:\s*none/);
    expect(CSS).toMatch(/\.tile[\s\S]*?user-select:\s*none/);
  });

  it('removes the Safari tap flash without touching feedback states', () => {
    expect(CSS).toMatch(/-webkit-tap-highlight-color:\s*transparent/);
    // Deliberate feedback states must survive: pressed, selected, focus-visible.
    expect(CSS).toMatch(/:focus-visible/);
    expect(CSS).toMatch(/\.cta-primary:active/);
    expect(CSS).toMatch(/\.choice-card\.selected/);
    expect(CSS).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
  });

  it('uses immediate-tap touch behaviour on interactive controls', () => {
    expect(CSS).toMatch(/button,[\s\S]*?touch-action:\s*manipulation/);
    expect(CSS).toMatch(/\.chip[\s\S]*?touch-action:\s*manipulation/);
    expect(CSS).toMatch(/\.tile[\s\S]*?touch-action:\s*manipulation/);
  });

  it('keeps editable and copyable content selectable', () => {
    const editableRule = CSS.match(/input,\n?\s*textarea,[\s\S]*?user-select:\s*text/);
    expect(editableRule).toBeTruthy();
    expect(CSS).toMatch(/-webkit-user-select:\s*text/);
    // No blanket body/app-shell text lock: long-form copy stays selectable.
    expect(CSS).not.toMatch(/^body\s*\{[^}]*user-select:\s*none/im);
    expect(CSS).not.toMatch(/^\.app-shell\s*\{[^}]*user-select:\s*none/im);
  });

  it('does not reintroduce draggable web-asset behaviour for icons', () => {
    expect(CSS).toMatch(/-webkit-user-drag:\s*none/);
  });

  it('keeps the iOS 26 viewport contract intact', () => {
    expect(INDEX_HTML).toMatch(/name="viewport"[^>]*width=device-width,\s*initial-scale=1/);
    expect(INDEX_HTML).toMatch(/name="viewport"[^>]*viewport-fit=cover/);
    expect(CSS).not.toMatch(/\.tab-bar\s*\{[^}]*position:\s*fixed/);
  });
});

describe('interaction polish shell smoke', () => {
  it('still renders and answers taps on the first-launch screen', () => {
    render(<App storage={createMemoryStorage()} clock={clock} />);
    expect(screen.getByTestId('app-shell')).toBeTruthy();
    expect(screen.getByTestId('tab-bar')).toBeTruthy();
    const cta = screen.getByRole('button', { name: FIRST_LAUNCH.cta });
    fireEvent.click(cta);
    expect(screen.getByRole('button', { name: /Reset my tolerance/ })).toBeTruthy();
  });
});
