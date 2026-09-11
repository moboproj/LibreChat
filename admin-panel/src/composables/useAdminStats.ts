import { computed, onMounted, ref, watch } from 'vue';
import { fetchStats } from '@/api/stats';
import { createMockStats, type AdminStatsPayload, type TimeRange } from '@/types/stats';
import { getErrorMessage, getErrorTitle } from '@/utils/errors';
import { useFeedback } from './useFeedback';

/**
 * VITE_STATS_USE_MOCK=true → mock local.
 * Default / false → GET /api/stats (datos reales).
 */
const useMock = String(import.meta.env.VITE_STATS_USE_MOCK ?? 'false').toLowerCase() === 'true';

function emptyTotals(): AdminStatsPayload['totals'] {
  return {
    totalMessages: 0,
    totalUsers: 0,
    totalConversations: 0,
    totalAgents: 0,
    totalFiles: 0,
    totalMCPServers: 0,
    totalRoles: 0,
  };
}

/** Normaliza la respuesta de /api/stats para que charts/tablas no rompan con null/undefined. */
export function normalizeStatsPayload(
  raw: Partial<AdminStatsPayload> | null | undefined,
): AdminStatsPayload {
  return {
    totals: { ...emptyTotals(), ...(raw?.totals ?? {}) },
    messagesLast7Days: raw?.messagesLast7Days ?? 0,
    newUsersLast30Days: raw?.newUsersLast30Days ?? 0,
    messagesByDay: raw?.messagesByDay ?? [],
    activeUsersByDay: raw?.activeUsersByDay ?? [],
    messagesByModel: raw?.messagesByModel ?? [],
    messagesByEndpoint: raw?.messagesByEndpoint ?? [],
    tokensByType: raw?.tokensByType ?? [],
    topUsersByTokens: raw?.topUsersByTokens ?? [],
  };
}

export function useAdminStats() {
  const { showError } = useFeedback();
  const loading = ref(true);
  const error = ref<string | null>(null);
  const stats = ref<AdminStatsPayload>(createMockStats());
  const timeRange = ref<TimeRange>('30d');
  const usingMock = ref(useMock);

  async function loadStats() {
    loading.value = true;
    error.value = null;
    try {
      if (useMock) {
        stats.value = createMockStats();
        usingMock.value = true;
        return;
      }
      const res = await fetchStats(timeRange.value);
      stats.value = normalizeStatsPayload(res.data);
      usingMock.value = false;
    } catch (e) {
      const message = getErrorMessage(e);
      error.value = message;
      showError(getErrorTitle(e, 'Error al cargar estadísticas'), message);
      if (!stats.value) {
        stats.value = normalizeStatsPayload(null);
      }
    } finally {
      loading.value = false;
    }
  }

  const promptTokens = computed(
    () => stats.value.tokensByType.find((t) => t._id === 'prompt')?.total ?? 0,
  );
  const completionTokens = computed(
    () => stats.value.tokensByType.find((t) => t._id === 'completion')?.total ?? 0,
  );
  const totalTokens = computed(() => promptTokens.value + completionTokens.value);

  const avgMsgPerConv = computed(() => {
    const conv = stats.value.totals.totalConversations;
    if (!conv) return '0';
    return (stats.value.totals.totalMessages / conv).toFixed(1);
  });

  const maxUserTokens = computed(() =>
    Math.max(...stats.value.topUsersByTokens.map((u) => u.totalTokens), 1),
  );

  const slicedDays = computed(() => {
    const take = timeRange.value === '7d' ? 7 : 30;
    return {
      messages: stats.value.messagesByDay.slice(-take),
      active: stats.value.activeUsersByDay.slice(-take),
    };
  });

  function fmt(n: number): string {
    return (n ?? 0).toLocaleString('es-MX');
  }

  function fmtCompact(n: number): string {
    if (!n) return '0';
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
  }

  function pct(val: number, max: number): number {
    if (!max) return 0;
    return Math.round((val / max) * 100);
  }

  onMounted(() => {
    void loadStats();
  });

  watch(timeRange, () => {
    void loadStats();
  });

  return {
    loading,
    error,
    stats,
    timeRange,
    usingMock,
    promptTokens,
    completionTokens,
    totalTokens,
    avgMsgPerConv,
    maxUserTokens,
    slicedDays,
    loadStats,
    fmt,
    fmtCompact,
    pct,
  };
}

export function useDashboardStats() {
  const { showError } = useFeedback();
  const loading = ref(true);
  const error = ref<string | null>(null);
  const totals = ref(emptyTotals());
  const usingMock = ref(useMock);

  async function loadStats() {
    loading.value = true;
    error.value = null;
    try {
      if (useMock) {
        totals.value = createMockStats().totals;
        usingMock.value = true;
        return;
      }
      const res = await fetchStats();
      totals.value = normalizeStatsPayload(res.data).totals;
      usingMock.value = false;
    } catch (e) {
      const message = getErrorMessage(e);
      error.value = message;
      showError(getErrorTitle(e, 'Error al cargar dashboard'), message);
    } finally {
      loading.value = false;
    }
  }

  onMounted(() => {
    void loadStats();
  });

  return { loading, error, totals, usingMock, loadStats };
}
