<template>
  <div class="space-y-6 tracking-tight">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
          Overview
        </p>
        <h1 class="mt-1 text-xl font-semibold text-[var(--text)] sm:text-2xl">Dashboard</h1>
        <p class="mt-1 text-sm text-[var(--text-muted)]">
          Resumen operativo ·
          {{ usingMock ? 'datos mock' : 'datos en vivo (/api/stats)' }}
        </p>
      </div>
      <button
        type="button"
        class="ui-btn-secondary w-full sm:w-auto"
        :disabled="loading"
        @click="loadStats"
      >
        Actualizar
      </button>
    </div>

    <div v-if="loading" class="space-y-4">
      <CardSkeleton :count="4" :cols="4" />
      <CardSkeleton :count="2" :cols="3" :lines="5" />
    </div>
    <UiCard
      v-else-if="error"
      class-name="border-red-900/40 py-8 text-center text-sm text-red-300"
    >
      {{ error }}
    </UiCard>

    <template v-else>
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <UiCard v-for="card in kpiCards" :key="card.label">
          <div class="flex items-start justify-between gap-2">
            <p class="text-xs font-medium text-[var(--text-muted)]">{{ card.label }}</p>
            <span aria-hidden="true">{{ card.icon }}</span>
          </div>
          <p class="mt-3 text-2xl font-semibold tabular-nums text-[var(--text)]">
            {{ card.value }}
          </p>
          <p class="mt-1 text-xs text-[var(--text-muted)]">{{ card.sub }}</p>
        </UiCard>
      </div>

      <div class="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <UiCard class-name="lg:col-span-2">
          <h2 class="mb-3 text-sm font-medium text-[var(--text)]">Resumen de plataforma</h2>
          <dl class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div
              v-for="row in platformRows"
              :key="row.label"
              class="rounded-xl border p-3"
              style="border-color: var(--border); background: rgba(0, 0, 0, 0.2)"
            >
              <dt class="text-xs text-[var(--text-muted)]">{{ row.label }}</dt>
              <dd class="mt-1 text-lg font-semibold tabular-nums text-[var(--text)]">
                {{ row.value }}
              </dd>
            </div>
          </dl>
        </UiCard>

        <UiCard>
          <h2 class="mb-3 text-sm font-medium text-[var(--text)]">Estado del sistema</h2>
          <ul class="space-y-2 text-sm">
            <li
              class="flex items-center justify-between rounded-lg border px-3 py-2"
              style="border-color: var(--border)"
            >
              <span class="text-[var(--text-muted)]">MongoDB</span>
              <span style="color: var(--accent)">Conectado</span>
            </li>
            <li
              class="flex items-center justify-between rounded-lg border px-3 py-2"
              style="border-color: var(--border)"
            >
              <span class="text-[var(--text-muted)]">API REST</span>
              <span class="text-[var(--text)]">:8082</span>
            </li>
            <li
              class="flex items-center justify-between rounded-lg border px-3 py-2"
              style="border-color: var(--border)"
            >
              <span class="text-[var(--text-muted)]">Admin Panel</span>
              <span class="text-[var(--text)]">v1.0.0</span>
            </li>
          </ul>
        </UiCard>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useDashboardStats } from '@/composables/useAdminStats';
import UiCard from '@/components/ui/UiCard.vue';
import CardSkeleton from '@/components/ui/CardSkeleton.vue';

const { loading, error, totals, usingMock, loadStats } = useDashboardStats();

function fmt(n: number): string {
  return (n ?? 0).toLocaleString('es-MX');
}

const kpiCards = computed(() => [
  {
    icon: '👥',
    label: 'Usuarios',
    value: fmt(totals.value.totalUsers),
    sub: 'Colección users',
  },
  {
    icon: '🔌',
    label: 'MCP Servers',
    value: fmt(totals.value.totalMCPServers),
    sub: 'Colección mcpservers',
  },
  {
    icon: '🔐',
    label: 'Roles',
    value: fmt(totals.value.totalRoles),
    sub: 'Colección roles',
  },
  {
    icon: '🗂️',
    label: 'Conversaciones',
    value: fmt(totals.value.totalConversations),
    sub: 'Antes “Colecciones”',
  },
]);

const platformRows = computed(() => [
  { label: 'Mensajes totales', value: fmt(totals.value.totalMessages) },
  { label: 'Agentes', value: fmt(totals.value.totalAgents) },
  { label: 'Archivos', value: fmt(totals.value.totalFiles) },
  {
    label: 'MCP + Roles',
    value: fmt(totals.value.totalMCPServers + totals.value.totalRoles),
  },
]);
</script>
