<template>
  <div
    class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
  >
    <div class="flex items-center gap-2">
      <UiSpinner v-if="loading" label="Actualizando…" />
      <p v-else class="text-xs text-[var(--text-muted)]">{{ rangeLabel }}</p>
    </div>
    <div class="flex flex-wrap items-center gap-2">
      <label class="flex items-center gap-2 text-xs text-[var(--text-muted)]">
        Por página
        <select
          class="ui-input w-auto py-1.5"
          :value="pageSize"
          :disabled="loading"
          @change="onPageSizeChange"
        >
          <option v-for="size in pageSizeOptions" :key="size" :value="size">
            {{ size }}
          </option>
        </select>
      </label>
      <div class="inline-flex items-center gap-1">
        <button
          type="button"
          class="ui-btn-secondary px-2 py-1.5 text-xs"
          :disabled="loading || page <= 1"
          @click="$emit('prev')"
        >
          Anterior
        </button>
        <span class="min-w-[4.5rem] text-center text-xs text-[var(--text-muted)]">
          {{ page }} / {{ totalPages }}
        </span>
        <button
          type="button"
          class="ui-btn-secondary px-2 py-1.5 text-xs"
          :disabled="loading || page >= totalPages"
          @click="$emit('next')"
        >
          Siguiente
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { PAGE_SIZE_OPTIONS } from '@/composables/useServerPagination';
import UiSpinner from './UiSpinner.vue';

withDefaults(
  defineProps<{
    page: number;
    pageSize: number;
    totalPages: number;
    rangeLabel: string;
    loading?: boolean;
    pageSizeOptions?: readonly number[];
  }>(),
  {
    loading: false,
    pageSizeOptions: () => [...PAGE_SIZE_OPTIONS],
  },
);

const emit = defineEmits<{
  prev: [];
  next: [];
  'update:pageSize': [size: number];
}>();

function onPageSizeChange(event: Event) {
  const value = Number((event.target as HTMLSelectElement).value);
  emit('update:pageSize', value);
}
</script>
