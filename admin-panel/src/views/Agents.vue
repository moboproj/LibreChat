<template>
  <div class="space-y-4 tracking-tight">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="text-xs uppercase tracking-wider text-[var(--text-muted)]">Catálogo</p>
        <h2 class="text-xl font-semibold text-[var(--text)]">Agentes</h2>
        <p class="text-sm text-[var(--text-muted)]">
          CRUD · provider/model/tools/MCP desde catálogo (como LibreChat)
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

    <!-- Detail -->
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
              <p class="ui-label">Provider</p>
              <p>{{ selectedAgent.provider || '—' }}</p>
            </div>
            <div>
              <p class="ui-label">Model</p>
              <p>{{ selectedAgent.model || '—' }}</p>
            </div>
            <div>
              <p class="ui-label">MCP (derivado de tools)</p>
              <p>{{ (selectedAgent.mcpServerNames || []).join(', ') || '—' }}</p>
            </div>
            <div>
              <p class="ui-label">Categoría</p>
              <p>{{ selectedAgent.category || '—' }}</p>
            </div>
          </div>
          <div>
            <p class="ui-label">Instructions</p>
            <pre
              class="max-h-48 overflow-auto rounded-lg border p-3 text-xs text-[var(--text-muted)]"
              style="border-color: var(--border); background: rgba(0, 0, 0, 0.25)"
            >{{ selectedAgent.instructions || '—' }}</pre>
          </div>
          <div>
            <p class="ui-label">Tools ({{ (selectedAgent.tools || []).length }})</p>
            <div class="flex max-h-40 flex-wrap gap-1 overflow-auto">
              <span
                v-for="tool in selectedAgent.tools || []"
                :key="tool"
                class="rounded px-1.5 py-0.5 font-mono text-[10px] text-[var(--text-muted)]"
                style="background: rgba(255, 255, 255, 0.06)"
              >
                {{ tool }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create / Edit -->
    <div v-if="showForm" class="ui-modal-overlay" @click="closeForm">
      <div class="ui-modal max-w-3xl" @click.stop>
        <h3 class="mb-4 text-lg font-semibold text-[var(--text)]">
          {{ editingAgent ? 'Editar agente' : 'Nuevo agente' }}
        </h3>

        <div v-if="catalogLoading || detailLoading" class="py-8 text-center text-sm text-[var(--text-muted)]">
          Cargando catálogo…
        </div>

        <form v-else class="space-y-4" @submit.prevent="saveAgent">
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
              <select v-model="formData.model" class="ui-input" required :disabled="!modelsForProvider.length">
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
                <span class="font-mono text-[10px] text-[var(--text-muted)]">{{ tool.id }}</span>
              </label>
            </div>
          </div>

          <div>
            <p class="ui-label">MCP Servers (tools embebidos en tools[])</p>
            <div v-if="!catalog.mcpServers?.length" class="text-sm text-[var(--text-muted)]">
              No hay MCP en catálogo (`mcpservers`).
            </div>
            <div v-else class="max-h-[40vh] space-y-3 overflow-y-auto pr-1">
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
          </div>

          <p class="text-xs text-[var(--text-muted)]">
            Seleccionados: {{ formData.selectedTools.length }} tool(s)
          </p>

          <div class="flex flex-col-reverse justify-end gap-2 pt-2 sm:flex-row">
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
  toggleTool,
  isToolSelected,
  toggleMcpServer,
  mcpServerSelectedCount,
  saveAgent,
  removeAgent,
} = useAgents();

onMounted(() => {
  loadAgents();
});
</script>
