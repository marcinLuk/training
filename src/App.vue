<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import CardioPlanEditor from './components/CardioPlanEditor.vue'
import CardioSession from './components/CardioSession.vue'
import EndWorkoutConfirm from './components/EndWorkoutConfirm.vue'
import PlanEditor from './components/PlanEditor.vue'
import PlanList from './components/PlanList.vue'
import PlanTypeChoice from './components/PlanTypeChoice.vue'
import WorkoutEnd from './components/WorkoutEnd.vue'
import WorkoutRest from './components/WorkoutRest.vue'
import WorkoutSet from './components/WorkoutSet.vue'
import { now } from './lib/clock'
import { isCardioPlan, type CardioPlan, type Plan } from './plans/plan'
import { deletePlan, listAllPlans } from './plans/planStore'
import { useServiceWorkerUpdates } from './pwa/useServiceWorkerUpdates'
import { useCardio } from './workout/useCardio'
import { ACTION_GUARD_MS, useWorkout } from './workout/useWorkout'

type View =
  | { kind: 'plan-list' }
  | { kind: 'plan-editor'; plan?: Plan }
  | { kind: 'cardio-editor'; plan?: CardioPlan }

const view = ref<View>({ kind: 'plan-list' })
// The "Jaki plan?" question, shown over the plan list after "Nowy plan".
const choosingType = ref(false)
const plans = ref(listAllPlans())
// The wake lock is one shared lock. `useWorkout` releases it whenever it holds no strength
// workout, on setup and on every return to the page. It must be set up BEFORE `useCardio`, so
// its listeners run first and a running cardio session takes the lock again right after.
const workout = useWorkout()
const cardio = useCardio()
const deleteError = ref<string | null>(null)
/** True while any workout view (strength or cardio, also the end screen) is on screen. */
const workoutOpen = computed(() => workout.view.value !== null || cardio.view.value !== null)
const expiredNotice = computed(() => workout.expired.value || cardio.expired.value)

useServiceWorkerUpdates({
  planListShown: () => view.value.kind === 'plan-list',
  workoutRunning: () => workoutOpen.value,
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

/**
 * When a workout of either kind was last ended or left. The strength and cardio controllers each
 * guard only their own taps, so the second tap of a double tap that ends one kind would start the
 * other kind from the plan list. Starts of both kinds wait for this shared window.
 */
let workoutEndedGuardUntil = 0

// One place for every route from an open workout to the plan list: end confirm, end-screen return,
// a tap that expires an idle workout, and an expiry by the controller's own timer. The watcher runs
// sync, so the window starts at the moment of the screen change.
watch(
  workoutOpen,
  (open, wasOpen) => {
    if (wasOpen && !open) workoutEndedGuardUntil = now() + ACTION_GUARD_MS
  },
  { flush: 'sync' },
)

function startPlan(planId: string): void {
  if (now() < workoutEndedGuardUntil) return
  const plan = plans.value.find((candidate) => candidate.id === planId)
  if (plan === undefined) return
  const started = isCardioPlan(plan) ? cardio.start(plan) : workout.start(plan)
  // Either start clears its own notice; clear the other kind's notice too, or it comes back later.
  if (started) dismissExpired()
}

function dismissExpired(): void {
  workout.dismissExpired()
  cardio.dismissExpired()
}

function openEditor(planId?: string): void {
  dismissExpired()
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
  dismissExpired()
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

/** Shows the plan list after a workout of either kind ended. The shared start guard arms itself. */
function showListAfterEnd(): void {
  showList()
}

function endWorkout(): void {
  if (workout.confirmEnd()) showListAfterEnd()
}

function leaveWorkout(): void {
  if (workout.leave()) showListAfterEnd()
}

function endCardio(): void {
  if (cardio.confirmEnd()) showListAfterEnd()
}

function leaveCardio(): void {
  if (cardio.leave()) showListAfterEnd()
}
</script>

<template>
  <template v-if="cardio.view.value !== null">
    <WorkoutEnd v-if="cardio.view.value.phase === 'finished'" :plan-name="cardio.view.value.planName" @back="leaveCardio" />
    <CardioSession
      v-else
      :view="cardio.view.value"
      @pause="cardio.pause"
      @resume="cardio.resume"
      @end="cardio.askEnd"
    />
    <EndWorkoutConfirm v-if="cardio.confirmingEnd.value" @confirm="endCardio" @cancel="cardio.cancelEnd" />
  </template>
  <template v-else-if="workout.view.value !== null">
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
    :expired-notice="expiredNotice"
    :error-text="deleteError ?? undefined"
    @new-plan="choosingType = true"
    @start="startPlan"
    @edit="openEditor"
    @delete="removePlan"
  />
  <CardioPlanEditor v-else-if="view.kind === 'cardio-editor'" :plan="view.plan" @saved="showList" @cancel="showList" />
  <PlanEditor v-else :plan="view.plan" @saved="showList" @cancel="showList" />
  <PlanTypeChoice
    v-if="choosingType && !workoutOpen && view.kind === 'plan-list'"
    @strength="openEditor()"
    @cardio="openNewCardioEditor"
    @cancel="choosingType = false"
  />
</template>
