<template>
  <div class="space-y-4 tracking-tight">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="text-xs uppercase tracking-wider text-[var(--text-muted)]">Catálogo</p>
        <h2 class="text-xl font-semibold text-[var(--text)]">Agentes</h2>
        <p class="text-sm text-[var(--text-muted)]">
          CRUD · permisos · MCP · parámetros (como Omnichat)
        </p>
      </div>
      <button type="button" class="ui-btn-primary w-full sm:w-auto" @click="openCreateForm">
        Nuevo agente
      </button>
    </div>

    <UiCard>
      <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          v-model="searchQuery"
          class="ui-input sm:max-w-sm"
          type="search"
          placeholder="Buscar por nombre, id, provider o model…"
        />
        <p class="text-xs text-[var(--text-muted)]">{{ total }} agente(s)</p>
      </div>

      <div v-if="loading" class="py-2">
        <CardSkeleton :count="4" :cols="2" :lines="4" padding="sm" />
      </div>
      <div v-else-if="!agents.length" class="py-16 text-center text-sm text-[var(--text-muted)]">
        No hay agentes
      </div>

      <template v-else>
        <div class="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <UiCard v-for="agent in agents" :key="agent._id || agent.id" padding="sm">
            <div class="mb-2 flex items-start justify-between gap-2">
              <div class="min-w-0">
                <h3 class="truncate text-sm font-semibold text-[var(--text)]">
                  {{ agent.name || agent.id || 'Sin nombre' }}
                </h3>
                <p class="truncate text-xs text-[var(--text-muted)]">
                  {{ agent.provider || '—' }} · {{ agent.model || '—' }}
                </p>
                <p class="mt-1 truncate text-[10px] text-[var(--text-muted)]">
                  Dueño:
                  {{ agent.authorName || agent.authorEmail || agent.author || '—' }}
                </p>
              </div>
              <div class="flex shrink-0 gap-1">
                <button type="button" class="ui-btn-ghost px-2 py-1 text-xs" @click="openDetail(agent)">
                  Ver
                </button>
                <button
                  type="button"
                  class="ui-btn-ghost px-2 py-1 text-xs"
                  @click="openEditForm(agent)"
                >
                  Editar
                </button>
                <button
                  type="button"
                  class="ui-btn-ghost px-2 py-1 text-xs text-red-300"
                  @click="removeAgent(agent)"
                >
                  Eliminar
                </button>
              </div>
            </div>
            <p
              v-if="agent.description"
              class="mb-2 line-clamp-2 text-xs text-[var(--text-muted)]"
            >
              {{ agent.description }}
            </p>
            <p class="mt-2 text-[10px] text-[var(--text-muted)]">
              Tools: {{ (agent.tools || []).length }} · MCP:
              {{ (agent.mcpServerNames || []).join(', ') || '—' }}
            </p>
          </UiCard>
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

    <div v-if="showDetail" class="ui-modal-overlay" @click="closeDetail">
      <div class="ui-modal max-w-3xl" @click.stop>
        <div class="mb-4 flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 class="text-lg font-semibold text-[var(--text)]">
              {{ selectedAgent?.name || 'Detalle de agente' }}
            </h3>
            <p class="text-xs text-[var(--text-muted)]">{{ selectedAgent?.id }}</p>
          </div>
          <div class="flex gap-2">
            <button type="button" class="ui-btn-secondary" @click="openEditForm(selectedAgent)">
              Editar
            </button>
            <button type="button" class="ui-btn-secondary" @click="closeDetail">Cerrar</button>
          </div>
        </div>

        <div v-if="detailLoading" class="py-8 text-center text-sm text-[var(--text-muted)]">
          Cargando detalle…
        </div>
        <div v-else-if="selectedAgent" class="space-y-4 text-sm">
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <p class="ui-label">Dueño</p>
              <p>{{ selectedAgent.authorName || '—' }}</p>
              <p class="text-xs text-[var(--text-muted)]">
                {{ selectedAgent.authorEmail || selectedAgent.author || '—' }}
              </p>
            </div>
            <div>
              <p class="ui-label">Provider / Model</p>
              <p>{{ selectedAgent.provider || '—' }} / {{ selectedAgent.model || '—' }}</p>
            </div>
            <div>
              <p class="ui-label">Categoría</p>
              <p>{{ selectedAgent.category || '—' }}</p>
            </div>
            <div>
              <p class="ui-label">MCP</p>
              <p>{{ (selectedAgent.mcpServerNames || []).join(', ') || '—' }}</p>
            </div>
          </div>
          <div>
            <p class="ui-label">Instructions</p>
            <pre
              class="max-h-48 overflow-auto rounded-lg border p-3 text-xs text-[var(--text-muted)]"
              style="border-color: var(--border); background: rgba(0, 0, 0, 0.25)"
            >{{ selectedAgent.instructions || '—' }}</pre>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showForm" class="ui-modal-overlay" @click="closeForm">
      <div class="ui-modal max-h-[90vh] max-w-4xl overflow-hidden" @click.stop>
        <div class="mb-3 flex items-start justify-between gap-2">
          <h3 class="text-lg font-semibold text-[var(--text)]">
            {{ editingAgent ? 'Editar agente' : 'Nuevo agente' }}
          </h3>
          <button type="button" class="ui-btn-ghost px-2 py-1" @click="closeForm">✕</button>
        </div>

        <div class="mb-4 flex flex-wrap gap-1 border-b pb-2" style="border-color: var(--border)">
          <button
            v-for="tab in FORM_TABS"
            :key="tab.id"
            type="button"
            class="rounded-md px-3 py-1.5 text-xs"
            :class="
              formTab === tab.id
                ? 'text-[var(--accent)]'
                : 'text-[var(--text-muted)]'
            "
            :style="
              formTab === tab.id
                ? 'background: rgba(16,163,127,0.18)'
                : ''
            "
            :disabled="tab.id === 'share' && !canUseShareTab"
            @click="setFormTab(tab.id)"
          >
            {{ tab.label }}
          </button>
        </div>

        <div v-if="catalogLoading || detailLoading" class="py-8 text-center text-sm text-[var(--text-muted)]">
          Cargando…
        </div>

        <form v-else class="flex max-h-[70vh] flex-col" @submit.prevent="saveAgent">
          <div class="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
            <template v-if="formTab === 'general'">
              <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div class="md:col-span-2">
                  <label class="ui-label">Nombre</label>
                  <input v-model="formData.name" class="ui-input" required />
                </div>
                <div>
                  <label class="ui-label">Provider</label>
                  <select v-model="formData.provider" class="ui-input" required>
                    <option disabled value="">Selecciona provider…</option>
                    <option v-for="provider in catalog.providers" :key="provider" :value="provider">
                      {{ provider }}
                    </option>
                  </select>
                </div>
                <div>
                  <label class="ui-label">Model</label>
                  <select
                    v-model="formData.model"
                    class="ui-input"
                    required
                    :disabled="!modelsForProvider.length"
                  >
                    <option disabled value="">Selecciona model…</option>
                    <option v-for="model in modelsForProvider" :key="model" :value="model">
                      {{ model }}
                    </option>
                  </select>
                </div>
                <div>
                  <label class="ui-label">Categoría</label>
                  <input v-model="formData.category" class="ui-input" placeholder="general" />
                </div>
                <div class="flex items-end pb-2">
                  <label class="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                    <input v-model="formData.is_promoted" type="checkbox" />
                    Promovido
                  </label>
                </div>
              </div>

              <div>
                <label class="ui-label">Dueño (opcional)</label>
                <p class="mb-2 text-[11px] text-[var(--text-muted)]">
                  Por defecto: admin logueado. Puedes elegir otro usuario Omnichat.
                </p>
                <div class="flex flex-col gap-2 sm:flex-row">
                  <input
                    v-model="ownerSearch"
                    class="ui-input sm:max-w-sm"
                    type="search"
                    placeholder="Buscar usuario por nombre, username o correo…"
                    @keyup.enter="searchOwners(ownerSearch)"
                  />
                  <button
                    type="button"
                    class="ui-btn-secondary"
                    :disabled="ownerLoading"
                    @click="searchOwners(ownerSearch)"
                  >
                    Buscar
                  </button>
                  <button type="button" class="ui-btn-ghost" @click="clearOwner">
                    Usar admin
                  </button>
                </div>
                <p v-if="formData.ownerLabel" class="mt-2 text-xs text-[var(--accent)]">
                  Seleccionado: {{ formData.ownerLabel }}
                </p>
                <div
                  v-if="ownerOptions.length"
                  class="mt-2 max-h-36 overflow-y-auto rounded-lg border"
                  style="border-color: var(--border)"
                >
                  <button
                    v-for="user in ownerOptions"
                    :key="user._id"
                    type="button"
                    class="flex w-full flex-col items-start border-b px-3 py-2 text-left text-xs hover:bg-white/5"
                    style="border-color: var(--border)"
                    @click="selectOwner(user)"
                  >
                    <span class="text-[var(--text)]">{{ user.name || '—' }}</span>
                    <span class="text-[var(--text-muted)]">
                      {{ user.username || '—' }} · {{ user.email || '—' }}
                    </span>
                  </button>
                </div>
              </div>

              <div>
                <label class="ui-label">Descripción</label>
                <textarea v-model="formData.description" class="ui-input" rows="2" />
              </div>

              <div>
                <label class="ui-label">Instructions</label>
                <textarea
                  v-model="formData.instructions"
                  class="ui-input min-h-[120px] font-mono text-xs"
                  rows="5"
                />
              </div>

              <div>
                <p class="ui-label">Tools built-in</p>
                <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <label
                    v-for="tool in catalog.builtinTools"
                    :key="tool.id"
                    class="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
                    style="border-color: var(--border)"
                  >
                    <input
                      type="checkbox"
                      :checked="isToolSelected(tool.id)"
                      @change="toggleTool(tool.id)"
                    />
                    <span>{{ tool.label }}</span>
                  </label>
                </div>
              </div>
            </template>

            <template v-else-if="formTab === 'mcp'">
              <div v-if="!catalog.mcpServers?.length" class="text-sm text-[var(--text-muted)]">
                No hay MCP en catálogo (`mcpservers`).
              </div>
              <div v-else class="space-y-3">
                <div
                  v-for="server in catalog.mcpServers"
                  :key="server.serverName"
                  class="rounded-lg border p-3"
                  style="border-color: var(--border)"
                >
                  <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p class="text-sm font-medium text-[var(--text)]">
                        {{ server.title || server.serverName }}
                      </p>
                      <p class="text-[10px] text-[var(--text-muted)]">
                        {{ mcpServerSelectedCount(server) }}/{{ server.tools.length }} tools
                      </p>
                    </div>
                    <button
                      type="button"
                      class="ui-btn-ghost px-2 py-1 text-xs"
                      @click="toggleMcpServer(server)"
                    >
                      Toggle all
                    </button>
                  </div>
                  <div class="grid grid-cols-1 gap-1 sm:grid-cols-2">
                    <label
                      v-for="tool in server.tools"
                      :key="tool.id"
                      class="flex items-start gap-2 text-xs text-[var(--text-muted)]"
                    >
                      <input
                        class="mt-0.5"
                        type="checkbox"
                        :checked="isToolSelected(tool.id)"
                        @change="toggleTool(tool.id)"
                      />
                      <span class="min-w-0 break-all font-mono">{{ tool.label }}</span>
                    </label>
                  </div>
                </div>
              </div>
              <p class="text-xs text-[var(--text-muted)]">
                Seleccionados: {{ formData.selectedTools.length }} tool(s)
              </p>
            </template>

            <template v-else-if="formTab === 'share'">
              <div v-if="!canUseShareTab" class="py-8 text-center text-sm text-[var(--text-muted)]">
                Guarda el agente primero para asignar permisos.
              </div>
              <template v-else>
                <div class="mb-3 flex gap-2">
                  <button
                    type="button"
                    class="rounded-md px-3 py-1 text-xs"
                    :style="
                      sharePrincipalTab === 'users'
                        ? 'background: rgba(16,163,127,0.18); color: var(--accent)'
                        : 'color: var(--text-muted)'
                    "
                    @click="setSharePrincipalTab('users')"
                  >
                    Usuarios
                  </button>
                  <button
                    type="button"
                    class="rounded-md px-3 py-1 text-xs"
                    :style="
                      sharePrincipalTab === 'groups'
                        ? 'background: rgba(16,163,127,0.18); color: var(--accent)'
                        : 'color: var(--text-muted)'
                    "
                    @click="setSharePrincipalTab('groups')"
                  >
                    Grupos
                  </button>
                </div>

                <div v-if="sharePrincipalTab === 'users'" class="space-y-3">
                  <div class="flex flex-col gap-2 sm:flex-row">
                    <input
                      v-model="shareUserSearch"
                      class="ui-input sm:max-w-sm"
                      type="search"
                      placeholder="Buscar usuarios…"
                      @keyup.enter="applyShareUserSearch"
                    />
                    <button type="button" class="ui-btn-secondary" @click="applyShareUserSearch">
                      Buscar
                    </button>
                  </div>
                  <div v-if="shareLoading" class="py-6 text-center text-sm text-[var(--text-muted)]">
                    Cargando…
                  </div>
                  <div v-else class="overflow-x-auto">
                    <table class="w-full min-w-[640px] border-collapse text-left text-sm">
                      <thead>
                        <tr
                          class="border-b text-xs uppercase tracking-wide text-[var(--text-muted)]"
                          style="border-color: var(--border)"
                        >
                          <th class="px-2 py-2 font-medium">Usuario</th>
                          <th class="px-2 py-2 font-medium">Nombre</th>
                          <th class="px-2 py-2 font-medium">Correo</th>
                          <th class="px-2 py-2 font-medium">Permiso</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr
                          v-for="user in shareUsers"
                          :key="user._id"
                          class="border-b"
                          style="border-color: var(--border)"
                        >
                          <td class="px-2 py-2 font-mono text-xs">{{ user.username || '—' }}</td>
                          <td class="px-2 py-2">{{ user.name || '—' }}</td>
                          <td class="px-2 py-2 text-[var(--text-muted)]">{{ user.email || '—' }}</td>
                          <td class="px-2 py-2">
                            <select
                              class="ui-input"
                              :value="user.accessRoleId || ''"
                              :disabled="shareSavingId === `user:${user._id}`"
                              @change="
                                changeShareRole('user', user, $event.target.value || null)
                              "
                            >
                              <option value="">Sin acceso</option>
                              <option
                                v-for="role in shareRoles"
                                :key="role.id"
                                :value="role.id"
                              >
                                {{ role.label }}
                              </option>
                            </select>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div class="flex items-center justify-between text-xs text-[var(--text-muted)]">
                    <button
                      type="button"
                      class="ui-btn-ghost px-2 py-1"
                      :disabled="shareUserPage <= 1"
                      @click="prevShareUserPage"
                    >
                      Anterior
                    </button>
                    <span>{{ shareUserPage }} / {{ shareUserTotalPages }}</span>
                    <button
                      type="button"
                      class="ui-btn-ghost px-2 py-1"
                      :disabled="shareUserPage >= shareUserTotalPages"
                      @click="nextShareUserPage"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>

                <div v-else class="space-y-3">
                  <div class="flex flex-col gap-2 sm:flex-row">
                    <input
                      v-model="shareGroupSearch"
                      class="ui-input sm:max-w-sm"
                      type="search"
                      placeholder="Buscar grupos…"
                      @keyup.enter="applyShareGroupSearch"
                    />
                    <button type="button" class="ui-btn-secondary" @click="applyShareGroupSearch">
                      Buscar
                    </button>
                  </div>
                  <div v-if="shareLoading" class="py-6 text-center text-sm text-[var(--text-muted)]">
                    Cargando…
                  </div>
                  <div v-else-if="!shareGroups.length" class="py-6 text-center text-sm text-[var(--text-muted)]">
                    No hay grupos en la base de datos
                  </div>
                  <div v-else class="overflow-x-auto">
                    <table class="w-full min-w-[560px] border-collapse text-left text-sm">
                      <thead>
                        <tr
                          class="border-b text-xs uppercase tracking-wide text-[var(--text-muted)]"
                          style="border-color: var(--border)"
                        >
                          <th class="px-2 py-2 font-medium">Grupo</th>
                          <th class="px-2 py-2 font-medium">Miembros</th>
                          <th class="px-2 py-2 font-medium">Permiso</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr
                          v-for="group in shareGroups"
                          :key="group._id"
                          class="border-b"
                          style="border-color: var(--border)"
                        >
                          <td class="px-2 py-2">
                            <p>{{ group.name || '—' }}</p>
                            <p class="text-[10px] text-[var(--text-muted)]">
                              {{ group.description || group.email || '' }}
                            </p>
                          </td>
                          <td class="px-2 py-2 text-[var(--text-muted)]">
                            {{ group.memberCount || 0 }}
                          </td>
                          <td class="px-2 py-2">
                            <select
                              class="ui-input"
                              :value="group.accessRoleId || ''"
                              :disabled="shareSavingId === `group:${group._id}`"
                              @change="
                                changeShareRole('group', group, $event.target.value || null)
                              "
                            >
                              <option value="">Sin acceso</option>
                              <option
                                v-for="role in shareRoles"
                                :key="role.id"
                                :value="role.id"
                              >
                                {{ role.label }}
                              </option>
                            </select>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div class="flex items-center justify-between text-xs text-[var(--text-muted)]">
                    <button
                      type="button"
                      class="ui-btn-ghost px-2 py-1"
                      :disabled="shareGroupPage <= 1"
                      @click="prevShareGroupPage"
                    >
                      Anterior
                    </button>
                    <span>{{ shareGroupPage }} / {{ shareGroupTotalPages }}</span>
                    <button
                      type="button"
                      class="ui-btn-ghost px-2 py-1"
                      :disabled="shareGroupPage >= shareGroupTotalPages"
                      @click="nextShareGroupPage"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              </template>
            </template>

            <template v-else-if="formTab === 'advanced'">
              <div>
                <label class="ui-label">Avatar (URL)</label>
                <input
                  v-model="formData.avatarUrl"
                  class="ui-input"
                  type="url"
                  placeholder="https://…"
                />
              </div>
              <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div>
                  <label class="ui-label">Temperature</label>
                  <input
                    v-model="formData.temperature"
                    class="ui-input"
                    type="number"
                    step="0.01"
                    min="0"
                    max="2"
                  />
                </div>
                <div>
                  <label class="ui-label">Top P</label>
                  <input
                    v-model="formData.top_p"
                    class="ui-input"
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                  />
                </div>
                <div>
                  <label class="ui-label">Max output tokens</label>
                  <input
                    v-model="formData.max_output_tokens"
                    class="ui-input"
                    type="number"
                    min="1"
                  />
                </div>
              </div>
              <div>
                <label class="ui-label">Conversation starters (uno por línea)</label>
                <textarea
                  v-model="formData.conversation_starters_text"
                  class="ui-input min-h-[100px] font-mono text-xs"
                  rows="4"
                  placeholder="¿En qué te puedo ayudar?&#10;Resume este documento"
                />
              </div>
            </template>
          </div>

          <div
            class="mt-4 flex flex-col-reverse justify-end gap-2 border-t pt-3 sm:flex-row"
            style="border-color: var(--border)"
          >
            <button type="button" class="ui-btn-secondary" @click="closeForm">Cancelar</button>
            <button type="submit" class="ui-btn-primary" :disabled="saving">
              {{ saving ? 'Guardando…' : editingAgent ? 'Actualizar' : 'Crear' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { useAgents } from '../composables/useAgents';
import UiCard from '../components/ui/UiCard.vue';
import PaginationBar from '../components/ui/PaginationBar.vue';
import CardSkeleton from '../components/ui/CardSkeleton.vue';

const {
  agents,
  loading,
  detailLoading,
  saving,
  catalogLoading,
  catalog,
  modelsForProvider,
  selectedAgent,
  showDetail,
  showForm,
  editingAgent,
  formData,
  formTab,
  FORM_TABS,
  canUseShareTab,
  ownerOptions,
  ownerSearch,
  ownerLoading,
  shareRoles,
  sharePrincipalTab,
  shareUsers,
  shareGroups,
  shareLoading,
  shareSavingId,
  shareUserSearch,
  shareGroupSearch,
  shareUserPage,
  shareGroupPage,
  shareUserTotalPages,
  shareGroupTotalPages,
  page,
  pageSize,
  total,
  totalPages,
  rangeLabel,
  searchQuery,
  nextPage,
  prevPage,
  setPageSize,
  loadAgents,
  openDetail,
  closeDetail,
  openCreateForm,
  openEditForm,
  closeForm,
  setFormTab,
  searchOwners,
  selectOwner,
  clearOwner,
  toggleTool,
  isToolSelected,
  toggleMcpServer,
  mcpServerSelectedCount,
  saveAgent,
  removeAgent,
  applyShareUserSearch,
  applyShareGroupSearch,
  changeShareRole,
  loadShareUsers,
  loadShareGroups,
  nextShareUserPage,
  prevShareUserPage,
  nextShareGroupPage,
  prevShareGroupPage,
  setSharePrincipalTab,
} = useAgents();

onMounted(() => {
  loadAgents();
});
</script>
