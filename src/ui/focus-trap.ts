import { useLayoutEffect, useRef } from 'preact/hooks';
import type { RefObject } from 'preact';

const FOCUSABLE = 'a[href],summary,button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
interface DialogEntry { node: HTMLElement; close: () => void }
const dialogs: DialogEntry[] = [];
const inertBefore = new Map<HTMLElement, boolean>();

function topDialog(): DialogEntry | undefined {
  return dialogs.filter((entry) => entry.node.isConnected).sort((a, b) =>
    a.node.compareDocumentPosition(b.node) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
  ).at(-1);
}

// Isolate siblings at every level without disabling the ancestor containing
// a nested dialog. Restore pre-existing inert attributes on cleanup.
function syncBackground() {
  for (const [node, inert] of inertBefore) {
    if (inert) node.setAttribute('inert', '');
    else node.removeAttribute('inert');
  }
  inertBefore.clear();
  let node: HTMLElement | null = topDialog()?.node ?? null;
  while (node !== null && node !== document.body) {
    for (const sibling of node.parentElement?.children ?? []) {
      if (sibling !== node && sibling instanceof HTMLElement && !['SCRIPT', 'STYLE'].includes(sibling.tagName)) {
        inertBefore.set(sibling, sibling.hasAttribute('inert'));
        sibling.setAttribute('inert', '');
      }
    }
    node = node.parentElement;
  }
}

function focusable(node: HTMLElement): HTMLElement[] {
  return [...node.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => {
    if (el.tabIndex < 0 || el.closest('[inert], [hidden], [aria-hidden="true"]') !== null) return false;
    if (el instanceof HTMLInputElement && el.type === 'hidden') return false;
    for (let parent: HTMLElement | null = el; parent !== null && parent !== node; parent = parent.parentElement) {
      const style = getComputedStyle(parent);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      if (parent.tagName === 'DETAILS' && !parent.hasAttribute('open') && !parent.querySelector('summary')?.contains(el)) return false;
    }
    return true;
  });
}

function onKey(event: KeyboardEvent) {
  const top = topDialog();
  if (top === undefined) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    event.stopImmediatePropagation();
    top.close();
  } else if (event.key === 'Tab') {
    const items = focusable(top.node);
    const index = items.indexOf(document.activeElement as HTMLElement);
    if (index === -1 || (event.shiftKey ? index === 0 : index === items.length - 1)) {
      event.preventDefault();
      (event.shiftKey ? items.at(-1) : items[0])?.focus();
    }
  }
}

// One same-document entry while a flow is open. Back closes the top dialog;
// transitions between steps do not create a trail of obsolete forms.
let ownsHistory = false;
let leavingHistory = false;
const HISTORY_KEY = '__tbreakDialog';
function syncHistory() {
  if (leavingHistory) return;
  if (topDialog() !== undefined && !ownsHistory) {
    window.history.pushState({ ...window.history.state, [HISTORY_KEY]: true }, '');
    ownsHistory = true;
  } else if (topDialog() === undefined && ownsHistory) {
    ownsHistory = false;
    if (window.history.state?.[HISTORY_KEY]) {
      leavingHistory = true;
      window.history.back();
    }
  }
}
function onPopState() {
  if (leavingHistory) leavingHistory = false;
  else if (ownsHistory) {
    ownsHistory = false;
    topDialog()?.close();
  }
  queueMicrotask(syncHistory);
}
let listening = false;

/** A single topmost focus/Escape owner, browser Back and focus restoration. */
export function useFocusTrap(active: boolean, containerRef: RefObject<HTMLElement | null>, onClose?: () => void): void {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useLayoutEffect(() => {
    const node = containerRef.current;
    if (!active || node === null) return;
    const restore = document.activeElement;
    const entry: DialogEntry = { node, close: () => closeRef.current?.() };
    dialogs.push(entry);
    if (!listening) {
      document.addEventListener('keydown', onKey, true);
      window.addEventListener('popstate', onPopState);
      listening = true;
    }
    syncBackground();
    queueMicrotask(syncHistory);
    if (!node.hasAttribute('tabindex')) node.tabIndex = -1;
    if (topDialog() === entry) (node.querySelector<HTMLElement>('[data-autofocus]') ?? focusable(node)[0] ?? node).focus();
    return () => {
      dialogs.splice(dialogs.indexOf(entry), 1);
      syncBackground();
      queueMicrotask(syncHistory);
      if (restore instanceof HTMLElement && restore.isConnected && restore.closest('[inert]') === null) restore.focus();
    };
  }, [active, containerRef]);
}
