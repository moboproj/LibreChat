import { ref, computed } from 'vue';
import { fetchStats } from '../api/stats';

const PALETTE = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
  '#84cc16',
];

function pieSlices(items, total) {
  let angle = -Math.PI / 2;
  return items.map((item, i) => {
    const ratio = item.count / total;
    const sweep = ratio * 2 * Math.PI;
    const x1 = Math.cos(angle) * 50;
    const y1 = Math.sin(angle) * 50;
    angle += sweep;
    const x2 = Math.cos(angle) * 50;
    const y2 = Math.sin(angle) * 50;
    const large = sweep > Math.PI ? 1 : 0;
    return {
      d: `M0 0 L${x1} ${y1} A50 50 0 ${large} 1 ${x2} ${y2} Z`,
      color: PALETTE[i % PALETTE.length],
      label: item._id,
      count: item.count,
    };
  });
}

export function useStats() {
  const loading = ref(true);
  const error = ref(null);
  const stats = ref(null);
  const barW = 600;
  const barH = 140;

  const totalTokens = computed(
    () => stats.value?.tokensByType?.reduce((s, t) => s + t.total, 0) ?? 0,
  );
  const promptTokens = computed(
    () => stats.value?.tokensByType?.find((t) => t._id === 'prompt')?.total ?? 0,
  );
  const completionTokens = computed(
    () => stats.value?.tokensByType?.find((t) => t._id === 'completion')?.total ?? 0,
  );
  const avgMsgPerConv = computed(() => {
    const total = stats.value?.totals?.totalConversations;
    if (!total) return 0;
    return (stats.value.totals.totalMessages / total).toFixed(1);
  });
  const maxModelCount = computed(() =>
    Math.max(...(stats.value?.messagesByModel?.map((m) => m.count) ?? []), 1),
  );
  const maxUserTokens = computed(() =>
    Math.max(...(stats.value?.topUsersByTokens?.map((u) => u.totalTokens) ?? []), 1),
  );

  function buildBars(data, field) {
    const max = Math.max(...data.map((d) => d[field]), 1);
    const chartH = barH - 20;
    const count = data.length || 1;
    const w = barW / count - 2;
    return data.map((d, i) => {
      const h = (d[field] / max) * chartH;
      return {
        x: i * (barW / count) + 1,
        y: chartH - h,
        w,
        h,
        count: d[field],
        label: (d._id || '').slice(5),
      };
    });
  }

  const msgBars = computed(() =>
    stats.value ? buildBars(stats.value.messagesByDay || [], 'count') : [],
  );
  const activeUserBars = computed(() =>
    stats.value ? buildBars(stats.value.activeUsersByDay || [], 'activeUsers') : [],
  );
  const endpointSlices = computed(() => {
    if (!stats.value?.messagesByEndpoint) return [];
    const total = stats.value.messagesByEndpoint.reduce((s, e) => s + e.count, 0) || 1;
    return pieSlices(stats.value.messagesByEndpoint, total);
  });
  const tokenSlices = computed(() => {
    if (!stats.value?.tokensByType) return [];
    const items = stats.value.tokensByType.map((t) => ({ _id: t._id, count: t.total }));
    return pieSlices(items, totalTokens.value || 1);
  });

  async function loadStats() {
    loading.value = true;
    error.value = null;
    try {
      const res = await fetchStats();
      stats.value = res.data;
    } catch (e) {
      error.value = 'Error cargando estadísticas: ' + e.message;
    } finally {
      loading.value = false;
    }
  }

  function fmt(n) {
    return (n ?? 0).toLocaleString('es-MX');
  }

  function fmtM(n) {
    if (!n) return '0';
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
    return String(n);
  }

  function pct(val, max) {
    if (!max) return 0;
    return Math.round((val / max) * 100);
  }

  function shortModel(id) {
    if (!id) return 'unknown';
    if (id.startsWith('agent_')) return id.slice(0, 16) + '…';
    return id.length > 24 ? id.slice(-24) : id;
  }

  return {
    loading,
    error,
    stats,
    barW,
    barH,
    totalTokens,
    promptTokens,
    completionTokens,
    avgMsgPerConv,
    maxModelCount,
    maxUserTokens,
    msgBars,
    activeUserBars,
    endpointSlices,
    tokenSlices,
    loadStats,
    fmt,
    fmtM,
    pct,
    shortModel,
  };
}

export function useDashboard() {
  const stats = ref({
    users: 0,
    mcpServers: 0,
    roles: 0,
    collections: 0,
  });

  async function loadStats() {
    try {
      const response = await fetchStats();
      const data = response.data;
      if (data.totals) {
        stats.value = {
          users: data.totals.totalUsers || 0,
          mcpServers: data.totals.totalMCPServers || data.totals.totalAgents || 0,
          roles: data.totals.totalRoles || 0,
          collections: data.totals.totalConversations || 0,
        };
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  return { stats, loadStats };
}
