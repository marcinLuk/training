<script setup lang="ts">
import { ref } from 'vue'
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

function leaveWorkout(): void {
  if (workout.leave()) showList()
}
</script>

<template>
  <template v-if="workout.view.value !== null">
    <WorkoutSet v-if="workout.view.value.mode === 'set'" :view="workout.view.value" @done="workout.finishSet" />
    <WorkoutRest
      v-else-if="workout.view.value.mode === 'rest'"
      :view="workout.view.value"
      :duration-ms="workout.restDurationMs.value"
      @ready="workout.endRest"
    />
    <WorkoutEnd v-else :plan-name="workout.view.value.planName" @back="leaveWorkout" />
  </template>
  <PlanList
    v-else-if="view.kind === 'plan-list'"
    :plans="plans"
    @new-plan="view = { kind: 'plan-editor' }"
    @start="startPlan"
  />
  <PlanEditor v-else @saved="showList" @cancel="view = { kind: 'plan-list' }" />
</template>
