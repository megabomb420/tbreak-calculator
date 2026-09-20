/** Keep app gestures at a stable scale without blocking one-finger scrolling,
 * sliders, text editing or desktop keyboard zoom. Safari also emits gesture events. */
export function lockTouchZoom(target: Document = document): () => void {
  const blockGesture = (event: Event) => { if (event.cancelable) event.preventDefault(); };
  const blockPinch = (event: TouchEvent) => { if (event.touches.length > 1) blockGesture(event); };
  const options = { passive: false };
  target.addEventListener('touchstart', blockPinch, options);
  target.addEventListener('touchmove', blockPinch, options);
  target.addEventListener('gesturestart', blockGesture, options);
  target.addEventListener('gesturechange', blockGesture, options);
  return () => {
    target.removeEventListener('touchstart', blockPinch);
    target.removeEventListener('touchmove', blockPinch);
    target.removeEventListener('gesturestart', blockGesture);
    target.removeEventListener('gesturechange', blockGesture);
  };
}
