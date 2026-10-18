<script setup lang="ts">
import { computed } from 'vue'
import type { WorkoutView } from '../workout/engine'

const props = defineProps<{ view: WorkoutView }>()
defineEmits<{ done: [] }>()

/** The "Dalej:" row: the next exercise, or a note when nothing follows. */
const upNext = computed(() => {
  const { view } = props
  if (view.isLastSet) return { label: null, text: 'To ostatnia seria' }
  if (view.isLastExercise) return { label: null, text: 'To ostatnie ćwiczenie' }
  return { label: 'Dalej:', text: view.nextExerciseName ?? '' }
})
</script>

<template>
  <main class="screen workout">
    <h1 class="workout-name">{{ view.exerciseName }}</h1>
    <p class="figure">{{ view.reps }} <span class="figure-unit">powtórzeń</span></p>
    <div class="counter-block">
      <p class="counter" data-testid="sets-left">{{ view.setsLeft }}</p>
      <p class="counter-label">serii zostało</p>
    </div>
    <p class="next-row">
      <span v-if="upNext.label" class="muted">{{ upNext.label }}</span>
      {{ upNext.text }}
    </p>
    <button type="button" class="btn btn-primary btn-large btn-block workout-action" @click="$emit('done')">
      Gotowe
    </button>
  </main>
</template>

<style scoped>
.workout-name {
  overflow-wrap: anywhere;
}

.figure {
  font-family: var(--font-display);
  font-size: var(--text-figure);
  font-weight: 800;
  line-height: 1;
}

.figure-unit {
  color: var(--muted);
  font-family: var(--font-body);
  font-size: var(--text-title);
  font-weight: 600;
}

.counter-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm);
}

.counter {
  font-family: var(--font-display);
  font-size: var(--text-counter);
  font-weight: 800;
  line-height: 0.82;
}

.counter-label {
  color: var(--muted);
  font-size: var(--text-title);
  font-weight: 600;
}

.next-row {
  font-family: var(--font-display);
  font-size: var(--text-title);
  font-weight: 700;
  line-height: 1.2;
  color: var(--muted);
}

.next-row .muted {
  margin-right: var(--space-sm);
}
</style>
