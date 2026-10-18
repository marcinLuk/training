<script setup lang="ts">
import { computed, useId } from 'vue'
import FieldError from './FieldError.vue'

const props = defineProps<{
  label: string
  decreaseLabel: string
  increaseLabel: string
  modelValue: number
  min: number
  max: number
  step: number
  /** Text shown for the value; defaults to the number itself. */
  format?: (value: number) => string
  /** Error text for this field, shown under the stepper. */
  error?: string
}>()

const emit = defineEmits<{ 'update:modelValue': [value: number] }>()

const labelId = useId()
const errorId = useId()

const shown = computed(() => (props.format ? props.format(props.modelValue) : String(props.modelValue)))
const atMin = computed(() => props.modelValue <= props.min)
const atMax = computed(() => props.modelValue >= props.max)

function change(delta: number): void {
  const next = Math.min(props.max, Math.max(props.min, props.modelValue + delta))
  if (next !== props.modelValue) emit('update:modelValue', next)
}
</script>

<template>
  <div class="field" role="group" :aria-labelledby="labelId" :aria-describedby="error ? errorId : undefined">
    <span :id="labelId" class="field-label">{{ label }}</span>
    <div class="stepper">
      <button type="button" class="btn stepper-button" :aria-label="decreaseLabel" :disabled="atMin" @click="change(-step)">
        −
      </button>
      <output class="stepper-value" :aria-label="label">{{ shown }}</output>
      <button type="button" class="btn stepper-button" :aria-label="increaseLabel" :disabled="atMax" @click="change(step)">
        +
      </button>
    </div>
    <FieldError v-if="error" :id="errorId">{{ error }}</FieldError>
  </div>
</template>

<style scoped>
.stepper {
  display: grid;
  grid-template-columns: var(--target) 1fr var(--target);
  gap: var(--space-sm);
}

.stepper-button {
  width: var(--target);
  padding: 0;
  font-family: var(--font-display);
  font-size: var(--text-title);
}

.stepper-value {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: var(--target);
  border: 2px solid var(--line);
  border-radius: var(--radius-md);
  background: var(--surface-2);
  color: var(--ink);
  font-family: var(--font-display);
  font-size: var(--text-title);
  font-weight: 700;
}
</style>
