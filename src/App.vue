<script setup lang="ts">
import { ref } from 'vue'
import EndWorkoutConfirm from './components/EndWorkoutConfirm.vue'
import PlanEditor from './components/PlanEditor.vue'
import PlanList from './components/PlanList.vue'
import WorkoutEnd from './components/WorkoutEnd.vue'
import WorkoutRest from './components/WorkoutRest.vue'
import WorkoutSet from './components/WorkoutSet.vue'
import { listPlans } from './plans/planStore'
import { useWorkout } from './workout/useWorkout'

type View = { kind: 'plan-list' } | { kind: 'plan-editor' }

const view = ref<View>({ kind: 'plan-list' })
const plans = ref(listPlans())
const workout = useWorkout()

function showList(): void {
  plans.value = listPlans()
  view.value = { kind: 'plan-list' }
}

function startPlan(planId: string): void {
  const plan = plans.value.find((candidate) => candidate.id === planId)
  if (plan !== undefined) workout.start(plan)
}

function openEditor(): void {
  workout.dismissExpired()
  view.value = { kind: 'plan-editor' }
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
    @new-plan="openEditor"
    @start="startPlan"
  />
  <PlanEditor v-else @saved="showList" @cancel="view = { kind: 'plan-list' }" />
</template>
