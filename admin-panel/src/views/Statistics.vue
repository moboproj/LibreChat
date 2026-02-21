<template>
  <div class="stats-container">
    <div v-if="loading" class="loading">Cargando estadísticas...</div>
    <div v-else-if="error" class="error-state">{{ error }}</div>
    <template v-else>

      <!-- KPI Cards -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-icon">💬</div>
          <div class="kpi-body">
            <div class="kpi-value">{{ fmt(stats.totals.totalMessages) }}</div>
            <div class="kpi-label">Mensajes totales</div>
            <div class="kpi-sub">+{{ fmt(stats.messagesLast7Days) }} últimos 7 días</div>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon">👥</div>
          <div class="kpi-body">
            <div class="kpi-value">{{ fmt(stats.totals.totalUsers) }}</div>
            <div class="kpi-label">Usuarios</div>
            <div class="kpi-sub">+{{ stats.newUsersLast30Days }} últimos 30 días</div>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon">🗂️</div>
          <div class="kpi-body">
            <div class="kpi-value">{{ fmt(stats.totals.totalConversations) }}</div>
            <div class="kpi-label">Conversaciones</div>
            <div class="kpi-sub">{{ avgMsgPerConv }} mensajes/conv</div>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon">🔢</div>
          <div class="kpi-body">
            <div class="kpi-value">{{ fmtM(totalTokens) }}</div>
            <div class="kpi-label">Tokens consumidos</div>
            <div class="kpi-sub">{{ fmtM(promptTokens) }} prompt · {{ fmtM(completionTokens) }} completion</div>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon">🤖</div>
          <div class="kpi-body">
            <div class="kpi-value">{{ fmt(stats.totals.totalAgents) }}</div>
            <div class="kpi-label">Agentes activos</div>
            <div class="kpi-sub">{{ fmt(stats.totals.totalFiles) }} archivos subidos</div>
          </div>
        </div>
      </div>

      <!-- Row: mensajes por día + usuarios activos -->
      <div class="charts-row">
        <div class="chart-card wide">
          <h3 class="chart-title">Mensajes por día (últimos 30 días)</h3>
          <svg class="bar-chart" :viewBox="`0 0 ${barW} ${barH}`" preserveAspectRatio="none">
            <g v-for="(bar, i) in msgBars" :key="i">
              <rect
                :x="bar.x" :y="bar.y" :width="bar.w" :height="bar.h"
                :fill="bar.h > 0 ? '#3b82f6' : 'transparent'"
                rx="2"
              />
              <text
                v-if="bar.h > 20"
                :x="bar.x + bar.w / 2" :y="bar.y + bar.h / 2 + 4"
                text-anchor="middle" font-size="9" fill="#fff"
              >{{ bar.count }}</text>
              <text
                :x="bar.x + bar.w / 2" :y="barH - 2"
                text-anchor="middle" font-size="7" fill="#64748b"
              >{{ bar.label }}</text>
            </g>
          </svg>
        </div>

        <div class="chart-card">
          <h3 class="chart-title">Usuarios activos/día</h3>
          <svg class="bar-chart" :viewBox="`0 0 ${barW} ${barH}`" preserveAspectRatio="none">
            <g v-for="(bar, i) in activeUserBars" :key="i">
              <rect
                :x="bar.x" :y="bar.y" :width="bar.w" :height="bar.h"
                :fill="bar.h > 0 ? '#10b981' : 'transparent'"
                rx="2"
              />
              <text
                v-if="bar.h > 14"
                :x="bar.x + bar.w / 2" :y="bar.y + bar.h / 2 + 4"
                text-anchor="middle" font-size="9" fill="#fff"
              >{{ bar.count }}</text>
              <text
                :x="bar.x + bar.w / 2" :y="barH - 2"
                text-anchor="middle" font-size="7" fill="#64748b"
              >{{ bar.label }}</text>
            </g>
          </svg>
        </div>
      </div>

      <!-- Row: modelos + endpoints + tokens por tipo -->
      <div class="charts-row">
        <div class="chart-card">
          <h3 class="chart-title">Respuestas por modelo</h3>
          <div class="bar-list">
            <div v-for="item in stats.messagesByModel" :key="item._id" class="bar-item">
              <div class="bar-item-label" :title="item._id">{{ shortModel(item._id) }}</div>
              <div class="bar-item-track">
                <div class="bar-item-fill" :style="{ width: pct(item.count, maxModelCount) + '%', background: '#8b5cf6' }"></div>
              </div>
              <div class="bar-item-value">{{ fmt(item.count) }}</div>
            </div>
          </div>
        </div>

        <div class="chart-card narrow">
          <h3 class="chart-title">Conversaciones por endpoint</h3>
          <svg class="pie-chart" viewBox="0 0 120 120">
            <g transform="translate(60,60)">
              <path v-for="(slice, i) in endpointSlices" :key="i" :d="slice.d" :fill="slice.color" />
            </g>
            <g v-for="(slice, i) in endpointSlices" :key="'l'+i">
              <rect :x="4" :y="80 + i * 14" width="8" height="8" :fill="slice.color" rx="2" />
              <text :x="16" :y="88 + i * 14" font-size="7" fill="#94a3b8">{{ slice.label }} ({{ slice.count }})</text>
            </g>
          </svg>
        </div>

        <div class="chart-card narrow">
          <h3 class="chart-title">Tokens por tipo</h3>
          <svg class="pie-chart" viewBox="0 0 120 120">
            <g transform="translate(60,60)">
              <path v-for="(slice, i) in tokenSlices" :key="i" :d="slice.d" :fill="slice.color" />
            </g>
            <g v-for="(slice, i) in tokenSlices" :key="'t'+i">
              <rect :x="4" :y="80 + i * 14" width="8" height="8" :fill="slice.color" rx="2" />
              <text :x="16" :y="88 + i * 14" font-size="7" fill="#94a3b8">{{ slice.label }} ({{ fmtM(slice.count) }})</text>
            </g>
          </svg>
        </div>
      </div>

      <!-- Top usuarios por tokens -->
      <div class="chart-card full">
        <h3 class="chart-title">Top usuarios por tokens consumidos</h3>
        <table class="users-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Usuario</th>
              <th>Tokens</th>
              <th>Participación</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(user, i) in stats.topUsersByTokens" :key="user._id">
              <td class="rank">{{ i + 1 }}</td>
              <td>
                <div class="user-name">{{ user.name || 'Sin nombre' }}</div>
                <div class="user-email">{{ user.email || '' }}</div>
              </td>
              <td class="tokens-cell">{{ fmtM(user.totalTokens) }}</td>
              <td>
                <div class="progress-track">
                  <div class="progress-fill" :style="{ width: pct(user.totalTokens, maxUserTokens) + '%' }"></div>
                </div>
                <span class="pct-label">{{ pct(user.totalTokens, maxUserTokens) }}%</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

    </template>
  </div>
