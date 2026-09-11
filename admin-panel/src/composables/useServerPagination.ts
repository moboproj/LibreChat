import { computed, ref, watch } from 'vue';

export const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

export function useServerPagination(options?: {
  defaultPageSize?: number;
  searchDebounceMs?: number;
  onChange?: () => void | Promise<void>;
}) {
  const page = ref(1);
  const pageSize = ref(options?.defaultPageSize ?? 10);
  const total = ref(0);
  const searchQuery = ref('');
  const searchDebounced = ref('');
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value) || 1));

  const rangeLabel = computed(() => {
    if (total.value === 0) return '0–0 de 0';
    const start = (page.value - 1) * pageSize.value + 1;
    const end = Math.min(page.value * pageSize.value, total.value);
    return `${start}–${end} de ${total.value}`;
  });

  function applyMeta(meta: {
    total?: number;
    page?: number;
    pageSize?: number;
    totalPages?: number;
  }) {
    if (typeof meta.total === 'number') total.value = meta.total;
    if (typeof meta.page === 'number') page.value = meta.page;
    if (typeof meta.pageSize === 'number') pageSize.value = meta.pageSize;
  }

  async function notify() {
    if (options?.onChange) await options.onChange();
  }

  function nextPage() {
    if (page.value >= totalPages.value) return;
    page.value += 1;
    void notify();
  }

  function prevPage() {
    if (page.value <= 1) return;
    page.value -= 1;
    void notify();
  }

  function setPageSize(size: number) {
    pageSize.value = size;
    page.value = 1;
    void notify();
  }

  function resetPage() {
    page.value = 1;
  }

  watch(searchQuery, (value) => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      searchDebounced.value = value.trim();
      page.value = 1;
      void notify();
    }, options?.searchDebounceMs ?? 300);
  });

  return {
    page,
    pageSize,
    total,
    totalPages,
    rangeLabel,
    searchQuery,
    searchDebounced,
    applyMeta,
    nextPage,
    prevPage,
    setPageSize,
    resetPage,
  };
}
