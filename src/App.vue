<script setup lang="ts">
import { ref } from 'vue'
import PlanEditor from './components/PlanEditor.vue'
import PlanList from './components/PlanList.vue'
import { listPlans } from './plans/planStore'

// Later slices add the workout screens to this union.
type View = { kind: 'plan-list' } | { kind: 'plan-editor' }

const view = ref<View>({ kind: 'plan-list' })
const plans = ref(listPlans())

function showList(): void {
  plans.value = listPlans()
  view.value = { kind: 'plan-list' }
}
</script>

<template>
  <PlanList v-if="view.kind === 'plan-list'" :plans="plans" @new-plan="view = { kind: 'plan-editor' }" />
  <PlanEditor v-else-if="view.kind === 'plan-editor'" @saved="showList" @cancel="view = { kind: 'plan-list' }" />
</template>
