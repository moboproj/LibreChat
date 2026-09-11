<template>
  <div class="space-y-3" role="status" aria-live="polite" aria-label="Cargando">
    <div
      v-for="row in rows"
      :key="row"
      class="flex items-center gap-3 border-b py-3"
      style="border-color: var(--border)"
    >
      <UiSkeleton
        v-for="col in cols"
        :key="`${row}-${col}`"
        :width="colWidths[col - 1] || '20%'"
        height="0.85rem"
      />
    </div>
    <span class="sr-only">Cargando datos…</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import UiSkeleton from './UiSkeleton.vue';

const props = withDefaults(
  defineProps<{
    rows?: number;
    cols?: number;
  }>(),
  {
    rows: 6,
    cols: 4,
  },
);

const colWidths = computed(() => {
  const defaults = ['28%', '22%', '14%', '18%', '12%'];
  return defaults.slice(0, props.cols);
});
</script>
