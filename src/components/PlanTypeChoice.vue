<script setup lang="ts">
defineEmits<{ strength: []; cardio: []; cancel: [] }>()
</script>

<template>
  <!-- The in-app question after "Nowy plan". No chalk button: the user has not decided yet. -->
  <div class="confirm" role="alertdialog" aria-modal="true" aria-labelledby="plan-type-title">
    <h2 id="plan-type-title">Jaki plan?</h2>
    <div class="stack">
      <button type="button" class="btn btn-block" @click="$emit('strength')">Siła</button>
      <button type="button" class="btn btn-block" @click="$emit('cardio')">Cardio</button>
      <button type="button" class="btn btn-block" @click="$emit('cancel')">Anuluj</button>
    </div>
  </div>
</template>
