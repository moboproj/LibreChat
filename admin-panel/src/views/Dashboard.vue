<template>
  <div class="dashboard">
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">{{ stats.users }}</div>
        <div class="stat-label">Usuarios</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ stats.mcpServers }}</div>
        <div class="stat-label">MCP Servers</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ stats.roles }}</div>
        <div class="stat-label">Roles</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ stats.collections }}</div>
        <div class="stat-label">Colecciones</div>
      </div>
    </div>

    <div class="recent-section">
      <h3>Información del Sistema</h3>
      <div class="info-grid">
        <div class="info-box">
          <h4>MongoDB</h4>
          <p>Conectado ✅</p>
        </div>
        <div class="info-box">
          <h4>API REST</h4>
          <p>Corriendo en puerto 8082</p>
        </div>
        <div class="info-box">
          <h4>Admin Panel</h4>
          <p>Versión 1.0.0</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Dashboard',
  data() {
    return {
      stats: {
        users: 0,
        mcpServers: 0,
        roles: 0,
        collections: 0
      }
    }
  },
  mounted() {
    this.loadStats()
  },
  methods: {
    async loadStats() {
      try {
        // Get collections
        const collectionsRes = await this.$axios.get('/api/collections')
        this.stats.collections = collectionsRes.data.collections.length

        // Get users count
        try {
          const usersRes = await this.$axios.get('/api/users?limit=1')
          this.stats.users = usersRes.data.total || 0
        } catch (e) {
          this.stats.users = 0
        }

        // Get MCP servers count
        try {
          const mcpRes = await this.$axios.get('/api/mcpservers?limit=1')
          this.stats.mcpServers = mcpRes.data.total || 0
        } catch (e) {
          this.stats.mcpServers = 0
        }

        // Get roles count
        try {
          const rolesRes = await this.$axios.get('/api/roles?limit=1')
          this.stats.roles = rolesRes.data.total || 0
        } catch (e) {
          this.stats.roles = 0
        }
      } catch (error) {
        console.error('Error loading stats:', error)
      }
    }
  }
}
</script>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.stat-card {
  background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
  border: 1px solid #475569;
  border-radius: 12px;
  padding: 25px;
  text-align: center;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 25px rgba(59, 130, 246, 0.1);
}

.stat-value {
  font-size: 32px;
  font-weight: bold;
  color: #60a5fa;
  margin-bottom: 10px;
}

.stat-label {
  font-size: 14px;
  color: #cbd5e1;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.recent-section {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
  padding: 25px;
}

.recent-section h3 {
  margin-top: 0;
  color: #f1f5f9;
  margin-bottom: 20px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
}

.info-box {
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 15px;
}

.info-box h4 {
  color: #60a5fa;
  margin: 0 0 10px 0;
  font-size: 14px;
  text-transform: uppercase;
}

.info-box p {
  color: #cbd5e1;
  margin: 0;
  font-size: 14px;
}
</style>
