<template>
  <div class="space-y-4 tracking-tight">
    <div>
      <p class="text-xs uppercase tracking-wider text-[var(--text-muted)]">Uso</p>
      <h2 class="text-xl font-semibold text-[var(--text)]">Conversaciones</h2>
      <p class="text-sm text-[var(--text-muted)]">
        Solo lectura · conversaciones y mensajes
      </p>
    </div>

    <UiCard>
      <div class="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <input
          v-model="searchQuery"
          class="ui-input sm:max-w-sm"
          type="search"
          placeholder="Buscar título, conversationId, user, model…"
        />
        <div class="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <input
            v-model="userFilter"
            class="ui-input sm:max-w-xs"
            type="text"
            placeholder="Filtrar por user id…"
            @keyup.enter="applyUserFilter"
          />
          <button type="button" class="ui-btn-secondary w-full sm:w-auto" @click="applyUserFilter">
            Filtrar user
          </button>
        </div>
        <p class="text-xs text-[var(--text-muted)]">{{ total }} conversación(es)</p>
      </div>

      <div v-if="loading" class="py-2">
        <TableSkeleton :rows="pageSize" :cols="5" />
      </div>
      <div
        v-else-if="!conversations.length"
        class="py-16 text-center text-sm text-[var(--text-muted)]"
      >
        No hay conversaciones
      </div>

      <template v-else>
        <div class="overflow-x-auto">
          <table class="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead>
              <tr
                class="border-b text-xs uppercase tracking-wide text-[var(--text-muted)]"
                style="border-color: var(--border)"
              >
                <th class="px-2 py-2 font-medium">Título</th>
                <th class="px-2 py-2 font-medium">Usuario</th>
                <th class="hidden px-2 py-2 font-medium md:table-cell">Endpoint / Model</th>
                <th class="hidden px-2 py-2 font-medium sm:table-cell">Actualizado</th>
                <th class="px-2 py-2 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="convo in conversations"
                :key="convo._id || convo.conversationId"
                class="border-b"
                style="border-color: var(--border)"
              >
                <td class="max-w-[220px] truncate px-2 py-3 text-[var(--text)]">
                  {{ convo.title || 'Sin título' }}
                </td>
                <td class="max-w-[140px] truncate px-2 py-3 font-mono text-xs text-[var(--text-muted)]">
                  {{ convo.user || '—' }}
                </td>
                <td class="hidden px-2 py-3 text-[var(--text-muted)] md:table-cell">
                  {{ convo.endpoint || '—' }} / {{ convo.model || '—' }}
                </td>
                <td class="hidden px-2 py-3 text-[var(--text-muted)] sm:table-cell">
                  {{ formatDate(convo.updatedAt || convo.createdAt) }}
                </td>
                <td class="px-2 py-3 text-right">
                  <button
                    type="button"
                    class="ui-btn-ghost px-2 py-1 text-xs"
                    @click="openDetail(convo)"
                  >
                    Ver
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

    <div v-if="showDetail" class="ui-modal-overlay" @click="closeDetail">
      <div class="ui-modal max-w-3xl" @click.stop>
        <div class="mb-4 flex items-start justify-between gap-2">
          <div class="min-w-0">
            <h3 class="truncate text-lg font-semibold text-[var(--text)]">
              {{ selectedConversation?.title || 'Conversación' }}
            </h3>
            <p class="truncate font-mono text-xs text-[var(--text-muted)]">
              {{ selectedConversation?.conversationId }}
            </p>
          </div>
          <button type="button" class="ui-btn-secondary shrink-0" @click="closeDetail">
            Cerrar
          </button>
        </div>

        <div v-if="detailLoading" class="py-8 text-center text-sm text-[var(--text-muted)]">
          Cargando mensajes…
        </div>
        <template v-else>
          <div class="mb-4 grid grid-cols-1 gap-2 text-xs text-[var(--text-muted)] sm:grid-cols-3">
            <p>User: {{ selectedConversation?.user || '—' }}</p>
            <p>Endpoint: {{ selectedConversation?.endpoint || '—' }}</p>
            <p>Model: {{ selectedConversation?.model || '—' }}</p>
          </div>
          <p class="mb-2 text-xs text-[var(--text-muted)]">
            Mensajes ({{ messagesTotal }})
          </p>
          <div
            v-if="!messages.length"
            class="py-8 text-center text-sm text-[var(--text-muted)]"
          >
            Sin mensajes
          </div>
          <div v-else class="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
            <div
              v-for="msg in messages"
              :key="msg._id || msg.messageId"
              class="rounded-lg border p-3"
              style="border-color: var(--border); background: rgba(0, 0, 0, 0.2)"
            >
              <div class="mb-1 flex flex-wrap items-center justify-between gap-2 text-[10px] text-[var(--text-muted)]">
                <span>
                  {{ msg.sender || (msg.isCreatedByUser ? 'User' : 'AI') }}
                  · {{ msg.model || '—' }}
                </span>
                <span>{{ formatDate(msg.createdAt) }}</span>
              </div>
              <p class="whitespace-pre-wrap text-sm text-[var(--text)]">
                {{ msg.text || '—' }}
              </p>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { useConversations } from '../composables/useConversations';
import { formatDate } from '../utils/password';
import UiCard from '../components/ui/UiCard.vue';
import PaginationBar from '../components/ui/PaginationBar.vue';
import TableSkeleton from '../components/ui/TableSkeleton.vue';

const {
  conversations,
  loading,
  detailLoading,
  selectedConversation,
  messages,
  messagesTotal,
  showDetail,
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
  loadConversations,
  openDetail,
  closeDetail,
  applyUserFilter,
} = useConversations();

onMounted(() => {
  loadConversations();
});
</script>
