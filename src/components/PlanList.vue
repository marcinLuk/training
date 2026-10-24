<script setup lang="ts">
import { ref } from 'vue'
import { isCardioPlan, summarizePlan, type AnyPlan } from '../plans/plan'
import FieldError from './FieldError.vue'
import PlanDeleteConfirm from './PlanDeleteConfirm.vue'

defineProps<{ plans: AnyPlan[]; expiredNotice?: boolean; errorText?: string }>()
const emit = defineEmits<{
  'new-plan': []
  start: [planId: string]
  edit: [planId: string]
  delete: [planId: string]
}>()

const pendingDelete = ref<AnyPlan | null>(null)

function confirmDelete(): void {
  if (pendingDelete.value === null) return
  emit('delete', pendingDelete.value.id)
  pendingDelete.value = null
}
</script>

<template>
  <main class="screen">
    <h1>Plany</h1>

    <p v-if="expiredNotice" class="card" role="status">Trening wygasł po 2 godzinach bez dotknięcia.</p>

    <FieldError v-if="errorText" role="alert">{{ errorText }}</FieldError>

    <ul v-if="plans.length > 0" class="stack" aria-label="Zapisane plany">
      <li v-for="plan in plans" :key="plan.id" class="card plan-card">
        <div class="plan-head">
          <h2>{{ plan.name }}</h2>
          <span v-if="isCardioPlan(plan)" class="plan-tag plan-tag-cardio">Cardio</span>
          <span v-else class="plan-tag plan-tag-strength">Siła</span>
        </div>
        <p class="muted">{{ summarizePlan(plan) }}</p>
        <button
          type="button"
          class="btn btn-primary btn-large btn-block"
          :aria-label="`Start: ${plan.name}`"
          @click="$emit('start', plan.id)"
        >
          Start
        </button>
        <div class="plan-actions">
          <button type="button" class="btn" :aria-label="`Edytuj: ${plan.name}`" @click="emit('edit', plan.id)">
            Edytuj
          </button>
          <button
            type="button"
            class="btn btn-danger"
            :aria-label="`Usuń plan: ${plan.name}`"
            @click="pendingDelete = plan"
          >
            Usuń plan
          </button>
        </div>
      </li>
    </ul>
    <p v-else class="muted">Nie masz jeszcze planów. Dodaj pierwszy plan, a potem uruchom trening.</p>

    <button
      type="button"
      class="btn btn-block"
      :class="{ 'btn-primary': plans.length === 0 }"
      @click="$emit('new-plan')"
    >Nowy plan</button>
    <PlanDeleteConfirm
      v-if="pendingDelete !== null"
      :plan-name="pendingDelete.name"
      @confirm="confirmDelete"
      @cancel="pendingDelete = null"
    />
  </main>
</template>

<style scoped>
.plan-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.plan-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
}

.plan-head h2 {
  min-width: 0;
  overflow-wrap: anywhere;
}

/* Type tag (DESIGN.md "Znacznik typu"): always a word, never colour alone. */
.plan-tag {
  flex: none;
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 var(--space-md);
  border-radius: var(--radius-pill);
  font-size: var(--text-label);
  font-weight: 600;
  line-height: 1.3;
}

.plan-tag-strength {
  background: var(--surface-2);
  color: var(--ink);
}

/* Violet means cardio only (DESIGN.md Violet Rule): this is its one use on the list. */
.plan-tag-cardio {
  background: var(--cardio);
  color: var(--on-cardio);
}

/* Edit and delete sit far from Start and far from each other (DESIGN.md Do's). */
.plan-actions {
  display: flex;
  justify-content: space-between;
  gap: var(--space-xl);
  margin-top: var(--space-2xl);
}
</style>