</template>

<script>
const PALETTE = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

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

export default {
  name: 'Statistics',
  data() {
    return {
      loading: true,
      error: null,
      stats: null,
      barW: 600,
      barH: 140,
    };
  },
  async mounted() {
    await this.fetchStats();
  },
  computed: {
    totalTokens() {
      return this.stats?.tokensByType?.reduce((s, t) => s + t.total, 0) ?? 0;
    },
    promptTokens() {
      return this.stats?.tokensByType?.find((t) => t._id === 'prompt')?.total ?? 0;
    },
    completionTokens() {
      return this.stats?.tokensByType?.find((t) => t._id === 'completion')?.total ?? 0;
    },
    avgMsgPerConv() {
      const total = this.stats?.totals?.totalConversations;
      if (!total) return 0;
      return (this.stats.totals.totalMessages / total).toFixed(1);
    },
    maxModelCount() {
      return Math.max(...(this.stats?.messagesByModel?.map((m) => m.count) ?? []), 1);
    },
    maxUserTokens() {
      return Math.max(...(this.stats?.topUsersByTokens?.map((u) => u.totalTokens) ?? []), 1);
    },
    msgBars() {
      return this.stats ? this.buildBars(this.stats.messagesByDay, 'count') : [];
    },
    activeUserBars() {
      return this.stats ? this.buildBars(this.stats.activeUsersByDay, 'activeUsers') : [];
    },
    endpointSlices() {
      if (!this.stats) return [];
      const total = this.stats.messagesByEndpoint.reduce((s, e) => s + e.count, 0) || 1;
      return pieSlices(this.stats.messagesByEndpoint, total);
    },
    tokenSlices() {
      if (!this.stats) return [];
      const items = this.stats.tokensByType.map((t) => ({ _id: t._id, count: t.total }));
      const total = this.totalTokens || 1;
      return pieSlices(items, total);
    },
  },
  methods: {
    async fetchStats() {
      try {
        const res = await this.$axios.get('/api/stats');
        this.stats = res.data;
      } catch (e) {
        this.error = 'Error cargando estadísticas: ' + e.message;
      } finally {
        this.loading = false;
      }
    },
    fmt(n) {
      return (n ?? 0).toLocaleString('es-MX');
    },
    fmtM(n) {
      if (!n) return '0';
      if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
      if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
      return String(n);
    },
    pct(val, max) {
      if (!max) return 0;
      return Math.round((val / max) * 100);
    },
    shortModel(id) {
      if (!id) return 'unknown';
      if (id.startsWith('agent_')) return id.slice(0, 16) + '…';
      return id.length > 24 ? id.slice(-24) : id;
    },
    buildBars(data, field) {
      const max = Math.max(...data.map((d) => d[field]), 1);
      const chartH = this.barH - 20;
      const count = data.length || 1;
      const w = this.barW / count - 2;
      return data.map((d, i) => {
        const h = (d[field] / max) * chartH;
        return {
          x: i * (this.barW / count) + 1,
          y: chartH - h,
          w,
          h,
          count: d[field],
          label: (d._id || '').slice(5),
        };
      });
    },
  },
};
</script>

