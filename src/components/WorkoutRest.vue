<script setup lang="ts">
import { computed } from 'vue'
import { formatRest } from '../plans/format'
import type { WorkoutView } from '../workout/engine'
import { REST_STEP_MS } from '../workout/useWorkout'

const props = defineProps<{ view: WorkoutView; durationMs: number }>()
defineEmits<{ ready: []; end: []; undo: []; adjust: [deltaMs: number] }>()

const RING_RADIUS = 90
const RING_LENGTH = 2 * Math.PI * RING_RADIUS

/** Whole seconds, rounded up, so a fresh 15 s rest reads 0:15 and 0:00 means it is over. */
const timeText = computed(() => formatRest(Math.ceil(props.view.restRemainingMs / 1000)))

const progress = computed(() =>
  props.durationMs > 0 ? Math.min(1, Math.max(0, props.view.restRemainingMs / props.durationMs)) : 0,
)
const dashOffset = computed(() => RING_LENGTH * (1 - progress.value))

const nextText = computed(() => {
  const next = props.view.restNext
  return next === null ? '' : `${next.exerciseName}, seria ${next.setNumber} z ${next.setsInExercise}`
})
</script>

<template>
  <main class="screen workout">
    <div class="workout-top">
      <button type="button" class="btn btn-danger" @click="$emit('end')">Zakończ trening</button>
    </div>
    <h1>Przerwa</h1>
    <div class="ring">
      <svg viewBox="0 0 200 200" aria-hidden="true" focusable="false">
        <circle class="ring-track" cx="100" cy="100" :r="RING_RADIUS" />
        <circle
          class="ring-progress"
          cx="100"
          cy="100"
          :r="RING_RADIUS"
          :stroke-dasharray="RING_LENGTH"
          :stroke-dashoffset="dashOffset"
        />
      </svg>
      <p class="ring-time" role="timer" aria-label="Pozostały czas przerwy">{{ timeText }}</p>
    </div>
    <p class="next-row">
      <span class="muted">Dalej:</span>
      {{ nextText }}
    </p>
    <div class="rest-adjust">
      <button type="button" class="btn" @click="$emit('adjust', -REST_STEP_MS)">−15 s</button>
      <button type="button" class="btn" @click="$emit('adjust', REST_STEP_MS)">+15 s</button>
    </div>
    <div class="workout-action rest-actions">
      <button type="button" class="btn btn-block" :disabled="!view.canUndo" @click="$emit('undo')">Cofnij</button>
      <button type="button" class="btn btn-primary btn-large btn-block" @click="$emit('ready')">Gotowy, zaczynam</button>
    </div>
  </main>
</template>

<style scoped>
.rest-adjust {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-md);
}

.rest-actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.ring {
  position: relative;
  align-self: center;
  width: min(100%, 18rem);
  aspect-ratio: 1;
}

.ring svg {
  display: block;
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.ring circle {
  fill: none;
  stroke-width: 10;
}

.ring-track {
  stroke: var(--line);
}

.ring-progress {
  stroke: var(--chalk);
  stroke-linecap: round;
}

.ring-time {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-size: var(--text-figure);
  font-weight: 800;
  line-height: 1;
}

.next-row {
  font-family: var(--font-display);
  font-size: var(--text-title);
  font-weight: 700;
  line-height: 1.2;
  color: var(--ink);
}

.next-row .muted {
  margin-right: var(--space-sm);
}
</style>
