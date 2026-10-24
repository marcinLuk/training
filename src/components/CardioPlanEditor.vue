<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import {
  CARDIO_LIMITS,
  INTERVAL_KIND_NAMES,
  clonePlan,
  createBlock,
  createCardioPlan,
  createInterval,
  validatePlan,
  type CardioInterval,
  type CardioPlan,
  type IntervalKind,
  type ValidationError,
} from '../plans/plan'
import { formatRest } from '../plans/format'
import { savePlan, type SaveResult } from '../plans/planStore'
import FieldError from './FieldError.vue'
import NumberStepper from './NumberStepper.vue'

const props = defineProps<{ plan?: CardioPlan }>()
const emit = defineEmits<{ saved: []; cancel: [] }>()

// An existing plan is edited as a deep copy and saved under its own id.
// A new plan starts with one block of "Praca" and "Odpoczynek" (8 repeats).
const plan = reactive<CardioPlan>(props.plan !== undefined ? clonePlan(props.plan) : createCardioPlan())
const errors = ref<ValidationError[]>([])
const saveFailure = ref<string | null>(null)
// A second tap on "Zapisz plan" after a successful save must not save or emit again.
const savedOnce = ref(false)

const kinds: IntervalKind[] = ['work', 'rest']

const failureText: Record<Exclude<SaveResult, { ok: true }>['reason'], string> = {
  invalid: 'Popraw zaznaczone pola i zapisz plan jeszcze raz.',
  'backup-failed':
    'Nie udało się zabezpieczyć starych danych, więc plan nie został zapisany. Zwolnij miejsce w pamięci telefonu i spróbuj jeszcze raz.',
  'write-failed':
    'Nie udało się zapisać planu. Sprawdź wolne miejsce w pamięci telefonu i spróbuj jeszcze raz. Wpisane dane zostały na ekranie.',
}

const planNameError = computed(() => errorAt('name'))
const blocksError = computed(() => errorAt('blocks'))

function errorAt(path: string): string | undefined {
  return errors.value.find((error) => error.path === path)?.message
}

function intervalPath(blockIndex: number, intervalIndex: number, field: 'name' | 'seconds'): string {
  return `blocks.${blockIndex}.intervals.${intervalIndex}.${field}`
}

function addBlock(): void {
  plan.blocks.push(createBlock())
}

function removeBlock(blockIndex: number): void {
  plan.blocks.splice(blockIndex, 1)
  errors.value = []
}

// A new interval is the opposite of the last one, so a block alternates work and rest.
function addInterval(blockIndex: number): void {
  const block = plan.blocks[blockIndex]
  if (block === undefined) return
  const last = block.intervals[block.intervals.length - 1]
  block.intervals.push(createInterval(last?.kind === 'work' ? 'rest' : 'work'))
}

function removeInterval(blockIndex: number, intervalIndex: number): void {
  plan.blocks[blockIndex]?.intervals.splice(intervalIndex, 1)
  errors.value = []
}

// The name follows the type only while it is still the word of the old type.
function setKind(interval: CardioInterval, kind: IntervalKind): void {
  if (interval.kind === kind) return
  if (interval.name === INTERVAL_KIND_NAMES[interval.kind]) interval.name = INTERVAL_KIND_NAMES[kind]
  interval.kind = kind
}

function save(): void {
  if (savedOnce.value) return
  saveFailure.value = null
  errors.value = validatePlan(plan)
  if (errors.value.length > 0) return

  const result = savePlan(plan)
  if (result.ok) {
    savedOnce.value = true
    emit('saved')
  } else {
    saveFailure.value = failureText[result.reason]
  }
}
</script>

