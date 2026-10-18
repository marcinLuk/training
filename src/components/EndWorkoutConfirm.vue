<script setup lang="ts">
defineEmits<{ confirm: []; cancel: [] }>()
</script>

<template>
  <div class="confirm" role="alertdialog" aria-modal="true" aria-labelledby="end-title">
    <h2 id="end-title">Zakończyć trening?</h2>
    <div class="stack">
      <button type="button" class="btn btn-block" @click="$emit('cancel')">Wróć do treningu</button>
      <button type="button" class="btn btn-danger btn-block" @click="$emit('confirm')">Zakończ trening</button>
    </div>
  </div>
</template>
