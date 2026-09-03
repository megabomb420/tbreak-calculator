// Dialog focus trap and restore (UX_SPEC §11). Applied to modal sheets and
// full-screen overlays so background chrome is inert and Tab cycles inside.

import { useEffect, useRef } from 'preact/hooks';
import type { RefObject } from 'preact';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function useFocusTrap(
  active: boolean,
  containerRef: RefObject<HTMLElement | null>,
  onClose?: () => void,
): void {
  const restoreRef = useRef<Element | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!active) return;
    restoreRef.current = document.activeElement;

    const focusInitial = () => {
      const node = containerRef.current;
      if (node === null) return;
      const initial = node.querySelector<HTMLElement>('[data-autofocus]') ?? firstFocusable(node);
      initial?.focus();
    };
    focusInitial();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current?.();
        return;
      }
      if (event.key !== 'Tab') return;
      const node = containerRef.current;
      if (node === null) return;
      const items = focusable(node);
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const first = items[0]!;
      const last = items[items.length - 1]!;
      const current = document.activeElement;
      if (event.shiftKey && current === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && current === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey, true);
    const node = containerRef.current;
    if (node !== null && !node.hasAttribute('tabindex')) {
      node.tabIndex = -1;
    }
    node?.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      node?.removeEventListener('keydown', onKey);
      const restore = restoreRef.current;
      if (restore instanceof HTMLElement && restore.isConnected && restore.closest('[inert]') === null) {
        restore.focus();
      }
    };
  }, [active, containerRef]);
}

function focusable(node: HTMLElement): HTMLElement[] {
  return [...node.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => !el.hasAttribute('disabled') && el.tabIndex !== -1);
}

function firstFocusable(node: HTMLElement): HTMLElement | null {
  return focusable(node)[0] ?? null;
}
