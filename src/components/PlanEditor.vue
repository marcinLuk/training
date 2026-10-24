<script setup lang="ts">
import { computed, nextTick, reactive, ref } from 'vue'
import {
  LIMITS,
  createExercise,
  clonePlan,
  createPlan,
  validatePlan,
  type Plan,
  type ValidationError,
} from '../plans/plan'
import { formatRest } from '../plans/format'
import { savePlan, type SaveResult } from '../plans/planStore'
import FieldError from './FieldError.vue'
import NumberStepper from './NumberStepper.vue'

const props = defineProps<{ plan?: Plan }>()
const emit = defineEmits<{ saved: []; cancel: [] }>()

// An existing plan is edited as a deep copy and saved under its own id.
// A new plan starts with one exercise row: every plan needs at least one.
const plan = reactive<Plan>(
  props.plan !== undefined ? clonePlan(props.plan) : { ...createPlan(), exercises: [createExercise()] },
)
const errors = ref<ValidationError[]>([])
const saveFailure = ref<string | null>(null)

const failureText: Record<Exclude<SaveResult, { ok: true }>['reason'], string> = {
  invalid: 'Popraw zaznaczone pola i zapisz plan jeszcze raz.',
  'backup-failed':
    'Nie udało się zabezpieczyć starych danych, więc plan nie został zapisany. Zwolnij miejsce w pamięci telefonu i spróbuj jeszcze raz.',
  'write-failed':
    'Nie udało się zapisać planu. Sprawdź wolne miejsce w pamięci telefonu i spróbuj jeszcze raz. Wpisane dane zostały na ekranie.',
}

const planNameError = computed(() => errorAt('name'))
const exercisesError = computed(() => errorAt('exercises'))

function errorAt(path: string): string | undefined {
  return errors.value.find((error) => error.path === path)?.message
}

function addExercise(): void {
  plan.exercises.push(createExercise())
}

function removeExercise(index: number): void {
  plan.exercises.splice(index, 1)
  errors.value = []
}

function moveButtonId(exerciseId: string, direction: 'up' | 'down'): string {
  return `exercise-move-${direction}-${exerciseId}`
}

// Swap the exercise with its neighbour. Errors are cleared because their paths
// hold positions that no longer match. Focus goes back to the same move button
// of the moved exercise, or to its other one when the tapped button is now disabled.
async function moveExercise(index: number, delta: -1 | 1): Promise<void> {
  const target = index + delta
  const moved = plan.exercises[index]
  const neighbour = plan.exercises[target]
  if (moved === undefined || neighbour === undefined) return

  plan.exercises[index] = neighbour
  plan.exercises[target] = moved
  errors.value = []

  const tapped = delta === -1 ? 'up' : 'down'
  const other = delta === -1 ? 'down' : 'up'
  const tappedStillEnabled = delta === -1 ? target > 0 : target < plan.exercises.length - 1
  await nextTick()
  document.getElementById(moveButtonId(moved.id, tappedStillEnabled ? tapped : other))?.focus()
}

function save(): void {
  saveFailure.value = null
  errors.value = validatePlan(plan)
  if (errors.value.length > 0) return

  const result = savePlan(plan)
  if (result.ok) {
    emit('saved')
  } else {
    saveFailure.value = failureText[result.reason]
  }
}
</script>

