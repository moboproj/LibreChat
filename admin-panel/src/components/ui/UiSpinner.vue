<template>
  <div
    class="inline-flex items-center gap-2 text-sm text-[var(--text-muted)]"
    role="status"
    aria-live="polite"
  >
    <span
      class="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-[var(--accent)]"
      aria-hidden="true"
    />
    <span>{{ label }}</span>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    label?: string;
  }>(),
  {
    label: 'Cargando…',
  },
);
</script>
