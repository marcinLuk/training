<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { now } from '../lib/clock'
import { formatRest } from '../plans/format'
import { INTERVAL_KIND_NAMES } from '../plans/plan'
import type { CardioPhase, CardioView } from '../workout/cardioEngine'

const props = defineProps<{ view: CardioView }>()
defineEmits<{ pause: []; resume: []; end: [] }>()

/** More segments than this get the narrow gap on the timeline. */
const DENSE_TIMELINE_SEGMENTS = 24

const PHASE_WORDS: Record<CardioPhase, string> = {
  'get-ready': 'PRZYGOTUJ SIĘ',
  work: 'PRACA',
  rest: 'ODPOCZYNEK',
  paused: 'PAUZA',
  finished: '',
}

/** How long the unlock bar must be held (DESIGN.md "Tryb blokady"). */
const UNLOCK_HOLD_MS = 2000
/** The render timer only asks for a new render while the bar is held; it counts nothing. */
const HOLD_RENDER_MS = 50
const UNLOCK_LABEL = 'Przytrzymaj, aby odblokować'

/**
 * Lock mode lives only here, in memory: a reload mounts this screen again, unlocked. The session
 * keeps running under it, because the session state is not touched.
 */
const locked = ref(false)
/** When the current hold began (a clock time), or null while the bar is not held. */
const holdStartedAt = ref<number | null>(null)
/** The last clock time read while holding. It is the only thing the render timer changes. */
const holdClock = ref(0)
const reducedMotion = ref(false)
let holdTimer: ReturnType<typeof setInterval> | null = null

/** How much of the hold is done, 0 to 1, from the stored start and the clock. */
const holdProgress = computed(() =>
  holdStartedAt.value === null ? 0 : Math.min(1, Math.max(0, (holdClock.value - holdStartedAt.value) / UNLOCK_HOLD_MS)),
)
const holdPercent = computed(() => `${holdProgress.value * 100}%`)
/** Under reduced motion the fill is replaced by a count: "Trzymaj… 1" in the first second, "… 2" in the second. */
const holdLabel = computed(() => {
  if (!reducedMotion.value || holdStartedAt.value === null) return UNLOCK_LABEL
  return `Trzymaj… ${Math.min(2, Math.floor(holdProgress.value * 2) + 1)}`
})

function stopHoldTimer(): void {
  if (holdTimer === null) return
  clearInterval(holdTimer)
  holdTimer = null
}

/** Reads the clock and unlocks when the hold has lasted long enough. */
function checkHold(stillPressed: boolean): void {
  if (holdStartedAt.value === null) return
  holdClock.value = now()
  if (holdClock.value - holdStartedAt.value >= UNLOCK_HOLD_MS) {
    const pointerId = holdPointerId
    cancelHold()
    locked.value = false
    // A key hold has no pointer, and a release has already ended the press: nothing follows them.
    // A pointer that is still down will lift (and click) on the buttons that just came back.
    afterUnlock = pointerId !== null && stillPressed ? { pointerId, stage: 'down' } : null
  }
}

function beginHold(): void {
  if (holdStartedAt.value !== null) return
  reducedMotion.value = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  holdStartedAt.value = now()
  holdClock.value = holdStartedAt.value
  holdTimer = setInterval(() => checkHold(true), HOLD_RENDER_MS)
}

/**
 * The unlock comes while the finger is still down, so the rest of that press (its lift and its
 * click) lands on the buttons that just came back. This guard keeps that rest from doing anything.
 * 'down': the unlocking pointer is still pressed. 'lifted': it was lifted and its click may follow.
 * A new pointerdown ends the guard, so a fresh tap always works. No timer is used.
 */
let holdPointerId: number | null = null
let afterUnlock: { pointerId: number; stage: 'down' | 'lifted' } | null = null

function onBarPointerDown(event: PointerEvent): void {
  if (holdStartedAt.value === null) holdPointerId = event.pointerId
  beginHold()
}

/**
 * With touch the browser captures the pointer on the bar, and pointerleave then waits for the
 * lift. So a finger that slides off the bar is found here: pointermove keeps coming to the bar,
 * and a position outside its rectangle resets the hold.
 */
function onBarPointerMove(event: PointerEvent): void {
  if (holdStartedAt.value === null) return
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const inside =
    event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom
  if (!inside) cancelHold()
}

function onFieldPointerDownCapture(): void {
  if (afterUnlock?.stage === 'lifted') afterUnlock = null
}

function onFieldPointerUpCapture(event: PointerEvent): void {
  if (afterUnlock === null || afterUnlock.stage !== 'down' || event.pointerId !== afterUnlock.pointerId) return
  afterUnlock.stage = 'lifted'
  event.stopPropagation()
  event.preventDefault()
}

