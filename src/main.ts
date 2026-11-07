import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'
import './assets/fonts.css'
import './assets/main.css'

const legacyAidPath = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/aid`
if (window.location.pathname === legacyAidPath && !window.location.hash) {
  window.history.replaceState(
    window.history.state,
    '',
    `${import.meta.env.BASE_URL}#/aid${window.location.search}`,
  )
}

createApp(App).use(router).mount('#app')
