import { markRaw, onMounted, shallowRef, ref } from 'vue';
import type { Component } from 'vue';

export type ChartEngine = 'pending' | 'apex' | 'chartjs';

const sharedEngine = ref<ChartEngine>('pending');
const sharedApex = shallowRef<Component | null>(null);
let loadPromise: Promise<void> | null = null;

async function loadApexEngine() {
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    try {
      const [{ default: VueApexCharts }] = await Promise.all([
        import('vue3-apexcharts'),
        import('apexcharts'),
      ]);
      sharedApex.value = markRaw(VueApexCharts);
      sharedEngine.value = 'apex';
    } catch (error) {
      console.warn('[charts] ApexCharts failed to load; falling back to Chart.js', error);
      sharedApex.value = null;
      sharedEngine.value = 'chartjs';
    }
  })();
  return loadPromise;
}

/** Prefer ApexCharts; on import/runtime failure use Chart.js. Lazy — not in the login bundle. */
export function useChartEngine() {
  onMounted(() => {
    void loadApexEngine();
  });

  return {
    engine: sharedEngine,
    ApexChart: sharedApex,
    ensureLoaded: loadApexEngine,
  };
}
