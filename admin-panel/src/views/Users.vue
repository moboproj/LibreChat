<template>
  <div class="space-y-4 tracking-tight">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="text-xs uppercase tracking-wider text-[var(--text-muted)]">Catálogo</p>
        <h2 class="text-xl font-semibold text-[var(--text)]">Usuarios</h2>
        <p class="text-sm text-[var(--text-muted)]">
          Gestión de cuentas · paginación en API
        </p>
      </div>
      <div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button type="button" class="ui-btn-secondary w-full sm:w-auto" @click="exportCsv">
          Exportar CSV
        </button>
        <button
          type="button"
          class="ui-btn-secondary w-full sm:w-auto text-red-300"
          :disabled="!selectedIds.length || bulkLoading"
          @click="removeSelected"
        >
          Eliminar ({{ selectedIds.length }})
        </button>
        <button type="button" class="ui-btn-primary w-full sm:w-auto" @click="showCreateForm = true">
          Nuevo usuario
        </button>
      </div>
    </div>

    <UiCard>
      <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          v-model="searchQuery"
          class="ui-input sm:max-w-sm"
          type="search"
          placeholder="Buscar por email o nombre…"
        />
        <p class="text-xs text-[var(--text-muted)]">{{ total }} resultado(s)</p>
      </div>

      <div v-if="loading" class="py-2">
        <TableSkeleton :rows="pageSize" :cols="5" />
      </div>

      <div v-else-if="!users.length" class="py-16 text-center text-sm text-[var(--text-muted)]">
        No hay usuarios
      </div>

      <template v-else>
        <div class="overflow-x-auto">
          <table class="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr
                class="border-b text-xs uppercase tracking-wide text-[var(--text-muted)]"
                style="border-color: var(--border)"
              >
                <th class="px-2 py-2 font-medium">
                  <input
                    type="checkbox"
                    :checked="allPageSelected"
                    @change="toggleSelectPage"
                  />
                </th>
                <th class="px-2 py-2 font-medium">Email</th>
                <th class="px-2 py-2 font-medium">Nombre</th>
                <th class="px-2 py-2 font-medium">Rol</th>
                <th class="hidden px-2 py-2 font-medium md:table-cell">Provider</th>
                <th class="hidden px-2 py-2 font-medium lg:table-cell">Uso</th>
                <th class="px-2 py-2 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="user in users"
                :key="user._id"
                class="border-b"
                style="border-color: var(--border)"
              >
                <td class="px-2 py-3">
                  <input
                    type="checkbox"
                    :checked="selectedIds.includes(user._id)"
                    @change="toggleSelect(user._id)"
                  />
                </td>
                <td class="max-w-[140px] truncate px-2 py-3 text-[var(--text)] sm:max-w-none">
                  {{ user.email }}
                </td>
                <td class="px-2 py-3 text-[var(--text-muted)]">{{ user.name || '—' }}</td>
                <td class="px-2 py-3">
                  <span
                    class="inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase"
                    style="background: rgba(16, 163, 127, 0.15); color: var(--accent)"
                  >
                    {{ user.role || 'USER' }}
                  </span>
                </td>
                <td class="hidden px-2 py-3 text-[var(--text-muted)] md:table-cell">
                  {{ user.provider || '—' }}
                </td>
                <td class="hidden px-2 py-3 text-[10px] text-[var(--text-muted)] lg:table-cell">
                  {{ user.conversationCount || 0 }} conv ·
                  {{ Number(user.totalTokens || 0).toLocaleString() }} tok
                  <span v-if="user.lastActivityAt" class="block">
                    {{ formatDate(user.lastActivityAt) }}
                  </span>
                </td>
                <td class="px-2 py-3 text-right whitespace-nowrap">
                  <button type="button" class="ui-btn-ghost px-2 py-1" @click="openUsage(user)">
                    Uso
                  </button>
                  <button type="button" class="ui-btn-ghost px-2 py-1" @click="editUser(user)">
                    Editar
                  </button>
                  <button
                    type="button"
                    class="ui-btn-ghost px-2 py-1 text-red-300"
                    @click="removeUser(user._id)"
                  >
                    Eliminar
                  </button>
                </td>
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

    <div v-if="showUsage" class="ui-modal-overlay" @click="closeUsage">
      <div class="ui-modal max-w-2xl" @click.stop>
        <div class="mb-4 flex items-start justify-between gap-2">
          <div>
            <h3 class="text-lg font-semibold text-[var(--text)]">Uso del usuario</h3>
            <p class="text-xs text-[var(--text-muted)]">
              {{ usageData?.user?.email || '—' }} · {{ usageData?.range || '30d' }}
            </p>
          </div>
          <button type="button" class="ui-btn-secondary" @click="closeUsage">Cerrar</button>
        </div>
        <div v-if="usageLoading" class="py-8 text-center text-sm text-[var(--text-muted)]">
          Cargando uso…
        </div>
        <div v-else-if="usageData" class="space-y-4 text-sm">
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <p class="ui-label">Conversaciones</p>
              <p>{{ usageData.counts?.conversationCount || 0 }}</p>
            </div>
            <div>
              <p class="ui-label">Mensajes</p>
              <p>{{ usageData.counts?.messageCount || 0 }}</p>
            </div>
            <div>
              <p class="ui-label">Tokens</p>
              <p>{{ Number(usageData.usage?.totals?.totalTokens || 0).toLocaleString() }}</p>
            </div>
            <div>
              <p class="ui-label">Agentes creados</p>
              <p>{{ usageData.counts?.agentsCreated || 0 }}</p>
            </div>
          </div>

          <div>
            <p class="ui-label mb-2">Tokens por tipo</p>
            <div class="space-y-2">
              <div
                v-for="row in usageTypeBars"
                :key="row.label"
                class="space-y-1"
              >
                <div class="flex items-center justify-between text-xs text-[var(--text-muted)]">
                  <span>{{ row.label }}</span>
                  <span class="font-mono">{{ row.total.toLocaleString() }} · {{ row.pct }}%</span>
                </div>
                <div
                  class="h-2 overflow-hidden rounded-full"
                  style="background: rgba(255, 255, 255, 0.08)"
                >
                  <div
                    class="h-full rounded-full transition-all"
                    :style="{ width: row.pct + '%', background: row.color }"
                  />
                </div>
              </div>
              <p v-if="!usageTypeBars.length" class="text-xs text-[var(--text-muted)]">
                Sin transacciones
              </p>
            </div>
          </div>

          <div>
            <p class="ui-label mb-2">Por modelo</p>
            <div class="max-h-48 space-y-2 overflow-auto">
              <div
                v-for="row in usageModelBars"
                :key="row.label"
                class="space-y-1"
              >
                <div class="flex items-center justify-between text-xs text-[var(--text-muted)]">
                  <span class="min-w-0 truncate">{{ row.label }}</span>
                  <span class="shrink-0 font-mono">{{ row.total.toLocaleString() }} · {{ row.pct }}%</span>
                </div>
                <div
                  class="h-1.5 overflow-hidden rounded-full"
                  style="background: rgba(255, 255, 255, 0.08)"
                >
                  <div
                    class="h-full rounded-full"
                    :style="{ width: row.pct + '%', background: 'var(--accent)' }"
                  />
                </div>
              </div>
              <p v-if="!usageModelBars.length" class="text-xs text-[var(--text-muted)]">
                Sin transacciones
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showCreateForm" class="ui-modal-overlay" @click="closeForm">
      <div class="ui-modal" @click.stop>
        <h3 class="mb-4 text-lg font-semibold text-[var(--text)]">
          {{ editingUser ? 'Editar usuario' : 'Nuevo usuario' }}
        </h3>
        <form class="space-y-3" @submit.prevent="saveUser">
          <div>
            <label class="ui-label">Email</label>
            <input v-model="formData.email" class="ui-input" type="email" required />
          </div>
          <div>
            <label class="ui-label">Nombre</label>
            <input v-model="formData.name" class="ui-input" type="text" />
          </div>

          <div v-if="!editingUser || showPasswordField">
            <div class="mb-1.5 flex items-center justify-between">
              <label class="ui-label mb-0">
                {{ editingUser ? 'Nueva contraseña' : 'Contraseña' }}
              </label>
              <div class="flex gap-1">
                <button type="button" class="ui-btn-ghost px-2 py-1 text-xs" @click="onGeneratePassword">
                  Generar
                </button>
                <button
                  type="button"
                  class="ui-btn-ghost px-2 py-1 text-xs"
                  @click="togglePasswordVisibility"
                >
                  {{ showPassword ? 'Ocultar' : 'Ver' }}
                </button>
                <button
                  type="button"
                  class="ui-btn-ghost px-2 py-1 text-xs"
                  @click="copyPasswordToClipboard"
                >
                  {{ copyFeedback }}
                </button>
              </div>
            </div>
            <input
              v-model="formData.password"
              class="ui-input"
              :type="showPassword ? 'text' : 'password'"
              :required="!editingUser"
            />
            <p class="mt-1 text-xs text-[var(--text-muted)]">
              Fortaleza: {{ passwordStrength().text }}
            </p>
          </div>
          <div v-else>
            <button
              type="button"
              class="ui-btn-secondary text-xs"
              @click="showPasswordField = true"
            >
              Cambiar contraseña
            </button>
          </div>

          <div>
            <label class="ui-label">Rol</label>
            <select v-model="formData.role" class="ui-input">
              <option v-for="role in availableRoles" :key="role" :value="role">
                {{ role }}
              </option>
            </select>
          </div>

          <div class="flex flex-col-reverse justify-end gap-2 sm:flex-row">
            <button type="button" class="ui-btn-secondary" @click="closeForm">Cancelar</button>
            <button type="submit" class="ui-btn-primary">
              {{ editingUser ? 'Actualizar' : 'Crear' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import { useUsers } from '../composables/useUsers';
import UiCard from '../components/ui/UiCard.vue';
import PaginationBar from '../components/ui/PaginationBar.vue';
import TableSkeleton from '../components/ui/TableSkeleton.vue';

const {
  users,
  selectedIds,
  allPageSelected,
  searchQuery,
  loading,
  bulkLoading,
  usageLoading,
  showCreateForm,
  showUsage,
  usageData,
  showPasswordField,
  showPassword,
  copyFeedback,
  editingUser,
  availableRoles,
  formData,
  page,
  pageSize,
  total,
  totalPages,
  rangeLabel,
  nextPage,
  prevPage,
  setPageSize,
  loadRoles,
  loadUsers,
  toggleSelect,
  toggleSelectPage,
  editUser,
  openUsage,
  closeUsage,
  closeForm,
  saveUser,
  removeUser,
  removeSelected,
  exportCsv,
  onGeneratePassword,
  togglePasswordVisibility,
  copyPasswordToClipboard,
  passwordStrength,
  formatDate,
} = useUsers();

const TYPE_COLORS = {
  prompt: '#60a5fa',
  completion: '#c084fc',
};

function toBars(rows, totalTokens) {
  const max = Number(totalTokens) || rows.reduce((sum, row) => sum + Number(row.total || 0), 0);
  return rows.map((row) => {
    const total = Number(row.total || 0);
    return {
      label: row._id || '—',
      total,
      pct: max ? Math.min(100, Math.round((total / max) * 100)) : 0,
      color: TYPE_COLORS[row._id] || 'var(--accent)',
    };
  });
}

const usageTypeBars = computed(() =>
  toBars(usageData.value?.usage?.byType || [], usageData.value?.usage?.totals?.totalTokens),
);

const usageModelBars = computed(() =>
  toBars(usageData.value?.usage?.byModel || [], usageData.value?.usage?.totals?.totalTokens),
);

onMounted(() => {
  loadUsers();
  loadRoles();
});
</script>
