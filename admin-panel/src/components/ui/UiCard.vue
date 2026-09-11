<template>
  <component
    :is="as"
    class="ui-card"
    :class="[paddingClass, className]"
  >
    <div class="relative z-[1]">
      <slot />
    </div>
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    as?: string;
    padding?: 'none' | 'sm' | 'md' | 'lg';
    className?: string;
  }>(),
  {
    as: 'div',
    padding: 'md',
    className: '',
  },
);

const paddingClass = computed(() => {
  if (props.padding === 'none') return 'p-0';
  if (props.padding === 'sm') return 'p-3';
  if (props.padding === 'lg') return 'p-6';
  return 'p-4';
});
</script>