<template>
  <main class="screen">
    <h1>{{ props.plan !== undefined ? 'Edytuj plan cardio' : 'Nowy plan cardio' }}</h1>

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
        v-for="(block, blockIndex) in plan.blocks"
        :key="block.id"
        class="card block"
        :aria-labelledby="`block-title-${block.id}`"
      >
        <h2 :id="`block-title-${block.id}`">Blok {{ blockIndex + 1 }}</h2>

        <NumberStepper
          v-model="block.repeat"
          label="Powtórz"
          decrease-label="Zmniejsz liczbę powtórzeń"
          increase-label="Zwiększ liczbę powtórzeń"
          :min="CARDIO_LIMITS.repeat.min"
          :max="CARDIO_LIMITS.repeat.max"
          :step="1"
          :format="(value: number) => `× ${value}`"
          :error="errorAt(`blocks.${blockIndex}.repeat`)"
        />

        <section
          v-for="(interval, intervalIndex) in block.intervals"
          :key="interval.id"
          class="card interval"
          :aria-labelledby="`interval-title-${interval.id}`"
        >
          <h3 :id="`interval-title-${interval.id}`">Interwał {{ intervalIndex + 1 }}</h3>

          <div class="kind-toggle" role="group" aria-label="Typ interwału">
            <button
              v-for="kind in kinds"
              :key="kind"
              type="button"
              class="btn kind-button"
              :class="{ 'kind-button-selected': interval.kind === kind }"
              :aria-pressed="interval.kind === kind"
              @click="setKind(interval, kind)"
            >
              {{ INTERVAL_KIND_NAMES[kind] }}
            </button>
          </div>

          <div class="field">
            <label class="field-label" :for="`interval-name-${interval.id}`">Nazwa interwału</label>
            <input
              :id="`interval-name-${interval.id}`"
              v-model="interval.name"
              class="input"
              type="text"
              autocomplete="off"
              :aria-invalid="errorAt(intervalPath(blockIndex, intervalIndex, 'name')) ? 'true' : undefined"
              :aria-describedby="
                errorAt(intervalPath(blockIndex, intervalIndex, 'name')) ? `interval-name-error-${interval.id}` : undefined
              "
            />
            <FieldError v-if="errorAt(intervalPath(blockIndex, intervalIndex, 'name'))" :id="`interval-name-error-${interval.id}`">
              {{ errorAt(intervalPath(blockIndex, intervalIndex, 'name')) }}
            </FieldError>
          </div>

          <NumberStepper
            v-model="interval.seconds"
            label="Czas"
            decrease-label="Skróć czas o 5 s"
            increase-label="Wydłuż czas o 5 s"
            :min="CARDIO_LIMITS.seconds.min"
            :max="CARDIO_LIMITS.seconds.max"
            :step="CARDIO_LIMITS.seconds.step"
            :format="formatRest"
            :error="errorAt(intervalPath(blockIndex, intervalIndex, 'seconds'))"
          />

          <button type="button" class="btn interval-remove" @click="removeInterval(blockIndex, intervalIndex)">
            Usuń interwał
          </button>
        </section>

        <FieldError v-if="errorAt(`blocks.${blockIndex}.intervals`)" role="alert">
          {{ errorAt(`blocks.${blockIndex}.intervals`) }}
        </FieldError>

        <button type="button" class="btn btn-block" @click="addInterval(blockIndex)">Dodaj interwał</button>

        <!-- Far from "Dodaj interwał": the card's gap plus this spacer (DESIGN.md Do's). -->
        <button type="button" class="btn btn-danger block-remove" @click="removeBlock(blockIndex)">Usuń blok</button>
      </section>

      <FieldError v-if="blocksError" id="blocks-error" role="alert">
        {{ blocksError }}
      </FieldError>

      <button type="button" class="btn btn-block" @click="addBlock">Dodaj blok</button>

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
.block,
.interval {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

/* An interval sits on a card, so it takes the ground tone to stay apart from the card and the inputs. */
.interval {
  background: var(--ground);
}

.kind-toggle {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-sm);
}

.kind-button {
  padding: 0 var(--space-md);
  font-weight: 500;
}

/* The chosen type is never chalk: chalk belongs to "Zapisz plan" (DESIGN.md). */
.kind-button-selected {
  border-color: var(--ink);
  background: var(--surface-2);
  font-weight: 700;
}

.interval-remove {
  align-self: flex-start;
  margin-top: var(--space-md);
}

.block-remove {
  align-self: flex-start;
  margin-top: var(--space-xl);
}

.actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}
</style>
