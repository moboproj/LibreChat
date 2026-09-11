<template>
  <div class="space-y-4 tracking-tight">
    <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p class="text-xs uppercase tracking-wider text-[var(--text-muted)]">Catálogo</p>
        <h2 class="text-xl font-semibold text-[var(--text)]">Roles</h2>
        <p class="text-sm text-[var(--text-muted)]">Permisos por rol · paginación en API</p>
      </div>
      <div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          class="ui-btn-secondary w-full sm:w-auto"
          :disabled="hasStoreRole || creatingStore"
          @click="createStoreRole"
        >
          {{ hasStoreRole ? 'STORE ya existe' : 'Crear STORE' }}
        </button>
        <button type="button" class="ui-btn-primary w-full sm:w-auto" @click="openCreateForm">
          Nuevo rol
        </button>
      </div>
    </div>

    <UiCard class-name="mb-1">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <input
          v-model="searchQuery"
          class="ui-input sm:max-w-sm"
          type="search"
          placeholder="Buscar rol…"
        />
        <p class="text-xs text-[var(--text-muted)]">{{ total }} rol(es)</p>
      </div>
    </UiCard>

    <div v-if="loading">
      <CardSkeleton :count="4" :cols="2" :lines="5" />
    </div>
    <div v-else-if="!roles.length" class="py-16 text-center text-sm text-[var(--text-muted)]">
      No hay roles
    </div>

    <template v-else>
      <div class="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <UiCard v-for="role in roles" :key="role._id">
          <div class="mb-3 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 class="text-sm font-semibold text-[var(--text)]">{{ role.name }}</h3>
              <p class="text-xs text-[var(--text-muted)]">
                {{ Object.keys(role.permissions || {}).length }} grupos ·
                {{ role.userCount || 0 }} usuario(s)
              </p>
            </div>
            <div class="flex gap-1">
              <button
                type="button"
                class="ui-btn-ghost px-2 py-1 text-xs"
                @click="openRoleUsers(role)"
              >
                Usuarios
              </button>
              <button type="button" class="ui-btn-ghost px-2 py-1 text-xs" @click="editRole(role)">
                Editar
              </button>
              <button
                v-if="!isProtectedRole(role.name)"
                type="button"
                class="ui-btn-ghost px-2 py-1 text-xs text-red-300"
                @click="removeRole(role._id)"
              >
                Eliminar
              </button>
            </div>
          </div>
          <div class="max-h-48 space-y-2 overflow-y-auto pr-1">
            <div
              v-for="(perms, type) in role.permissions"
              :key="type"
              class="rounded-lg border p-2"
              style="border-color: var(--border); background: rgba(0, 0, 0, 0.2)"
            >
              <p class="mb-1 text-[10px] font-semibold uppercase text-[var(--text-muted)]">
                {{ type }}
              </p>
              <div class="flex flex-wrap gap-1">
                <span
                  v-for="(value, perm) in perms"
                  :key="perm"
                  class="rounded px-1.5 py-0.5 text-[10px]"
                  :style="
                    value
                      ? 'background: rgba(16,163,127,0.18); color: var(--accent)'
                      : 'background: rgba(255,255,255,0.05); color: var(--text-muted)'
                  "
                >
                  {{ perm }}
                </span>
              </div>
            </div>
          </div>
        </UiCard>
      </div>

      <UiCard padding="sm">
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
      </UiCard>
    </template>

    <div v-if="showUsers" class="ui-modal-overlay" @click="closeRoleUsers">
      <div class="ui-modal max-w-2xl" @click.stop>
        <div class="mb-4 flex items-start justify-between gap-2">
          <div>
            <h3 class="text-lg font-semibold text-[var(--text)]">
              Usuarios · {{ selectedRole?.name }}
            </h3>
            <p class="text-xs text-[var(--text-muted)]">
              {{ roleUsers.length }} en esta página (máx. 50)
            </p>
          </div>
          <button type="button" class="ui-btn-secondary" @click="closeRoleUsers">Cerrar</button>
        </div>
        <div v-if="usersLoading" class="py-8 text-center text-sm text-[var(--text-muted)]">
          Cargando…
        </div>
        <div v-else-if="!roleUsers.length" class="py-8 text-center text-sm text-[var(--text-muted)]">
          Nadie tiene este rol
        </div>
        <div v-else class="max-h-[50vh] space-y-2 overflow-y-auto">
          <div
            v-for="user in roleUsers"
            :key="user._id"
            class="rounded-lg border px-3 py-2 text-sm"
            style="border-color: var(--border)"
          >
            <p class="text-[var(--text)]">{{ user.email }}</p>
            <p class="text-xs text-[var(--text-muted)]">
              {{ user.name || '—' }} · {{ user.provider || '—' }} ·
              {{ user.conversationCount || 0 }} conv
            </p>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showCreateForm" class="ui-modal-overlay" @click="closeForm">
      <div class="ui-modal max-w-3xl" @click.stop>
        <h3 class="mb-4 text-lg font-semibold text-[var(--text)]">
          {{ editingRole ? 'Editar rol' : 'Nuevo rol' }}
        </h3>
        <form class="space-y-4" @submit.prevent="saveRole">
          <div>
            <label class="ui-label">Nombre del rol</label>
            <input
              v-model="formData.name"
              class="ui-input"
              type="text"
              required
              :disabled="Boolean(editingRole)"
            />
          </div>
          <div class="grid max-h-[50vh] grid-cols-1 gap-3 overflow-y-auto sm:grid-cols-2">
            <div
              v-for="(actions, type) in permissionMap"
              :key="type"
              class="rounded-lg border p-3"
              style="border-color: var(--border)"
            >
              <p class="mb-2 text-xs font-semibold text-[var(--text)]">{{ type }}</p>
              <label
                v-for="action in actions"
                :key="action"
                class="mb-1 flex items-center gap-2 text-xs text-[var(--text-muted)]"
              >
                <input v-model="formData.permissions[type][action]" type="checkbox" />
                {{ action }}
              </label>
            </div>
          </div>
          <div class="flex flex-col-reverse justify-end gap-2 sm:flex-row">
            <button type="button" class="ui-btn-secondary" @click="closeForm">Cancelar</button>
            <button type="submit" class="ui-btn-primary">
              {{ editingRole ? 'Actualizar' : 'Crear' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { useRoles } from '../composables/useRoles';
import UiCard from '../components/ui/UiCard.vue';
import PaginationBar from '../components/ui/PaginationBar.vue';
import CardSkeleton from '../components/ui/CardSkeleton.vue';

const {
  roles,
  loading,
  usersLoading,
  showCreateForm,
  showUsers,
  roleUsers,
  selectedRole,
  creatingStore,
  editingRole,
  formData,
  permissionMap,
  hasStoreRole,
  isProtectedRole,
  page,
  pageSize,
  total,
  totalPages,
  rangeLabel,
  searchQuery,
  nextPage,
  prevPage,
  setPageSize,
  loadRoles,
  openRoleUsers,
  closeRoleUsers,
  openCreateForm,
  createStoreRole,
  editRole,
  saveRole,
  closeForm,
  removeRole,
} = useRoles();

onMounted(() => {
  loadRoles();
});
</script>
