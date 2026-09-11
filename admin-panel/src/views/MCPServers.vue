<template>
  <div class="space-y-4 tracking-tight">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="text-xs uppercase tracking-wider text-[var(--text-muted)]">Catálogo</p>
        <h2 class="text-xl font-semibold text-[var(--text)]">MCP Servers</h2>
        <p class="text-sm text-[var(--text-muted)]">
          Servidores Model Context Protocol · paginación en API
        </p>
      </div>
      <button type="button" class="ui-btn-primary w-full sm:w-auto" @click="openCreateForm">
        Nuevo MCP
      </button>
    </div>

    <UiCard>
      <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          v-model="searchQuery"
          class="ui-input sm:max-w-sm"
          type="search"
          placeholder="Buscar MCP por nombre…"
        />
        <p class="text-xs text-[var(--text-muted)]">{{ total }} servidor(es)</p>
      </div>

      <div v-if="loading" class="py-2">
        <CardSkeleton :count="pageSize > 4 ? 4 : pageSize" :cols="2" :lines="4" padding="sm" />
      </div>
      <div v-else-if="!servers.length" class="py-16 text-center text-sm text-[var(--text-muted)]">
        No hay MCP Servers
      </div>

      <template v-else>
        <div class="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <UiCard v-for="server in servers" :key="server._id" padding="sm">
            <div class="mb-2 flex items-start justify-between gap-2">
              <div class="min-w-0">
                <h3 class="truncate text-sm font-semibold text-[var(--text)]">
                  {{ server.serverName }}
                </h3>
                <p class="truncate text-xs text-[var(--text-muted)]">
                  {{ server.config?.type || 'unknown' }} ·
                  {{ server.config?.tools || '0 tools' }}
                </p>
              </div>
              <div class="flex shrink-0 gap-1">
                <button
                  type="button"
                  class="ui-btn-ghost px-2 py-1 text-xs"
                  @click="openDetail(server)"
                >
                  Agentes
                </button>
                <button
                  type="button"
                  class="ui-btn-ghost px-2 py-1 text-xs"
                  @click="editServer(server)"
                >
                  Editar
                </button>
                <button
                  type="button"
                  class="ui-btn-ghost px-2 py-1 text-xs text-red-300"
                  @click="removeServer(server._id)"
                >
                  Eliminar
                </button>
              </div>
            </div>
            <p
              v-if="server.config?.description"
              class="mb-2 line-clamp-2 text-xs text-[var(--text-muted)]"
            >
              {{ server.config.description }}
            </p>
            <p class="truncate font-mono text-[11px] text-[var(--text-muted)]">
              {{ server.config?.url || '—' }}
            </p>
            <p class="mt-2 text-[10px] text-[var(--text-muted)]">
              Agentes: {{ server.agentCount || 0 }} · Creado: {{ formatDate(server.createdAt) }}
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
      <div class="ui-modal max-w-2xl" @click.stop>
        <div class="mb-4 flex items-start justify-between gap-2">
          <div>
            <h3 class="text-lg font-semibold text-[var(--text)]">
              {{ selectedServer?.serverName }}
            </h3>
            <p class="text-xs text-[var(--text-muted)]">
              Agentes que referencian este MCP
            </p>
          </div>
          <button type="button" class="ui-btn-secondary" @click="closeDetail">Cerrar</button>
        </div>
        <div v-if="detailLoading" class="py-8 text-center text-sm text-[var(--text-muted)]">
          Cargando…
        </div>
        <div
          v-else-if="!(selectedServer?.agents || []).length"
          class="py-8 text-center text-sm text-[var(--text-muted)]"
        >
          Ningún agente usa este MCP
        </div>
        <div v-else class="max-h-[50vh] space-y-2 overflow-y-auto">
          <div
            v-for="agent in selectedServer.agents"
            :key="agent._id || agent.id"
            class="rounded-lg border px-3 py-2 text-sm"
            style="border-color: var(--border)"
          >
            <p class="text-[var(--text)]">{{ agent.name || agent.id }}</p>
            <p class="text-xs text-[var(--text-muted)]">
              {{ agent.provider }} · {{ agent.model }} · {{ agent.authorName || agent.author || '—' }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showCreateForm" class="ui-modal-overlay" @click="closeForm">
      <div class="ui-modal max-w-3xl" @click.stop>
        <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 class="text-lg font-semibold text-[var(--text)]">
            {{ editingServer ? 'Editar MCP Server' : 'Nuevo MCP Server' }}
          </h3>
          <div class="inline-flex rounded-lg border p-1" style="border-color: var(--border)">
            <button
              type="button"
              class="rounded-md px-3 py-1 text-xs"
              :class="
                mode === 'form'
                  ? 'bg-[var(--surface-hover)] text-[var(--text)]'
                  : 'text-[var(--text-muted)]'
              "
              @click="setMode('form')"
            >
              Formulario
            </button>
            <button
              type="button"
              class="rounded-md px-3 py-1 text-xs"
              :class="
                mode === 'yaml'
                  ? 'bg-[var(--surface-hover)] text-[var(--text)]'
                  : 'text-[var(--text-muted)]'
              "
              @click="setMode('yaml')"
            >
              YAML
            </button>
          </div>
        </div>

        <form class="space-y-3" @submit.prevent="saveServer">
          <template v-if="mode === 'form'">
            <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div class="md:col-span-2">
                <label class="ui-label">Nombre</label>
                <input v-model="formData.serverName" class="ui-input" required />
              </div>
              <div>
                <label class="ui-label">Tipo</label>
                <select v-model="formData.type" class="ui-input">
                  <option value="streamable-http">Streamable HTTP</option>
                  <option value="websocket">WebSocket</option>
                  <option value="sse">SSE</option>
                </select>
              </div>
            </div>
            <div>
              <label class="ui-label">Descripción</label>
              <textarea v-model="formData.description" class="ui-input" rows="2" />
            </div>
            <div>
              <label class="ui-label">URL</label>
              <input v-model="formData.url" class="ui-input" type="url" required />
            </div>
            <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label class="ui-label">Headers (JSON)</label>
                <textarea v-model="formData.headersJSON" class="ui-input font-mono text-xs" rows="4" />
              </div>
              <div>
                <label class="ui-label">User Vars (JSON)</label>
                <textarea
                  v-model="formData.customUserVarsJSON"
                  class="ui-input font-mono text-xs"
                  rows="4"
                />
              </div>
            </div>
            <div>
              <label class="ui-label">Capabilities (JSON)</label>
              <textarea
                v-model="formData.capabilitiesJSON"
                class="ui-input font-mono text-xs"
                rows="3"
              />
            </div>
          </template>
          <template v-else>
            <div>
              <label class="ui-label">Configuración YAML</label>
              <textarea
                v-model="formData.yamlContent"
                class="ui-input min-h-[240px] font-mono text-xs"
              />
            </div>
          </template>

          <div class="flex flex-col-reverse justify-end gap-2 pt-2 sm:flex-row">
            <button type="button" class="ui-btn-secondary" @click="closeForm">Cancelar</button>
            <button type="submit" class="ui-btn-primary">
              {{ editingServer ? 'Actualizar' : 'Crear' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { useMcpServers } from '../composables/useMcpServers';
import { formatDate } from '../utils/password';
import UiCard from '../components/ui/UiCard.vue';
import PaginationBar from '../components/ui/PaginationBar.vue';
import CardSkeleton from '../components/ui/CardSkeleton.vue';

const {
  servers,
  searchQuery,
  loading,
  detailLoading,
  showCreateForm,
  showDetail,
  selectedServer,
  editingServer,
  mode,
  formData,
  page,
  pageSize,
  total,
  totalPages,
  rangeLabel,
  nextPage,
  prevPage,
  setPageSize,
  loadServers,
  openDetail,
  closeDetail,
  setMode,
  editServer,
  saveServer,
  closeForm,
  openCreateForm,
  removeServer,
} = useMcpServers();

onMounted(() => {
  loadServers();
});
</script>
