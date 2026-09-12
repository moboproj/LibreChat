<template>
  <Bar v-if="type === 'bar'" :data="barData" :options="barOptions" />
  <Doughnut v-else-if="type === 'doughnut'" :data="doughnutData" :options="doughnutOptions" />
  <Line v-else :data="lineData" :options="lineOptions" />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Bar, Doughnut, Line } from 'vue-chartjs';
import type { ChartData, ChartOptions } from 'chart.js';
import { darkChartOptions, ensureChartsRegistered } from '@/utils/charts';

ensureChartsRegistered();

const props = defineProps<{
  type: 'line' | 'bar' | 'doughnut';
  data: ChartData;
  options?: ChartOptions;
}>();

const barData = computed(() => props.data as ChartData<'bar'>);
const lineData = computed(() => props.data as ChartData<'line'>);
const doughnutData = computed(() => props.data as ChartData<'doughnut'>);

const barOptions = computed(() => {
  const base = darkChartOptions();
  const extra = props.options || {};
  return {
    ...base,
    ...extra,
    plugins: { ...base.plugins, ...extra.plugins },
    scales: {
      ...((base.scales as Record<string, unknown>) || {}),
      ...((extra.scales as Record<string, unknown>) || {}),
    },
  } as ChartOptions<'bar'>;
});

const lineOptions = computed(() => {
  const base = darkChartOptions();
  const extra = props.options || {};
  return {
    ...base,
    ...extra,
    plugins: { ...base.plugins, ...extra.plugins },
    scales: {
      ...((base.scales as Record<string, unknown>) || {}),
      ...((extra.scales as Record<string, unknown>) || {}),
    },
  } as ChartOptions<'line'>;
});

const doughnutOptions = computed(() => {
  const base = darkChartOptions();
  const extra = props.options || {};
  return {
    ...base,
    ...extra,
    scales: undefined,
    plugins: { ...base.plugins, ...extra.plugins },
  } as ChartOptions<'doughnut'>;
});
</script>