function onFieldClickCapture(event: MouseEvent): void {
  if (afterUnlock?.stage !== 'lifted') return
  afterUnlock = null
  event.stopPropagation()
  event.preventDefault()
}

/** Resets the fill to zero: a release, a cancel or leaving the bar before the time is up. */
function cancelHold(): void {
  stopHoldTimer()
  holdStartedAt.value = null
}

/** A release is the last moment to read the clock: a hold of the full time unlocks even if no render came. */
function releaseHold(): void {
  checkHold(false)
  cancelHold()
}

function isHoldKey(event: KeyboardEvent): boolean {
  return event.key === ' ' || event.key === 'Enter'
}

function onHoldKeyDown(event: KeyboardEvent): void {
  if (!isHoldKey(event)) return
  event.preventDefault()
  if (holdStartedAt.value === null) holdPointerId = null
  beginHold()
}

function onHoldKeyUp(event: KeyboardEvent): void {
  if (!isHoldKey(event)) return
  event.preventDefault()
  releaseHold()
}

onBeforeUnmount(stopHoldTimer)

const paused = computed(() => props.view.phase === 'paused')
const phaseWord = computed(() => PHASE_WORDS[props.view.phase])

/** The interval name sits under the Phase word only when it says more than the type word. */
const intervalName = computed(() => {
  const { current } = props.view
  return current !== null && current.name !== INTERVAL_KIND_NAMES[current.kind] ? current.name : null
})

/** Whole seconds, rounded up, so a fresh 30 s interval reads 0:30 and 0:00 means it is over. */
const clockText = computed(() => formatRest(Math.ceil(props.view.intervalRemainingMs / 1000)))
const clockLabel = computed(() =>
  props.view.phase === 'get-ready' ? 'Czas do startu' : 'Pozostały czas interwału',
)

/** "Razem" counts the time done, so it rounds down; "Zostało" rounds up like the Clock. */
const elapsedText = computed(() => formatRest(Math.floor(props.view.elapsedMs / 1000)))
const remainingText = computed(() => formatRest(Math.ceil(props.view.remainingMs / 1000)))

const positionText = computed(() =>
  props.view.intervalNumber === null ? null : `Interwał ${props.view.intervalNumber} z ${props.view.intervalCount}`,
)

const barPercent = computed(() => `${Math.round(Math.min(1, Math.max(0, props.view.progress)) * 100)}%`)

const nextText = computed(() => {
  const { next } = props.view
  return next === null ? null : `${next.name} · ${formatRest(next.seconds)}`
})

/** One segment per interval after repeats. */
const segments = computed(() =>
  props.view.timeline.map((interval, index) => ({
    kind: interval.kind,
    name: interval.name,
    current: index === props.view.intervalIndex,
  })),
)
const dense = computed(() => segments.value.length > DENSE_TIMELINE_SEGMENTS)
</script>

<template>
  <main
    class="cardio-field"
    @pointerdown.capture="onFieldPointerDownCapture"
    @pointerup.capture="onFieldPointerUpCapture"
    @click.capture="onFieldClickCapture"
  >
    <div class="cardio-session">
      <p class="meta-row">
        <span class="meta-plan">{{ locked ? 'Ekran zablokowany' : view.planName }}</span>
        <span v-if="positionText !== null" class="meta-position">{{ positionText }}</span>
      </p>
      <div class="phase-block">
        <h1 class="phase" data-testid="phase">{{ phaseWord }}</h1>
        <p v-if="intervalName !== null" class="interval-name">{{ intervalName }}</p>
      </div>
      <p class="clock" role="timer" :aria-label="clockLabel">{{ clockText }}</p>
      <div class="bar" aria-hidden="true">
        <div class="bar-fill" :style="{ width: barPercent }"></div>
      </div>
      <ol class="timeline" :class="{ 'timeline-dense': dense }" aria-label="Przebieg">
        <li
          v-for="(segment, index) in segments"
          :key="index"
          class="segment"
          :class="[`segment-${segment.kind}`, { 'segment-current': segment.current }]"
          :aria-current="segment.current ? 'step' : undefined"
          :aria-label="`${index + 1}. ${segment.name}`"
        ></li>
      </ol>
      <p class="next-row">
        <template v-if="view.isLast">To ostatni interwał</template>
        <template v-else-if="nextText !== null">Dalej: {{ nextText }}</template>
      </p>
      <p class="meta-row">
        <span>Razem {{ elapsedText }}</span>
        <span>Zostało {{ remainingText }}</span>
      </p>
      <div class="actions">
        <button
          v-if="locked"
          type="button"
          class="btn btn-large btn-block hold-bar"
          :aria-label="UNLOCK_LABEL"
          @pointerdown="onBarPointerDown"
          @pointermove="onBarPointerMove"
          @pointerup="releaseHold"
          @pointercancel="cancelHold"
          @pointerleave="cancelHold"
          @keydown="onHoldKeyDown"
          @keyup="onHoldKeyUp"
          @blur="cancelHold"
          @contextmenu.prevent
        >
          <span class="hold-content">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="5" y="11" width="14" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
            <span data-testid="hold-label">{{ holdLabel }}</span>
          </span>
          <span v-if="!reducedMotion" class="hold-fill" data-testid="hold-fill" aria-hidden="true" :style="{ clipPath: `inset(0 calc(100% - ${holdPercent}) 0 0)` }">
            <span class="hold-content">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="5" y="11" width="14" height="10" rx="2" />
                <path d="M8 11V7a4 4 0 0 1 8 0v4" />
              </svg>
              <span>{{ UNLOCK_LABEL }}</span>
            </span>
          </span>
        </button>
        <template v-else>
          <button type="button" class="btn btn-large btn-block btn-cardio" @click="paused ? $emit('resume') : $emit('pause')">
            {{ paused ? 'Wznów' : 'Pauza' }}
          </button>
          <div class="action-row">
            <button type="button" class="btn btn-cardio-outline" @click="locked = true">Zablokuj</button>
            <button type="button" class="btn btn-cardio-outline" @click="$emit('end')">Zakończ</button>
          </div>
        </template>
      </div>
    </div>
  </main>