<template>
  <main class="screen">
    <h1>{{ props.plan !== undefined ? 'Edytuj plan' : 'Nowy plan' }}</h1>

    <form class="stack" novalidate @submit.prevent="save">
      <div class="field">
        <label class="field-label" for="plan-name">Nazwa planu</label>
        <input
          id="plan-name"
          v-model="plan.name"
          class="input"
          type="text"
          autocomplete="off"
          :aria-invalid="planNameError ? 'true' : undefined"
          :aria-describedby="planNameError ? 'plan-name-error' : undefined"
        />
        <FieldError v-if="planNameError" id="plan-name-error">
          {{ planNameError }}
        </FieldError>
      </div>

      <section
        v-for="(exercise, index) in plan.exercises"
        :key="exercise.id"
        class="card exercise"
        :aria-labelledby="`exercise-title-${exercise.id}`"
      >
        <div class="exercise-header">
          <h2 :id="`exercise-title-${exercise.id}`">Ćwiczenie {{ index + 1 }}</h2>
          <button
            :id="moveButtonId(exercise.id, 'up')"
            type="button"
            class="btn btn-move"
            :aria-label="`Przesuń ćwiczenie ${index + 1} w górę`"
            :disabled="index === 0"
            @click="moveExercise(index, -1)"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="m6 15 6-6 6 6" />
            </svg>
          </button>
          <button
            :id="moveButtonId(exercise.id, 'down')"
            type="button"
            class="btn btn-move"
            :aria-label="`Przesuń ćwiczenie ${index + 1} w dół`"
            :disabled="index === plan.exercises.length - 1"
            @click="moveExercise(index, 1)"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
        </div>

        <div class="field">
          <label class="field-label" :for="`exercise-name-${exercise.id}`">Nazwa ćwiczenia</label>
          <input
            :id="`exercise-name-${exercise.id}`"
            v-model="exercise.name"
            class="input"
            type="text"
            autocomplete="off"
            :aria-invalid="errorAt(`exercises.${index}.name`) ? 'true' : undefined"
            :aria-describedby="errorAt(`exercises.${index}.name`) ? `exercise-name-error-${exercise.id}` : undefined"
          />
          <FieldError v-if="errorAt(`exercises.${index}.name`)" :id="`exercise-name-error-${exercise.id}`">
            {{ errorAt(`exercises.${index}.name`) }}
          </FieldError>
        </div>

        <NumberStepper
          v-model="exercise.sets"
          label="Serie"
          decrease-label="Zmniejsz serie"
          increase-label="Zwiększ serie"
          :min="LIMITS.sets.min"
          :max="LIMITS.sets.max"
          :step="1"
          :error="errorAt(`exercises.${index}.sets`)"
        />
        <NumberStepper
          v-model="exercise.reps"
          label="Powtórzenia"
          decrease-label="Zmniejsz powtórzenia"
          increase-label="Zwiększ powtórzenia"
          :min="LIMITS.reps.min"
          :max="LIMITS.reps.max"
          :step="1"
          :error="errorAt(`exercises.${index}.reps`)"
        />
        <NumberStepper
          v-model="exercise.restSeconds"
          label="Przerwa"
          decrease-label="Skróć przerwę o 15 s"
          increase-label="Wydłuż przerwę o 15 s"
          :min="LIMITS.rest.min"
          :max="LIMITS.rest.max"
          :step="LIMITS.rest.step"
          :format="formatRest"
          :error="errorAt(`exercises.${index}.restSeconds`)"
        />

        <button
          type="button"
          class="btn btn-danger"
          :aria-label="`Usuń ćwiczenie ${index + 1}`"
          @click="removeExercise(index)"
        >
          Usuń ćwiczenie
        </button>
      </section>

      <FieldError v-if="exercisesError" id="exercises-error" role="alert">
        {{ exercisesError }}
      </FieldError>

      <button type="button" class="btn btn-block" @click="addExercise">Dodaj ćwiczenie</button>

      <FieldError v-if="saveFailure" role="alert">
        {{ saveFailure }}
      </FieldError>

      <div class="actions">
        <button type="submit" class="btn btn-primary btn-large btn-block">Zapisz plan</button>
        <button type="button" class="btn btn-block" @click="emit('cancel')">Anuluj</button>
      </div>
    </form>
  </main>
</template>

<style scoped>
.exercise {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.exercise-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.exercise-header h2 {
  flex: 1;
  min-width: 0;
}

.btn-move {
  flex: none;
  width: var(--target-min);
  min-height: var(--target-min);
  padding: 0;
}

.btn-move svg {
  width: 24px;
  height: 24px;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}
</style>
