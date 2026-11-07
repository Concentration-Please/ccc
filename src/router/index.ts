import { createRouter, createWebHashHistory } from 'vue-router'
import AidDetailView from '@/views/AidDetailView.vue'
import AidListView from '@/views/AidListView.vue'

export const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'aid-list',
      component: AidListView,
    },
    {
      path: '/record',
      name: 'record-detail',
      component: AidDetailView,
    },
  ],
})
