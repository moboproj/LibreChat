import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import axios from 'axios'

const app = createApp(App)

// Configure axios
axios.defaults.baseURL = process.env.VITE_API_URL || 'http://localhost:8082'

app.config.globalProperties.$axios = axios
app.use(router)
app.mount('#app')
