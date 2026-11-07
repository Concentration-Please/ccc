import { createRouter, createWebHistory } from 'vue-router'
import AidDetailView from '@/views/AidDetailView.vue'
import AidListView from '@/views/AidListView.vue'

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'aid-list',
      component: AidListView,
    },
    {
      path: '/aid',
      name: 'aid-detail',
      component: AidDetailView,
    },
  ],
})
