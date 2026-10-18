<script setup lang="ts">
import { now } from '../lib/clock'
import { ACTION_GUARD_MS } from '../workout/useWorkout'

defineProps<{ planName: string }>()
const emit = defineEmits<{ confirm: []; cancel: [] }>()

// A stray double tap on "Usuń plan" must not land on the confirm button, so taps on
// "Usuń plan" are ignored for a short time after the question opens.
const openedAt = now()

function confirm(): void {
  if (now() - openedAt < ACTION_GUARD_MS) return
  emit('confirm')
}
</script>

<template>
  <div class="confirm" role="alertdialog" aria-modal="true" aria-labelledby="delete-plan-title">
    <h2 id="delete-plan-title">Usunąć plan „{{ planName }}”?</h2>
    <div class="stack">
      <button type="button" class="btn btn-block" @click="emit('cancel')">Anuluj</button>
      <button type="button" class="btn btn-danger btn-block" @click="confirm">Usuń plan</button>
    </div>
  </div>
</template>