</template>

<style scoped>
/* The whole screen is the violet field, edge to edge (DESIGN.md "Sesja cardio"). */
.cardio-field {
  min-height: 100dvh;
  background: var(--cardio);
  color: var(--on-cardio);
}

.cardio-session {
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: 100%;
  min-height: 100dvh;
  max-width: var(--column);
  margin: 0 auto;
  padding: 20px var(--space-lg) var(--space-lg);
}

.meta-row {
  display: flex;
  justify-content: space-between;
  gap: var(--space-lg);
  font-family: var(--font-display);
  font-size: var(--text-meta);
  font-weight: 700;
  line-height: 1.3;
  text-transform: uppercase;
}

.meta-plan {
  min-width: 0;
  overflow-wrap: anywhere;
}

.meta-position {
  flex: none;
}

.phase-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xs);
  text-align: center;
}

.phase {
  font-size: var(--text-phase);
  font-weight: 800;
  line-height: 1;
}

.interval-name {
  font-family: var(--font-display);
  font-size: var(--text-title);
  font-weight: 700;
  line-height: 1.2;
  overflow-wrap: anywhere;
}

.clock {
  font-family: var(--font-display);
  font-size: var(--text-clock);
  font-weight: 800;
  line-height: 0.9;
  text-align: center;
}

/* The track and the dimmed segments are on-cardio at low opacity, so no new color is needed. */
.bar {
  position: relative;
  height: 14px;
  overflow: hidden;
  border-radius: 7px;
}

.bar::before,
.segment::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: var(--on-cardio);
  opacity: 0.25;
}

.bar-fill {
  position: relative;
  height: 100%;
  border-radius: 7px;
  background: var(--on-cardio);
  transition: width 250ms linear;
}

.timeline {
  display: flex;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.timeline-dense {
  gap: 2px;
}

.segment {
  position: relative;
  flex: 1 1 0;
  min-width: 0;
  height: 36px;
  border-radius: 4px;
}

.segment-work::before {
  opacity: 1;
}

.segment-current {
  outline: 3px solid var(--on-cardio);
  outline-offset: 2px;
}

.next-row {
  font-family: var(--font-display);
  font-size: var(--text-title);
  font-weight: 700;
  line-height: 1.2;
  overflow-wrap: anywhere;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  margin-top: auto;
}

.action-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-md);
}

/* The main action of the cardio screen is on-cardio, not chalk (DESIGN.md Chalk Rule exception). */
.btn-cardio {
  border-color: var(--on-cardio);
  background: var(--on-cardio);
  color: var(--cardio);
}

.btn-cardio-outline {
  border-color: var(--on-cardio);
  color: var(--on-cardio);
}

/*
 * The unlock bar: a 2 px on-cardio outline. The fill is a second copy of the content in the
 * cardio color on an on-cardio ground, cut from the left with clip-path, so the text stays
 * readable on both sides of the fill edge.
 */
.hold-bar {
  position: relative;
  overflow: hidden;
  border-color: var(--on-cardio);
  color: var(--on-cardio);
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}

.hold-content {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
}

.hold-content svg {
  flex: none;
  width: 24px;
  height: 24px;
}

.hold-fill {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--on-cardio);
  color: var(--cardio);
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  .bar-fill {
    transition: none;
  }
}
</style>
