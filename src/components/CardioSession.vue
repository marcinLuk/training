<script setup lang="ts">
import { computed } from 'vue'
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
  <main class="cardio-field">
    <div class="cardio-session">
      <p class="meta-row">
        <span class="meta-plan">{{ view.planName }}</span>
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
        <button type="button" class="btn btn-large btn-block btn-cardio" @click="paused ? $emit('resume') : $emit('pause')">
          {{ paused ? 'Wznów' : 'Pauza' }}
        </button>
        <div class="action-row">
          <button type="button" class="btn btn-cardio-outline">Zablokuj</button>
          <button type="button" class="btn btn-cardio-outline" @click="$emit('end')">Zakończ</button>
        </div>
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

@media (prefers-reduced-motion: reduce) {
  .bar-fill {
    transition: none;
  }
}
</style>
