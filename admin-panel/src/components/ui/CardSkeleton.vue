<template>
  <div
    class="grid gap-3"
    :class="gridClass"
    role="status"
    aria-live="polite"
    aria-label="Cargando tarjetas"
  >
    <UiCard v-for="n in count" :key="n" :padding="padding">
      <div class="space-y-3">
        <div class="flex items-start justify-between gap-2">
          <UiSkeleton width="40%" height="0.75rem" />
          <UiSkeleton width="1.25rem" height="1.25rem" rounded="full" />
        </div>
        <UiSkeleton width="55%" height="1.75rem" />
        <UiSkeleton width="70%" height="0.7rem" />
        <UiSkeleton v-if="lines > 3" width="90%" height="0.7rem" />
        <UiSkeleton v-if="lines > 4" width="60%" height="0.7rem" />
      </div>
    </UiCard>
    <span class="sr-only">Cargando…</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import UiCard from './UiCard.vue';
import UiSkeleton from './UiSkeleton.vue';

const props = withDefaults(
  defineProps<{
    count?: number;
    cols?: 1 | 2 | 3 | 4 | 5;
    lines?: number;
    padding?: 'none' | 'sm' | 'md' | 'lg';
  }>(),
  {
    count: 4,
    cols: 2,
    lines: 3,
    padding: 'md',
  },
);

const gridClass = computed(() => {
  if (props.cols === 1) return 'grid-cols-1';
  if (props.cols === 3) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
  if (props.cols === 4) return 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-4';
  if (props.cols === 5) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5';
  return 'grid-cols-1 lg:grid-cols-2';
});
</script>
