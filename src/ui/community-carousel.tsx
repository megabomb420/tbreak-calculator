import { useEffect, useRef, useState } from 'preact/hooks';
import type { CommunityTip } from '../application/presentation/daily-support.ts';

export function CommunityCarousel({ tips, initialId }: { readonly tips: readonly CommunityTip[]; readonly initialId: string }) {
  const track = useRef<HTMLDivElement>(null);
  const initial = useRef(Math.max(0, tips.findIndex(tip => tip.id === initialId)));
  const [active, setActive] = useState(initial.current);
  const activeRef = useRef(active);
  activeRef.current = active;
  useEffect(() => {
    const el = track.current;
    if (el) {
      el.style.scrollBehavior = 'auto';
      el.scrollLeft = initial.current * el.clientWidth;
      el.style.scrollBehavior = '';
    }
  }, []);
  function go(index: number) {
    const el = track.current;
    if (el) el.scrollTo({ left: index * el.clientWidth });
  }
  // Preserve the visible card on rotation/resizing, without an animated jump.
  useEffect(() => {
    const el = track.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      const previous = el.style.scrollBehavior;
      el.style.scrollBehavior = 'auto';
      el.scrollLeft = activeRef.current * el.clientWidth;
      el.style.scrollBehavior = previous;
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return <section className="community-carousel" role="region" aria-roledescription="carousel" aria-label="Reddit experiences for this stage" data-testid="community-tip">
    <div className="community-carousel-heading">
      <p className="micro-label">From Reddit · Personal experiences</p>
      <span className="meta" aria-live="polite" aria-atomic="true">{active + 1} / {tips.length}</span>
    </div>
    <div className="community-track" ref={track} onScroll={() => {
      const el = track.current;
      if (el && el.clientWidth > 0) setActive(Math.max(0, Math.min(tips.length - 1, Math.round(el.scrollLeft / el.clientWidth))));
    }} onKeyDown={event => {
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault();
        go(Math.max(0, Math.min(tips.length - 1, active + (event.key === 'ArrowRight' ? 1 : -1))));
      }
    }} tabIndex={0} aria-label="Swipe or use arrow keys to browse experiences">
      {tips.map((tip, index) => <article key={tip.id} className="community-slide" role="group" aria-roledescription="slide" aria-label={`${index + 1} of ${tips.length}`} inert={index !== active}>
        <p className="community-period">{tip.period}</p>
        <h4>{tip.title}</h4>
        <p className="body">{tip.text}</p>
        <a className="text-link source-link" href={tip.href} target="_blank" rel="noopener noreferrer">Read the r/Petioles discussion ↗</a>
      </article>)}
    </div>
    <div className="community-controls">
      <button type="button" className="carousel-arrow" aria-label="Previous experience" disabled={active === 0} onClick={() => go(active - 1)}>←</button>
      <div className="carousel-dots">{tips.map((tip, index) => <button type="button" key={tip.id} aria-label={`Show experience ${index + 1}`} aria-current={index === active ? 'true' : undefined} onClick={() => go(index)}><span /></button>)}</div>
      <button type="button" className="carousel-arrow" aria-label="Next experience" disabled={active === tips.length - 1} onClick={() => go(active + 1)}>→</button>
    </div>
    <p className="meta community-disclaimer">Individual experiences from a similar point in a break — not a prediction of what will happen to you.</p>
  </section>;
}