<style scoped>
.stats-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.loading,
.error-state {
  color: #94a3b8;
  text-align: center;
  padding: 60px;
  font-size: 16px;
}

.error-state { color: #f87171; }

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
}

.kpi-card {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  gap: 14px;
  align-items: flex-start;
}

.kpi-icon { font-size: 28px; line-height: 1; }

.kpi-value {
  font-size: 24px;
  font-weight: 700;
  color: #f1f5f9;
  line-height: 1.1;
}

.kpi-label {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 4px;
}

.kpi-sub {
  font-size: 11px;
  color: #475569;
  margin-top: 4px;
}

.charts-row {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.chart-card {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
  padding: 20px;
  flex: 1;
  min-width: 0;
}

.chart-card.wide { flex: 2; }
.chart-card.narrow { flex: 0 0 200px; }
.chart-card.full { width: 100%; }

.chart-title {
  font-size: 13px;
  font-weight: 600;
  color: #94a3b8;
  margin: 0 0 16px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.bar-chart {
  width: 100%;
  height: 140px;
  display: block;
}

.pie-chart {
  width: 100%;
  height: 140px;
  display: block;
}

.bar-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.bar-item {
  display: grid;
  grid-template-columns: 120px 1fr 50px;
  align-items: center;
  gap: 8px;
}

.bar-item-label {
  font-size: 12px;
  color: #cbd5e1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bar-item-track {
  height: 8px;
  background: #0f172a;
  border-radius: 4px;
  overflow: hidden;
}

.bar-item-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.4s ease;
}

.bar-item-value {
  font-size: 12px;
  color: #94a3b8;
  text-align: right;
}

.users-table {
  width: 100%;
  border-collapse: collapse;
}

.users-table th {
  text-align: left;
  font-size: 11px;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 8px 12px;
  border-bottom: 1px solid #334155;
}

.users-table td {
  padding: 10px 12px;
  border-bottom: 1px solid #1e293b;
  vertical-align: middle;
}

.users-table tr:last-child td { border-bottom: none; }

.rank {
  font-size: 13px;
  font-weight: 700;
  color: #475569;
  width: 30px;
}

.user-name {
  font-size: 14px;
  color: #f1f5f9;
  font-weight: 500;
}

.user-email {
  font-size: 11px;
  color: #475569;
  margin-top: 2px;
}

.tokens-cell {
  font-size: 14px;
  color: #60a5fa;
  font-weight: 600;
  white-space: nowrap;
}

.progress-track {
  height: 6px;
  background: #0f172a;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 3px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #8b5cf6);
  border-radius: 3px;
  transition: width 0.4s ease;
}

.pct-label {
  font-size: 11px;
  color: #475569;
}
</style>
