<template>
  <div class="h-full w-full min-h-[8rem]">
    <div
      v-if="engine === 'pending'"
      class="flex h-full items-center justify-center text-xs text-[var(--text-muted)]"
    >
      Cargando gráfica…
    </div>
    <component
      :is="ApexChart"
      v-else-if="engine === 'apex' && ApexChart"
      :type="type"
      :height="height"
      :width="width"
      :options="options"
      :series="series"
    />
    <AdminChart
      v-else-if="fallback"
      :type="fallback.type"
      :data="fallback.data"
      :options="fallback.options"
    />
    <div
      v-else
      class="flex h-full items-center justify-center text-xs text-red-300"
    >
      No se pudo cargar la gráfica
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ChartData, ChartOptions } from 'chart.js';
import AdminChart from '@/components/ui/AdminChart.vue';
import { useChartEngine } from '@/composables/useChartEngine';

defineProps<{
  type: string;
  height?: string | number;
  width?: string | number;
  options: Record<string, unknown>;
  series: unknown;
  fallback?: {
    type: 'line' | 'bar' | 'doughnut';
    data: ChartData;
    options?: ChartOptions;
  };
}>();

const { engine, ApexChart, ensureLoaded } = useChartEngine();
void ensureLoaded();
</script>
