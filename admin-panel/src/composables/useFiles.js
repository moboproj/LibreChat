import { ref } from 'vue';
import { listFiles, getFile } from '../api/files';
import { getErrorMessage, getErrorTitle } from '../utils/errors';
import { useFeedback } from './useFeedback';
import { useServerPagination } from './useServerPagination';

export function useFiles() {
  const { showError } = useFeedback();
  const files = ref([]);
  const loading = ref(false);
  const detailLoading = ref(false);
  const selectedFile = ref(null);
  const showDetail = ref(false);
  const userFilter = ref('');

  const pagination = useServerPagination({
    defaultPageSize: 10,
    onChange: () => loadFiles(),
  });

  async function loadFiles() {
    loading.value = true;
    try {
      const response = await listFiles({
        page: pagination.page.value,
        limit: pagination.pageSize.value,
        search: pagination.searchDebounced.value,
        user: userFilter.value.trim(),
      });
      files.value = response.data.documents || [];
      pagination.applyMeta(response.data);
    } catch (error) {
      showError(getErrorTitle(error, 'Error al cargar archivos'), getErrorMessage(error));
    } finally {
      loading.value = false;
    }
  }

  function applyUserFilter() {
    pagination.page.value = 1;
    loadFiles();
  }

  async function openDetail(file) {
    showDetail.value = true;
    selectedFile.value = file;
    detailLoading.value = true;
    try {
      const response = await getFile(file._id);
      selectedFile.value = response.data.document || file;
    } catch (error) {
      showError(getErrorTitle(error, 'Error al cargar archivo'), getErrorMessage(error));
    } finally {
      detailLoading.value = false;
    }
  }

  function closeDetail() {
    showDetail.value = false;
    selectedFile.value = null;
  }

  function formatBytes(bytes) {
    const n = Number(bytes) || 0;
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  }

  function formatDate(value) {
    if (!value) return '—';
    try {
      return new Date(value).toLocaleString();
    } catch {
      return String(value);
    }
  }

  return {
    files,
    loading,
    detailLoading,
    selectedFile,
    showDetail,
    userFilter,
    page: pagination.page,
    pageSize: pagination.pageSize,
    total: pagination.total,
    totalPages: pagination.totalPages,
    rangeLabel: pagination.rangeLabel,
    searchQuery: pagination.searchQuery,
    nextPage: pagination.nextPage,
    prevPage: pagination.prevPage,
    setPageSize: pagination.setPageSize,
    loadFiles,
    applyUserFilter,
    openDetail,
    closeDetail,
    formatBytes,
    formatDate,
  };
}
