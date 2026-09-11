<template>
  <div class="space-y-6 tracking-tight">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
          Analytics
        </p>
        <h1 class="mt-1 text-xl font-semibold text-[var(--text)] sm:text-2xl">
          AI Analytics Dashboard
        </h1>
        <p class="mt-1 text-sm text-[var(--text-muted)]">
          Monitoreo de uso del chat con IA ·
          {{ usingMock ? 'datos mock' : 'datos en vivo (/api/stats)' }}
        </p>
      </div>

      <div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
        <button
          type="button"
          class="ui-btn-secondary w-full sm:w-auto"
          :disabled="loading"
          @click="loadStats"
        >
          Actualizar
        </button>
        <div
          class="inline-flex w-full rounded-lg border p-1 sm:w-auto"
          style="border-color: var(--border); background: var(--surface)"
        >
          <button
            type="button"
            class="flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition sm:flex-none"
            :class="
              timeRange === '7d'
                ? 'bg-[var(--surface-hover)] text-[var(--text)] shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text)]'
            "
            @click="timeRange = '7d'"
          >
            Últimos 7 días
          </button>
          <button
            type="button"
            class="flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition sm:flex-none"
            :class="
              timeRange === '30d'
                ? 'bg-[var(--surface-hover)] text-[var(--text)] shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text)]'
            "
            @click="timeRange = '30d'"
          >
            Últimos 30 días
          </button>
        </div>
      </div>
    </div>

    <div v-if="loading" class="space-y-4">
      <CardSkeleton :count="5" :cols="5" />
      <CardSkeleton :count="2" :cols="2" :lines="6" />
      <CardSkeleton :count="3" :cols="3" :lines="5" />
    </div>
    <UiCard
      v-else-if="error"
      class-name="border-red-900/40 py-8 text-center text-sm text-red-300"
    >
      {{ error }}
    </UiCard>

    <template v-else>
      <!-- KPI row -->
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <UiCard v-for="card in kpiCards" :key="card.label">
          <div class="flex items-start justify-between gap-2">
            <p class="text-xs font-medium text-[var(--text-muted)]">{{ card.label }}</p>
            <span class="text-base leading-none" aria-hidden="true">{{ card.icon }}</span>
          </div>
          <p class="mt-3 text-2xl font-semibold tabular-nums text-[var(--text)]">
            {{ card.value }}
          </p>
          <p class="mt-1 truncate text-xs" :class="card.subClass">{{ card.sub }}</p>
        </UiCard>
      </div>

      <!-- Mid charts 50/50 -->
      <div class="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <UiCard>
          <div class="mb-3 flex items-center justify-between">
            <h2 class="text-sm font-medium text-[var(--text)]">Mensajes por día</h2>
            <span class="text-xs text-[var(--text-muted)]">Spline area · {{ rangeLabel }}</span>
          </div>
          <div class="h-64 w-full">
            <ApexChart
              type="area"
              height="100%"
              width="100%"
              :options="messagesAreaOptions"
              :series="messagesAreaSeries"
            />
          </div>
        </UiCard>

        <UiCard>
          <div class="mb-3 flex items-center justify-between">
            <h2 class="text-sm font-medium text-[var(--text)]">Usuarios activos / día</h2>
            <span class="text-xs text-[var(--text-muted)]">Barras · {{ rangeLabel }}</span>
          </div>
          <div class="h-64 w-full">
            <ApexChart
              type="bar"
              height="100%"
              width="100%"
              :options="activeUsersBarOptions"
              :series="activeUsersBarSeries"
            />
          </div>
        </UiCard>
      </div>

      <div class="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <UiCard>
          <div class="mb-3 flex items-center justify-between">
            <h2 class="text-sm font-medium text-[var(--text)]">Respuestas por modelo</h2>
            <span class="text-xs text-[var(--text-muted)]">Donut</span>
          </div>
          <div class="h-64 w-full">
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
            <h2 class="text-sm font-medium text-[var(--text)]">Conversaciones por endpoint</h2>
            <span class="text-xs text-[var(--text-muted)]">Barras horizontales</span>
          </div>
          <div class="h-64 w-full">
            <ApexChart
              type="bar"
              height="100%"
              width="100%"
              :options="endpointBarOptions"
              :series="endpointBarSeries"
            />
          </div>
        </UiCard>

        <UiCard>
          <div class="mb-3 flex items-center justify-between">
            <h2 class="text-sm font-medium text-[var(--text)]">Tokens por tipo</h2>
            <span class="text-xs text-[var(--text-muted)]">Apiladas · prompt vs completion</span>
          </div>
          <div class="h-64 w-full">
            <ApexChart
              type="bar"
              height="100%"
              width="100%"
              :options="tokensStackedOptions"
              :series="tokensStackedSeries"
            />
          </div>
        </UiCard>
      </div>

      <UiCard>
        <div class="mb-4 flex items-center justify-between gap-2">
          <h2 class="text-sm font-medium text-[var(--text)]">
            Top usuarios por tokens consumidos
          </h2>
          <span class="text-xs text-[var(--text-muted)]">topUsersByTokens</span>
        </div>

        <div
          v-if="!stats.topUsersByTokens.length"
          class="py-10 text-center text-sm text-slate-500"
        >
          Sin datos de consumo por usuario
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr class="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-500">
                <th class="px-2 py-2 font-medium">#</th>
                <th class="px-2 py-2 font-medium">Usuario</th>
                <th class="px-2 py-2 font-medium">Email</th>
                <th class="px-2 py-2 font-medium text-right">Tokens</th>
                <th class="px-2 py-2 font-medium">Participación</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(user, i) in stats.topUsersByTokens"
                :key="String(user._id)"
                class="border-b border-slate-800/80"
              >
                <td class="px-2 py-3 tabular-nums text-slate-500">{{ i + 1 }}</td>
                <td class="px-2 py-3 font-medium text-slate-100">
                  {{ user.name || '—' }}
                </td>
                <td class="px-2 py-3 text-slate-400">{{ user.email || '—' }}</td>
                <td class="px-2 py-3 text-right tabular-nums text-slate-100">
                  {{ fmtCompact(user.totalTokens) }}
                </td>
                <td class="px-2 py-3">
                  <div class="flex items-center gap-2">
                    <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800">
                      <div
                        class="h-full rounded-full bg-sky-400"
                        :style="{ width: pct(user.totalTokens, maxUserTokens) + '%' }"
                      />
                    </div>
                    <span class="w-10 text-right text-xs tabular-nums text-slate-500">
                      {{ pct(user.totalTokens, maxUserTokens) }}%
                    </span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </UiCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ApexOptions } from 'apexcharts';
