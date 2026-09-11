<template>
  <div
    class="animate-pulse rounded-md bg-white/10"
    :class="[roundedClass, className]"
    :style="style"
    aria-hidden="true"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    width?: string;
    height?: string;
    rounded?: 'sm' | 'md' | 'lg' | 'full';
    className?: string;
  }>(),
  {
    width: '100%',
    height: '1rem',
    rounded: 'md',
    className: '',
  },
);

const roundedClass = computed(() => {
  if (props.rounded === 'sm') return 'rounded';
  if (props.rounded === 'lg') return 'rounded-xl';
  if (props.rounded === 'full') return 'rounded-full';
  return 'rounded-md';
});

const style = computed(() => ({
  width: props.width,
  height: props.height,
}));
</script>
