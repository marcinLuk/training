<script setup lang="ts">
import { summarizePlan, type Plan } from '../plans/plan'

defineProps<{ plans: Plan[]; expiredNotice?: boolean }>()
defineEmits<{ 'new-plan': []; start: [planId: string] }>()
</script>

<template>
  <main class="screen">
    <h1>Plany</h1>

    <p v-if="expiredNotice" class="card" role="status">Trening wygasł po 2 godzinach bez dotknięcia.</p>

    <ul v-if="plans.length > 0" class="stack" aria-label="Zapisane plany">
      <li v-for="plan in plans" :key="plan.id" class="card plan-card">
        <h2>{{ plan.name }}</h2>
        <p class="muted">{{ summarizePlan(plan) }}</p>
        <button
          type="button"
          class="btn btn-primary btn-large btn-block"
          :aria-label="`Start: ${plan.name}`"
          @click="$emit('start', plan.id)"
        >
          Start
        </button>
      </li>
    </ul>
    <p v-else class="muted">Nie masz jeszcze planów. Dodaj pierwszy plan, a potem uruchom trening.</p>

    <button
      type="button"
      class="btn btn-block"
      :class="{ 'btn-primary': plans.length === 0 }"
      @click="$emit('new-plan')"
    >Nowy plan</button>
  </main>
</template>

<style scoped>
.plan-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}
</style>
