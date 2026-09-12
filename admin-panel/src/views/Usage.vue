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
        <div
          v-else-if="!hasTokenSeries"
          class="py-16 text-center text-sm text-[var(--text-muted)]"
        >
          Sin datos
        </div>
        <div v-else class="h-56 w-full">
          <AdminChart type="bar" :data="tokensStackedData" :options="stackedBarOptions" />
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
        <div
          v-else-if="!modelDonutData.datasets[0]?.data?.length"
          class="py-16 text-center text-sm text-[var(--text-muted)]"
        >
          Sin datos
        </div>
        <div v-else class="h-56 w-full">
          <AdminChart type="doughnut" :data="modelDonutData" :options="donutOptions" />
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
        <div
          v-else-if="!modelBarData.datasets[0]?.data?.length"
          class="py-16 text-center text-sm text-[var(--text-muted)]"
        >
          Sin datos
        </div>
        <div v-else class="h-56 w-full">
          <AdminChart type="bar" :data="modelBarData" :options="horizontalBarOptions" />
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
import { useUsage } from '../composables/useUsage';
import AdminChart from '../components/ui/AdminChart.vue';
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

const donutOptions = {
  cutout: '68%',
  plugins: { legend: { position: 'bottom' } },
};

const horizontalBarOptions = {
  indexAxis: 'y',
  plugins: { legend: { display: false } },
};

const stackedBarOptions = {
  scales: {
    x: { stacked: true },
    y: { stacked: true },
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

const hasTokenSeries = computed(() => {
  const { prompt, completion, other } = tokensByKey.value;
  return Boolean(prompt || completion || other);
});

const tokensStackedData = computed(() => {
  const { prompt, completion, other } = tokensByKey.value;
  const datasets = [
    { label: 'Prompt', data: [prompt], backgroundColor: '#60a5fa', borderRadius: 4 },
    { label: 'Completion', data: [completion], backgroundColor: '#c084fc', borderRadius: 4 },
  ];
  if (other) {
    datasets.push({ label: 'Otros', data: [other], backgroundColor: '#94a3b8', borderRadius: 4 });
  }
  return { labels: ['Tokens'], datasets };
});

const modelDonutData = computed(() => ({
  labels: (summary.value.byModel || []).slice(0, 8).map((row) => row._id || 'unknown'),
  datasets: [
    {
      data: (summary.value.byModel || []).slice(0, 8).map((row) => Number(row.total || 0)),
      backgroundColor: [
        '#38bdf8',
        '#34d399',
        '#fbbf24',
        '#f87171',
        '#a78bfa',
        '#2dd4bf',
        '#fb7185',
        '#94a3b8',
      ],
      borderWidth: 0,
    },
  ],
}));

const modelBarData = computed(() => ({
  labels: (summary.value.byModel || []).slice(0, 8).map((row) => row._id || 'unknown'),
  datasets: [
    {
      label: 'Tokens',
      data: (summary.value.byModel || []).slice(0, 8).map((row) => Number(row.total || 0)),
      backgroundColor: '#2dd4bf',
      borderRadius: 3,
    },
  ],
}));

onMounted(() => {
  reloadAll();
});
</script>
