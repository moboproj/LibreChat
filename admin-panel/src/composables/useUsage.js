import { ref } from 'vue';
import { listTransactions, getTransactionsSummary } from '../api/transactions';
import { getErrorMessage, getErrorTitle } from '../utils/errors';
import { useFeedback } from './useFeedback';
import { useServerPagination } from './useServerPagination';

export function useUsage() {
  const { showError } = useFeedback();
  const transactions = ref([]);
  const summary = ref({
    totals: { totalTokens: 0, count: 0 },
    byType: [],
    byModel: [],
    byUser: [],
  });
  const loading = ref(false);
  const summaryLoading = ref(false);
  const range = ref('30d');
  const userFilter = ref('');

  const pagination = useServerPagination({
    defaultPageSize: 20,
    onChange: () => loadTransactions(),
  });

  async function loadSummary() {
    summaryLoading.value = true;
    try {
      const response = await getTransactionsSummary({
        range: range.value,
        user: userFilter.value.trim(),
      });
      summary.value = {
        totals: response.data.totals || { totalTokens: 0, count: 0 },
        byType: response.data.byType || [],
        byModel: response.data.byModel || [],
        byUser: response.data.byUser || [],
      };
    } catch (error) {
      showError(getErrorTitle(error, 'Error al cargar resumen'), getErrorMessage(error));
    } finally {
      summaryLoading.value = false;
    }
  }

  async function loadTransactions() {
    loading.value = true;
    try {
      const response = await listTransactions({
        page: pagination.page.value,
        limit: pagination.pageSize.value,
        search: pagination.searchDebounced.value,
        range: range.value,
        user: userFilter.value.trim(),
      });
      transactions.value = response.data.documents || [];
      pagination.applyMeta(response.data);
    } catch (error) {
      showError(getErrorTitle(error, 'Error al cargar transacciones'), getErrorMessage(error));
    } finally {
      loading.value = false;
    }
  }

  async function reloadAll() {
    pagination.page.value = 1;
    await Promise.all([loadSummary(), loadTransactions()]);
  }

  function setRange(next) {
    range.value = next;
    reloadAll();
  }

  function applyUserFilter() {
    reloadAll();
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
    transactions,
    summary,
    loading,
    summaryLoading,
    range,
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
    loadSummary,
    loadTransactions,
    reloadAll,
    setRange,
    applyUserFilter,
    formatDate,
  };
}
