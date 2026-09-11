<template>
  <div class="space-y-4 tracking-tight">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="text-xs uppercase tracking-wider text-[var(--text-muted)]">Uso</p>
        <h2 class="text-xl font-semibold text-[var(--text)]">Tokens / Transacciones</h2>
        <p class="text-sm text-[var(--text-muted)]">
          Resumen y detalle de consumo · solo lectura
        </p>
      </div>
      <div class="inline-flex rounded-lg border p-1" style="border-color: var(--border)">
        <button
          v-for="option in rangeOptions"
          :key="option.value"
          type="button"
          class="rounded-md px-3 py-1 text-xs"
          :style="
            range === option.value
              ? 'background: rgba(16,163,127,0.18); color: var(--accent)'
              : 'color: var(--text-muted)'
          "
          @click="setRange(option.value)"
        >
          {{ option.label }}
        </button>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <UiCard padding="sm">
        <p class="text-[10px] uppercase text-[var(--text-muted)]">Tokens</p>
        <p class="text-xl font-semibold text-[var(--text)]">
          {{ summaryLoading ? '…' : formatNumber(summary.totals.totalTokens) }}
        </p>
      </UiCard>
      <UiCard padding="sm">
        <p class="text-[10px] uppercase text-[var(--text-muted)]">Transacciones</p>
        <p class="text-xl font-semibold text-[var(--text)]">
          {{ summaryLoading ? '…' : formatNumber(summary.totals.count) }}
        </p>
      </UiCard>
      <UiCard padding="sm">
        <p class="text-[10px] uppercase text-[var(--text-muted)]">Modelos</p>
        <p class="text-xl font-semibold text-[var(--text)]">
          {{ summaryLoading ? '…' : summary.byModel.length }}
        </p>
      </UiCard>
    </div>

    <div class="grid grid-cols-1 gap-3 lg:grid-cols-3">
      <UiCard>
        <div class="mb-3 flex items-center justify-between">
          <h3 class="text-sm font-medium text-[var(--text)]">Tokens por tipo</h3>
          <span class="text-xs text-[var(--text-muted)]">Apiladas</span>
        </div>
        <div v-if="summaryLoading" class="py-16 text-center text-sm text-[var(--text-muted)]">
          Cargando…
        </div>
        <div v-else-if="!tokensStackedSeries.length" class="py-16 text-center text-sm text-[var(--text-muted)]">
          Sin datos
        </div>
        <div v-else class="h-56 w-full">
          <ApexChart
            type="bar"
            height="100%"
            width="100%"
            :options="tokensStackedOptions"
            :series="tokensStackedSeries"
          />
        </div>
      </UiCard>

      <UiCard>
        <div class="mb-3 flex items-center justify-between">
          <h3 class="text-sm font-medium text-[var(--text)]">Tokens por modelo</h3>
          <span class="text-xs text-[var(--text-muted)]">Donut</span>
        </div>
        <div v-if="summaryLoading" class="py-16 text-center text-sm text-[var(--text-muted)]">
          Cargando…
        </div>
        <div v-else-if="!modelDonutSeries.length" class="py-16 text-center text-sm text-[var(--text-muted)]">
          Sin datos
        </div>
        <div v-else class="h-56 w-full">
          <ApexChart
            type="donut"
            height="100%"
            width="100%"
            :options="modelDonutOptions"
            :series="modelDonutSeries"
          />
        </div>
      </UiCard>

      <UiCard>
        <div class="mb-3 flex items-center justify-between">
          <h3 class="text-sm font-medium text-[var(--text)]">Top modelos</h3>
          <span class="text-xs text-[var(--text-muted)]">Barras</span>
        </div>
        <div v-if="summaryLoading" class="py-16 text-center text-sm text-[var(--text-muted)]">
          Cargando…
        </div>
        <div v-else-if="!modelBarSeries[0]?.data?.length" class="py-16 text-center text-sm text-[var(--text-muted)]">
          Sin datos
        </div>
        <div v-else class="h-56 w-full">
          <ApexChart
            type="bar"
            height="100%"
            width="100%"
            :options="modelBarOptions"
            :series="modelBarSeries"
          />
        </div>
      </UiCard>
    </div>

    <UiCard>
      <div class="mb-4 flex items-center justify-between gap-2">
        <h3 class="text-sm font-medium text-[var(--text)]">Top usuarios por tokens</h3>
        <span class="text-xs text-[var(--text-muted)]">participación</span>
      </div>
      <div v-if="summaryLoading" class="py-10 text-center text-sm text-[var(--text-muted)]">
        Cargando…
      </div>
      <div v-else-if="!summary.byUser.length" class="py-10 text-center text-sm text-[var(--text-muted)]">
        Sin datos de consumo por usuario
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead>
            <tr
              class="border-b text-xs uppercase tracking-wide text-[var(--text-muted)]"
              style="border-color: var(--border)"
            >
              <th class="px-2 py-2 font-medium">#</th>
              <th class="px-2 py-2 font-medium">Usuario</th>
              <th class="px-2 py-2 font-medium text-right">Tokens</th>
              <th class="px-2 py-2 font-medium">Participación</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(user, i) in summary.byUser"
              :key="String(user._id)"
              class="border-b"
              style="border-color: var(--border)"
            >
              <td class="px-2 py-3 text-[var(--text-muted)]">{{ i + 1 }}</td>
              <td class="max-w-[220px] truncate px-2 py-3 text-[var(--text)]">
                {{ user.email || user.name || user._id }}
              </td>
              <td class="px-2 py-3 text-right font-mono text-[var(--text)]">
                {{ formatNumber(user.totalTokens) }}
              </td>
              <td class="px-2 py-3">
                <div class="flex items-center gap-2">
                  <div
                    class="h-1.5 flex-1 overflow-hidden rounded-full"
                    style="background: rgba(255, 255, 255, 0.08)"
                  >
                    <div
                      class="h-full rounded-full"
                      :style="{
                        width: pct(user.totalTokens, maxUserTokens) + '%',
                        background: 'var(--accent)',
                      }"
                    />
                  </div>
                  <span class="w-10 text-right text-xs text-[var(--text-muted)]">
                    {{ pct(user.totalTokens, maxUserTokens) }}%
                  </span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UiCard>

    <UiCard>
      <div class="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <input
          v-model="searchQuery"
          class="ui-input sm:max-w-sm"
          type="search"
          placeholder="Buscar model, conversationId, tokenType…"
        />
        <input
          v-model="userFilter"
          class="ui-input sm:max-w-xs"
          type="text"
          placeholder="Filtrar por user id…"
          @keyup.enter="applyUserFilter"
        />
        <button type="button" class="ui-btn-secondary w-full sm:w-auto" @click="applyUserFilter">
          Aplicar filtro
        </button>
        <p class="text-xs text-[var(--text-muted)]">{{ total }} transacción(es)</p>
      </div>

      <div v-if="loading" class="py-2">
        <TableSkeleton :rows="pageSize" :cols="5" />
      </div>
      <div v-else-if="!transactions.length" class="py-16 text-center text-sm text-[var(--text-muted)]">
        No hay transacciones
      </div>
      <template v-else>
        <div class="overflow-x-auto">
          <table class="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead>
              <tr
                class="border-b text-xs uppercase tracking-wide text-[var(--text-muted)]"
                style="border-color: var(--border)"
              >
                <th class="px-2 py-2 font-medium">Usuario</th>
                <th class="px-2 py-2 font-medium">Tipo</th>
                <th class="px-2 py-2 font-medium">Model</th>
                <th class="px-2 py-2 font-medium">Tokens</th>
                <th class="px-2 py-2 font-medium">Fecha</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="tx in transactions"
                :key="tx._id"
                class="border-b"
                style="border-color: var(--border)"
              >
                <td class="max-w-[180px] truncate px-2 py-3 text-[var(--text)]">
                  {{ tx.userEmail || tx.userName || tx.user || '—' }}
                </td>
                <td class="px-2 py-3 text-[var(--text-muted)]">{{ tx.tokenType || '—' }}</td>
                <td class="px-2 py-3 text-[var(--text-muted)]">{{ tx.model || '—' }}</td>
                <td class="px-2 py-3 font-mono text-[var(--text)]">
                  {{ formatNumber(Math.abs(tx.rawAmount || tx.tokenValue || 0)) }}
                </td>
                <td class="px-2 py-3 text-[var(--text-muted)]">{{ formatDate(tx.createdAt) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="mt-4">
          <PaginationBar
            :page="page"
            :page-size="pageSize"
            :total-pages="totalPages"
            :range-label="rangeLabel"
            :loading="loading"
            @prev="prevPage"
            @next="nextPage"
            @update:page-size="setPageSize"
          />
        </div>
      </template>
    </UiCard>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import ApexChart from 'vue3-apexcharts';
import { useUsage } from '../composables/useUsage';
import UiCard from '../components/ui/UiCard.vue';
import PaginationBar from '../components/ui/PaginationBar.vue';
import TableSkeleton from '../components/ui/TableSkeleton.vue';

const rangeOptions = [
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: 'all', label: 'Todo' },
];

const {
  transactions,
  summary,
  loading,
  summaryLoading,
  range,
  userFilter,
  page,
  pageSize,
  total,
  totalPages,
  rangeLabel,
  searchQuery,
  nextPage,
  prevPage,
  setPageSize,
  reloadAll,
  setRange,
  applyUserFilter,
  formatDate,
} = useUsage();

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

function pct(value, max) {
  if (!max) return 0;
  return Math.min(100, Math.round((Number(value || 0) / max) * 100));
}

const maxUserTokens = computed(() =>
  Math.max(0, ...summary.value.byUser.map((row) => Number(row.totalTokens || 0))),
);

const chartBase = {
  chart: {
    background: 'transparent',
    toolbar: { show: false },
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
  },
  theme: { mode: 'dark' },
  grid: {
    borderColor: '#334155',
    strokeDashArray: 3,
  },
  dataLabels: { enabled: false },
  legend: {
    labels: { colors: '#94a3b8' },
    fontSize: '11px',
  },
  tooltip: { theme: 'dark' },
  xaxis: {
    labels: { style: { colors: '#64748b', fontSize: '10px' } },
    axisBorder: { show: false },
    axisTicks: { show: false },
  },
  yaxis: {
    labels: { style: { colors: '#64748b', fontSize: '10px' } },
  },
};

const tokensByKey = computed(() => {
  const map = Object.fromEntries(
    (summary.value.byType || []).map((row) => [String(row._id || ''), Number(row.total || 0)]),
  );
  return {
    prompt: map.prompt || 0,
    completion: map.completion || 0,
    other: Object.entries(map)
      .filter(([key]) => key !== 'prompt' && key !== 'completion')
      .reduce((sum, [, value]) => sum + value, 0),
  };
});

const tokensStackedSeries = computed(() => {
  const { prompt, completion, other } = tokensByKey.value;
  if (!prompt && !completion && !other) return [];
  const series = [
    { name: 'Prompt', data: [prompt] },
    { name: 'Completion', data: [completion] },
  ];
  if (other) series.push({ name: 'Otros', data: [other] });
  return series;
});

const tokensStackedOptions = computed(() => ({
  ...chartBase,
  chart: { ...chartBase.chart, type: 'bar', stacked: true },
  plotOptions: { bar: { horizontal: false, borderRadius: 4, columnWidth: '35%' } },
  colors: ['#60a5fa', '#c084fc', '#94a3b8'],
  xaxis: { ...chartBase.xaxis, categories: ['Tokens'] },
  yaxis: {
    ...chartBase.yaxis,
    labels: {
      style: { colors: '#64748b', fontSize: '10px' },
      formatter: (v) => Number(v || 0).toLocaleString(),
    },
  },
}));

const modelDonutSeries = computed(() =>
  (summary.value.byModel || []).slice(0, 8).map((row) => Number(row.total || 0)),
);

const modelDonutOptions = computed(() => ({
  ...chartBase,
  labels: (summary.value.byModel || []).slice(0, 8).map((row) => row._id || 'unknown'),
  colors: ['#38bdf8', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#2dd4bf', '#fb7185', '#94a3b8'],
  stroke: { width: 0 },
  plotOptions: {
    pie: {
      donut: {
        size: '68%',
        labels: {
          show: true,
          name: { color: '#cbd5e1', fontSize: '12px' },
          value: { color: '#f8fafc', fontSize: '16px', fontWeight: 600 },
          total: {
            show: true,
            label: 'Total',
            color: '#94a3b8',
            formatter: () =>
              formatNumber(
                (summary.value.byModel || [])
                  .slice(0, 8)
                  .reduce((sum, row) => sum + Number(row.total || 0), 0),
              ),
          },
        },
      },
    },
  },
  legend: { ...chartBase.legend, position: 'bottom' },
}));

const modelBarSeries = computed(() => [
  {
    name: 'Tokens',
    data: (summary.value.byModel || []).slice(0, 8).map((row) => Number(row.total || 0)),
  },
]);

const modelBarOptions = computed(() => ({
  ...chartBase,
  chart: { ...chartBase.chart, type: 'bar' },
  plotOptions: { bar: { horizontal: true, borderRadius: 3, barHeight: '55%' } },
  colors: ['#2dd4bf'],
  xaxis: {
    ...chartBase.xaxis,
    categories: (summary.value.byModel || []).slice(0, 8).map((row) => row._id || 'unknown'),
  },
}));

onMounted(() => {
  reloadAll();
});
</script>
