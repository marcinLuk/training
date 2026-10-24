<script setup lang="ts">
import { ref } from 'vue'
import CardioPlanEditor from './components/CardioPlanEditor.vue'
import EndWorkoutConfirm from './components/EndWorkoutConfirm.vue'
import PlanEditor from './components/PlanEditor.vue'
import PlanList from './components/PlanList.vue'
import PlanTypeChoice from './components/PlanTypeChoice.vue'
import WorkoutEnd from './components/WorkoutEnd.vue'
import WorkoutRest from './components/WorkoutRest.vue'
import WorkoutSet from './components/WorkoutSet.vue'
import { isCardioPlan, type CardioPlan, type Plan } from './plans/plan'
import { deletePlan, listAllPlans } from './plans/planStore'
import { useServiceWorkerUpdates } from './pwa/useServiceWorkerUpdates'
import { useWorkout } from './workout/useWorkout'

type View =
  | { kind: 'plan-list' }
  | { kind: 'plan-editor'; plan?: Plan }
  | { kind: 'cardio-editor'; plan?: CardioPlan }

const view = ref<View>({ kind: 'plan-list' })
// The "Jaki plan?" question, shown over the plan list after "Nowy plan".
const choosingType = ref(false)
const plans = ref(listAllPlans())
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
  choosingType.value = false
  plans.value = listAllPlans()
  view.value = { kind: 'plan-list' }
}

function startPlan(planId: string): void {
  const plan = plans.value.find((candidate) => candidate.id === planId)
  if (plan !== undefined && !isCardioPlan(plan)) workout.start(plan)
}

function openEditor(planId?: string): void {
  workout.dismissExpired()
  deleteError.value = null
  choosingType.value = false
  const plan = planId === undefined ? undefined : plans.value.find((candidate) => candidate.id === planId)
  if (plan !== undefined && isCardioPlan(plan)) {
    view.value = { kind: 'cardio-editor', plan }
  } else {
    view.value = plan === undefined ? { kind: 'plan-editor' } : { kind: 'plan-editor', plan }
  }
}

function openNewCardioEditor(): void {
  workout.dismissExpired()
  deleteError.value = null
  choosingType.value = false
  view.value = { kind: 'cardio-editor' }
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
    @new-plan="choosingType = true"
    @start="startPlan"
    @edit="openEditor"
    @delete="removePlan"
  />
  <CardioPlanEditor v-else-if="view.kind === 'cardio-editor'" :plan="view.plan" @saved="showList" @cancel="showList" />
  <PlanEditor v-else :plan="view.plan" @saved="showList" @cancel="showList" />
  <PlanTypeChoice
    v-if="choosingType && workout.view.value === null && view.kind === 'plan-list'"
    @strength="openEditor()"
    @cardio="openNewCardioEditor"
    @cancel="choosingType = false"
  />
</template>
