import { useId } from 'preact/hooks';
import {
  adviceSectionFor,
  communityTipsFor,
  SUPPORT_GUIDES,
  SUPPORT_SOURCES,
  type DailySupportView,
} from '../application/presentation/daily-support.ts';
import type { SupportArea } from '../application/questionnaire/companion.ts';
import { SUPPORT_AREA_COPY, SUPPORT_AREA_GROUPS, SUPPORT_SHEET } from './companion-copy.ts';
import { CommunityCarousel } from './community-carousel.tsx';
import { ADVICE_PICKER } from './break-copy.ts';
import { RIDE_IT_OUT } from './urge-copy.ts';
import type { Instant } from '../domain/schemas/time.ts';
import type { UrgeSession } from '../application/progress/urge-session-record.ts';
import { formatUrgeRemaining, urgeRemainingMs } from '../domain/urges/urge-session.ts';

const TOPIC_ORDER: readonly SupportArea[] = SUPPORT_AREA_GROUPS.flatMap((group) => group.areas);

const SOURCE_LABELS = {
  picked: ADVICE_PICKER.sourcePicked,
  chosen: ADVICE_PICKER.sourceChosen,
  suggested: ADVICE_PICKER.sourceSuggested,
} as const;

/**
 * The day's practical help, always open: one topic on screen with its action,
 * the reasoning behind it, the remaining steps and the sources. The topics
 * this break was set up with come first in the picker and every other guide
 * follows them; picking one by hand replaces the block in place, and the app
 * keeps that pick for the rest of the break day.
 */
export interface DailySupportUrge {
  /** The timer that is still running, if any. */
  readonly running: UrgeSession | null;
  readonly now: Instant;
  readonly onOpen: () => void;
}

export interface DailySupportProps {
  readonly view: DailySupportView;
  readonly urge?: DailySupportUrge;
  /** The topic the person picked by hand for this break day, if any. */
  readonly picked: SupportArea | null;
  readonly onPick: (area: SupportArea | null) => void;
  /** Confirms, for this break, the topics stored from an earlier one. */
  readonly onUseLast?: () => void;
  /** Opens the support sheet, to choose or change this break's topics. */
  readonly onChangeTopics?: () => void;
}

export function DailySupport(props: DailySupportProps) {
  // A new break day starts on its automatic topic, not on yesterday's pick.
  return <DailyAdvice key={props.view.day} {...props} />;
}