import ApexChart from 'vue3-apexcharts';
import { useAdminStats } from '@/composables/useAdminStats';
import UiCard from '@/components/ui/UiCard.vue';
import CardSkeleton from '@/components/ui/CardSkeleton.vue';

const {
  loading,
  error,
  stats,
  timeRange,
  usingMock,
  promptTokens,
  completionTokens,
  totalTokens,
  avgMsgPerConv,
  maxUserTokens,
  slicedDays,
  loadStats,
  fmt,
  fmtCompact,
  pct,
} = useAdminStats();

const rangeLabel = computed(() =>
  timeRange.value === '7d' ? 'últimos 7 días' : 'últimos 30 días',
);

const kpiCards = computed(() => [
  {
    icon: '💬',
    label: 'Mensajes Totales',
    value: fmt(stats.value.totals.totalMessages),
    sub: `+${fmt(stats.value.messagesLast7Days)} últimos 7 días`,
    subClass: 'text-slate-400',
  },
  {
    icon: '👥',
    label: 'Usuarios',
    value: fmt(stats.value.totals.totalUsers),
    sub: `+${fmt(stats.value.newUsersLast30Days)} últimos 30 días`,
    subClass: 'text-emerald-400',
  },
  {
    icon: '🗂️',
    label: 'Conversaciones',
    value: fmt(stats.value.totals.totalConversations),
    sub: `${avgMsgPerConv.value} mensajes/conv`,
    subClass: 'text-slate-400',
  },
  {
    icon: '🔢',
    label: 'Tokens Consumidos',
    value: fmtCompact(totalTokens.value),
    sub: `${fmtCompact(promptTokens.value)} prompt · ${fmtCompact(completionTokens.value)} completion`,
    subClass: 'text-slate-400',
  },
  {
    icon: '🤖',
    label: 'Agentes Activos',
    value: fmt(stats.value.totals.totalAgents),
    sub: `${fmt(stats.value.totals.totalFiles)} archivos subidos`,
    subClass: 'text-slate-400',
  },
]);

