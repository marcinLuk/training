<script setup lang="ts">
import { ref } from 'vue'
import EndWorkoutConfirm from './components/EndWorkoutConfirm.vue'
import PlanEditor from './components/PlanEditor.vue'
import PlanList from './components/PlanList.vue'
import WorkoutEnd from './components/WorkoutEnd.vue'
import WorkoutRest from './components/WorkoutRest.vue'
import WorkoutSet from './components/WorkoutSet.vue'
import type { Plan } from './plans/plan'
import { deletePlan, listPlans } from './plans/planStore'
import { useServiceWorkerUpdates } from './pwa/useServiceWorkerUpdates'
import { useWorkout } from './workout/useWorkout'

type View = { kind: 'plan-list' } | { kind: 'plan-editor'; plan?: Plan }

const view = ref<View>({ kind: 'plan-list' })
const plans = ref(listPlans())
const workout = useWorkout()
const deleteError = ref<string | null>(null)

useServiceWorkerUpdates({
  planListShown: () => view.value.kind === 'plan-list',
  workoutRunning: () => workout.view.value !== null,
})

const deleteFailureText = {
  'backup-failed':
    'Nie udało się zabezpieczyć starych danych, więc plan nie został usunięty. Zwolnij miejsce w pamięci telefonu i spróbuj jeszcze raz.',
  'write-failed':
    'Nie udało się usunąć planu. Sprawdź wolne miejsce w pamięci telefonu i spróbuj jeszcze raz.',
} as const

function showList(): void {
  deleteError.value = null
  plans.value = listPlans()
  view.value = { kind: 'plan-list' }
}

function startPlan(planId: string): void {
  const plan = plans.value.find((candidate) => candidate.id === planId)
  if (plan !== undefined) workout.start(plan)
}

function openEditor(planId?: string): void {
  workout.dismissExpired()
  deleteError.value = null
  const plan = planId === undefined ? undefined : plans.value.find((candidate) => candidate.id === planId)
  view.value = plan === undefined ? { kind: 'plan-editor' } : { kind: 'plan-editor', plan }
}

function removePlan(planId: string): void {
  const result = deletePlan(planId)
  if (result.ok) {
    showList()
  } else {
    deleteError.value = deleteFailureText[result.reason]
  }
}

function endWorkout(): void {
  if (workout.confirmEnd()) showList()
}

function leaveWorkout(): void {
  if (workout.leave()) showList()
}
</script>

<template>
  <template v-if="workout.view.value !== null">
    <WorkoutSet v-if="workout.view.value.mode === 'set'" :view="workout.view.value" @done="workout.finishSet" @undo="workout.undoLast" @skip="workout.skip" @end="workout.askEnd" />
    <WorkoutRest
      v-else-if="workout.view.value.mode === 'rest'"
      :view="workout.view.value"
      :duration-ms="workout.restDurationMs.value"
      @ready="workout.endRest"
      @undo="workout.undoLast"
      @adjust="workout.adjustRestBy"
      @end="workout.askEnd"
    />
    <WorkoutEnd v-else :plan-name="workout.view.value.planName" @back="leaveWorkout" />
    <EndWorkoutConfirm v-if="workout.confirmingEnd.value" @confirm="endWorkout" @cancel="workout.cancelEnd" />
  </template>
  <PlanList
    v-else-if="view.kind === 'plan-list'"
    :plans="plans"
    :expired-notice="workout.expired.value"
    :error-text="deleteError ?? undefined"
    @new-plan="openEditor()"
    @start="startPlan"
    @edit="openEditor"
    @delete="removePlan"
  />
  <PlanEditor v-else :plan="view.plan" @saved="showList" @cancel="showList" />
</template>