function DailyAdvice({ view, urge, picked, onPick, onUseLast, onChangeTopics }: DailySupportProps) {
  const headingId = useId();
  const chosenAreas = view.focus.areas;
  const shown = picked ?? view.defaultArea;
  const section = adviceSectionFor(view, shown);
  const guide = SUPPORT_GUIDES[shown];
  // The day's own practice is the content of its own area: showing it under a
  // different topic would pair one topic's reason with another's action.
  const usePractice = picked === null && section.recordedAt === null && !section.usesPersonalPlan && shown === view.practice.area;
  const action = usePractice ? view.practice.action : section.action;
  // The day still has its own task even when a chosen topic or a rating leads
  // the card, so it moves into the depth instead of disappearing with the
  // topic it belongs to.
  const practiceAside = !usePractice && view.practice.action !== action ? view.practice : null;
  const tips = communityTipsFor(view, shown);
  // The break's own topics stay together at the top of the picker and the
  // guides it was not set up with follow, so a topic that was asked for is
  // never buried among the eleven.
  const restAreas = TOPIC_ORDER.filter((area) => !chosenAreas.includes(area));
  const reusableLabels = view.focus.reusable.map((area) => SUPPORT_AREA_COPY[area].shortLabel).join(', ');
  return (
    <>
      {view.allComfortable ? <p className="daily-comfortable" data-testid="comfortable-checkin">Things look fairly settled in your check-in. A break can be uneventful, too.</p> : null}
      <section className="today-block daily-support" data-testid="daily-support" data-window={view.window.id} data-area={shown}>
        <h3 className="section-heading" id={headingId}>{ADVICE_PICKER.title}</h3>
        <div className="advice-picker-label">
          <select
            data-testid="advice-picker"
            aria-labelledby={headingId}
            value={picked ?? ''}
            onInput={(event) => onPick(event.currentTarget.value === '' ? null : event.currentTarget.value as SupportArea)}
          >
            <option value="">{ADVICE_PICKER.suggestionOption(SUPPORT_AREA_COPY[view.defaultArea].shortLabel)}</option>
            {chosenAreas.length > 0 ? (
              <optgroup label={ADVICE_PICKER.topicGroup}>
                {chosenAreas.map((area) => <option key={area} value={area}>{SUPPORT_AREA_COPY[area].shortLabel}</option>)}
              </optgroup>
            ) : null}
            <optgroup label={ADVICE_PICKER.allTopicsGroup}>
              {restAreas.map((area) => <option key={area} value={area}>{SUPPORT_AREA_COPY[area].shortLabel}</option>)}
            </optgroup>
          </select>
        </div>
        {chosenAreas.length > 0 ? (
          <p className="meta advice-topics" data-testid="advice-topics">{SUPPORT_SHEET.turns}</p>
        ) : (
          <p className="meta advice-topics" data-testid="advice-topics">
            {view.focus.reusable.length > 0 ? SUPPORT_SHEET.reuse(reusableLabels) : SUPPORT_SHEET.askChoose}
            {view.focus.reusable.length > 0 && onUseLast !== undefined ? (
              <> <button type="button" className="text-link" data-testid="support-use-last" onClick={onUseLast}>{SUPPORT_SHEET.reuseCta}</button></>
            ) : null}
            {onChangeTopics !== undefined ? (
              <> <button type="button" className="text-link" data-testid="support-choose" onClick={onChangeTopics}>{view.focus.reusable.length > 0 ? SUPPORT_SHEET.reuseChange : SUPPORT_SHEET.askChooseCta}</button></>
            ) : null}
          </p>
        )}
        <article className="support-card" data-testid="advice-block" data-area={shown}>
          <p className="micro-label advice-source" data-testid="advice-source" data-source={view.areaSource}>{SOURCE_LABELS[view.areaSource]}</p>
          <h4 className="card-title" data-testid="advice-title">{usePractice ? view.practice.title : guide.title}</h4>
          {section.recordedAt !== null ? (
            <p className="meta advice-reason" data-testid="advice-reason">
              {section.reason} · <time dateTime={section.recordedAt}>{new Date(section.recordedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</time>
            </p>
          ) : null}
          <p className="body advice-first-step" data-testid="advice-action">{action}</p>
          {section.triggerLine !== null ? <p className="meta" data-testid="advice-trigger">{section.triggerLine}</p> : null}
          {/* The moment tool: a delay timer that belongs to the day, not to one
              topic, so it stays reachable whatever guide is on screen. */}
          {urge !== undefined ? (
            <button type="button" className="cta-secondary urge-open" data-testid="open-ride-it-out" onClick={urge.onOpen}>
              {urge.running === null
                ? RIDE_IT_OUT.open
                : RIDE_IT_OUT.runningCta(formatUrgeRemaining(urgeRemainingMs(urge.running, urge.now)))}
            </button>
          ) : null}
          {section.fallbackLine !== null ? <p className="meta" data-testid="advice-fallback">{section.fallbackLine}</p> : null}
          <h5 className="section-subheading" data-testid="advice-why-title">{ADVICE_PICKER.why}</h5>
          <p className="body advice-why" data-testid="advice-why">{guide.explanation}</p>
          {/* The one line to act on and the reason for it stay visible; the rest
              of the topic's material is depth, so the day's action keeps the
              first screen. */}
          <details className="advice-details" data-testid="advice-more">
            <summary>{ADVICE_PICKER.more}</summary>
            <div className="advice-content">
              {practiceAside !== null ? (
                <>
                  <h5 className="section-subheading">{ADVICE_PICKER.practice}</h5>
                  <p className="body" data-testid="advice-practice">{practiceAside.action}</p>
                </>
              ) : null}
              <ul className="advice-steps" data-testid="advice-steps">{guide.steps.filter((step) => step !== action).map((step) => <li key={step}>{step}</li>)}</ul>
              <h5 className="section-subheading">{ADVICE_PICKER.avoid}</h5>
              <p className="meta advice-avoid" data-testid="advice-avoid">{guide.avoid}</p>
              {guide.seekHelp !== null ? <p className="advice-help"><strong>{ADVICE_PICKER.help}</strong> {guide.seekHelp}</p> : null}
              <div className="advice-sources">{guide.sources.map((id) => <a key={id} className="text-link source-link" href={SUPPORT_SOURCES[id].href} target="_blank" rel="noopener noreferrer">{SUPPORT_SOURCES[id].label} ↗</a>)}</div>
            </div>
          </details>
        </article>
      </section>
      <section className="today-block" data-testid="today-experiences">
        <h3 className="section-heading">Experiences</h3>
        <p className="meta">What other people reported around this topic and this stage of a break.</p>
        {tips.length > 0 ? <CommunityCarousel key={shown} tips={tips} initialId={tips[0]!.id} /> : null}
      </section>
    </>
  );
}
