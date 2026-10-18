<script setup lang="ts">
defineProps<{ planName: string }>()
defineEmits<{ back: [] }>()
</script>

<template>
  <main class="screen workout">
    <div class="stack">
      <p class="muted plan-name">{{ planName }}</p>
      <h1>Koniec treningu</h1>
    </div>
    <button type="button" class="btn btn-primary btn-large btn-block workout-action" @click="$emit('back')">
      Wróć do planów
    </button>
  </main>
</template>

<style scoped>
.plan-name {
  font-family: var(--font-display);
  font-size: var(--text-title);
  font-weight: 700;
  line-height: 1.2;
  overflow-wrap: anywhere;
}
</style>
