<template>
  <div class="space-y-4 tracking-tight">
    <div>
      <p class="text-xs uppercase tracking-wider text-[var(--text-muted)]">Almacenamiento</p>
      <h2 class="text-xl font-semibold text-[var(--text)]">Archivos</h2>
      <p class="text-sm text-[var(--text-muted)]">Solo lectura · files de LibreChat</p>
    </div>

    <UiCard>
      <div class="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <input
          v-model="searchQuery"
          class="ui-input sm:max-w-sm"
          type="search"
          placeholder="Buscar filename, file_id, type…"
        />
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
        <p class="text-xs text-[var(--text-muted)]">{{ total }} archivo(s)</p>
      </div>

      <div v-if="loading" class="py-2">
        <TableSkeleton :rows="pageSize" :cols="5" />
      </div>
      <div v-else-if="!files.length" class="py-16 text-center text-sm text-[var(--text-muted)]">
        No hay archivos
      </div>

      <template v-else>
        <div class="overflow-x-auto">
          <table class="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead>
              <tr
                class="border-b text-xs uppercase tracking-wide text-[var(--text-muted)]"
                style="border-color: var(--border)"
              >
                <th class="px-2 py-2 font-medium">Archivo</th>
                <th class="px-2 py-2 font-medium">Usuario</th>
                <th class="hidden px-2 py-2 font-medium sm:table-cell">Tipo</th>
                <th class="hidden px-2 py-2 font-medium md:table-cell">Tamaño</th>
                <th class="px-2 py-2 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="file in files"
                :key="file._id"
                class="border-b"
                style="border-color: var(--border)"
              >
                <td class="max-w-[220px] truncate px-2 py-3 text-[var(--text)]">
                  {{ file.filename || file.file_id || 'Sin nombre' }}
                </td>
                <td class="max-w-[160px] truncate px-2 py-3 text-[var(--text-muted)]">
                  {{ file.userEmail || file.userName || file.user || '—' }}
                </td>
                <td class="hidden px-2 py-3 text-[var(--text-muted)] sm:table-cell">
                  {{ file.type || '—' }}
                </td>
                <td class="hidden px-2 py-3 text-[var(--text-muted)] md:table-cell">
                  {{ formatBytes(file.bytes) }}
                </td>
                <td class="px-2 py-3 text-right">
                  <button type="button" class="ui-btn-ghost px-2 py-1 text-xs" @click="openDetail(file)">
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
      <div class="ui-modal max-w-2xl" @click.stop>
        <div class="mb-4 flex items-start justify-between gap-2">
          <div>
            <h3 class="text-lg font-semibold text-[var(--text)]">
              {{ selectedFile?.filename || 'Detalle de archivo' }}
            </h3>
            <p class="text-xs text-[var(--text-muted)]">{{ selectedFile?.file_id || selectedFile?._id }}</p>
          </div>
          <button type="button" class="ui-btn-secondary" @click="closeDetail">Cerrar</button>
        </div>
        <div v-if="detailLoading" class="py-8 text-center text-sm text-[var(--text-muted)]">
          Cargando…
        </div>
        <div v-else-if="selectedFile" class="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <p class="ui-label">Usuario</p>
            <p>{{ selectedFile.userEmail || selectedFile.user || '—' }}</p>
          </div>
          <div>
            <p class="ui-label">Tipo</p>
            <p>{{ selectedFile.type || '—' }}</p>
          </div>
          <div>
            <p class="ui-label">Tamaño</p>
            <p>{{ formatBytes(selectedFile.bytes) }}</p>
          </div>
          <div>
            <p class="ui-label">Status</p>
            <p>{{ selectedFile.status || '—' }}</p>
          </div>
          <div>
            <p class="ui-label">Conversation</p>
            <p class="break-all font-mono text-xs">{{ selectedFile.conversationId || '—' }}</p>
          </div>
          <div>
            <p class="ui-label">Creado</p>
            <p>{{ formatDate(selectedFile.createdAt) }}</p>
          </div>
          <div class="sm:col-span-2">
            <p class="ui-label">Path</p>
            <p class="break-all font-mono text-xs text-[var(--text-muted)]">
              {{ selectedFile.filepath || '—' }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { useFiles } from '../composables/useFiles';
import UiCard from '../components/ui/UiCard.vue';
import PaginationBar from '../components/ui/PaginationBar.vue';
import TableSkeleton from '../components/ui/TableSkeleton.vue';

const {
  files,
  loading,
  detailLoading,
  selectedFile,
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
  loadFiles,
  applyUserFilter,
  openDetail,
  closeDetail,
  formatBytes,
  formatDate,
} = useFiles();

onMounted(() => {
  loadFiles();
});
</script>