const chartBase: ApexOptions = {
  chart: {
    background: 'transparent',
    toolbar: { show: false },
    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
  },
  theme: { mode: 'dark' },
  grid: {
    borderColor: '#1e293b',
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

const messagesAreaSeries = computed(() => [
  { name: 'Mensajes', data: slicedDays.value.messages.map((d) => d.count) },
]);

const messagesAreaOptions = computed<ApexOptions>(() => ({
  ...chartBase,
  chart: { ...chartBase.chart, type: 'area', sparkline: { enabled: false } },
  stroke: { curve: 'smooth', width: 2 },
  fill: {
    type: 'gradient',
    gradient: {
      shadeIntensity: 0.4,
      opacityFrom: 0.45,
      opacityTo: 0.05,
      stops: [0, 90, 100],
    },
  },
  colors: ['#38bdf8'],
  xaxis: {
    ...chartBase.xaxis,
    categories: slicedDays.value.messages.map((d) => d._id.slice(5)),
  },
}));

const activeUsersBarSeries = computed(() => [
  {
    name: 'Usuarios activos',
    data: slicedDays.value.active.map((d) => d.activeUsers),
  },
]);

const activeUsersBarOptions = computed<ApexOptions>(() => ({
  ...chartBase,
  chart: { ...chartBase.chart, type: 'bar' },
  plotOptions: { bar: { borderRadius: 3, columnWidth: '55%' } },
  colors: ['#818cf8'],
  xaxis: {
    ...chartBase.xaxis,
    categories: slicedDays.value.active.map((d) => d._id.slice(5)),
  },
}));

const modelDonutSeries = computed(() =>
  stats.value.messagesByModel.map((m) => m.count),
);

const modelDonutOptions = computed<ApexOptions>(() => ({
  ...chartBase,
  labels: stats.value.messagesByModel.map((m) => m._id || 'unknown'),
  colors: ['#38bdf8', '#34d399', '#fbbf24', '#f87171', '#a78bfa'],
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
              fmt(stats.value.messagesByModel.reduce((s, m) => s + m.count, 0)),
          },
        },
      },
    },
  },
  legend: { ...chartBase.legend, position: 'bottom' },
}));

const endpointBarSeries = computed(() => [
  {
    name: 'Mensajes',
    data: stats.value.messagesByEndpoint.map((e) => e.count),
  },
]);

const endpointBarOptions = computed<ApexOptions>(() => ({
  ...chartBase,
  chart: { ...chartBase.chart, type: 'bar' },
  plotOptions: { bar: { horizontal: true, borderRadius: 3, barHeight: '55%' } },
  colors: ['#2dd4bf'],
  xaxis: {
    ...chartBase.xaxis,
    categories: stats.value.messagesByEndpoint.map((e) => e._id || 'unknown'),
  },
}));

const tokensStackedSeries = computed(() => [
  { name: 'Prompt (entrada)', data: [promptTokens.value] },
  { name: 'Completion (salida)', data: [completionTokens.value] },
]);

const tokensStackedOptions = computed<ApexOptions>(() => ({
  ...chartBase,
  chart: { ...chartBase.chart, type: 'bar', stacked: true },
  plotOptions: { bar: { horizontal: false, borderRadius: 4, columnWidth: '35%' } },
  colors: ['#60a5fa', '#c084fc'],
  xaxis: { ...chartBase.xaxis, categories: ['Tokens'] },
  yaxis: {
    ...chartBase.yaxis,
    labels: {
      style: { colors: '#64748b', fontSize: '10px' },
      formatter: (v: number) => fmtCompact(v),
    },
  },
}));
</script>
