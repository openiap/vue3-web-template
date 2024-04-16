import { createRouter, createWebHistory } from 'vue-router'
import TasksView from '../views/TasksView.vue'

// create async configureRouter
export async function configureRouter(idsrvAuth) {
  const routes = [
    {
      path: '/',
      name: 'task',
      component: TasksView,
    },
    {
      path: '/lookup/:id',
      name: 'taskwithid',
      props: true,
      component: TasksView,
    },
    {
      path: '/Entities',
      name: 'Entities',
      meta: { authName: idsrvAuth.authName },
      component: () => import(/* webpackChunkName: "about" */ '../views/EntitiesView.vue')
    },
    {
      path: '/Entities/:propcollectionname',
      name: 'EntitiesCollection',
      meta: { authName: idsrvAuth.authName },
      props: true,
      component: () => import(/* webpackChunkName: "about" */ '../views/EntitiesView.vue')
    },
    {
      path: '/Entity/:collectionname',
      name: 'EntityView',
      meta: { authName: idsrvAuth.authName },
      props: true,
      component: () => import(/* webpackChunkName: "about" */ '../views/EntityView.vue')
    },
    {
      path: '/Entity/:collectionname/:id',
      name: 'EntityViewWithId',
      meta: { authName: idsrvAuth.authName },
      props: true,
      component: () => import(/* webpackChunkName: "about" */ '../views/EntityView.vue')
    },
    {
      path: '/Workitems',
      name: 'WorkItemsView',
      meta: { authName: idsrvAuth.authName },
      component: () => import(/* webpackChunkName: "about" */ '../views/WorkitemsView.vue')
    },
    {
      path: '/Workitems/:propwiqid',
      name: 'WorkItemsViewwiqid',
      props: true,
      meta: { authName: idsrvAuth.authName },
      component: () => import(/* webpackChunkName: "about" */ '../views/WorkitemsView.vue')
    },
    {
      path: '/Workitem/edit/:id',
      name: 'WorkItemViewWithId',
      props: true,
      meta: { authName: idsrvAuth.authName },
      component: () => import(/* webpackChunkName: "about" */ '../views/WorkitemView.vue')
    },
    {
      path: '/Workitem/new/:wiqid',
      name: 'NewWorkItemViewWithwiqid',
      props: true,
      meta: { authName: idsrvAuth.authName },
      component: () => import(/* webpackChunkName: "about" */ '../views/WorkitemView.vue')
    },
    {
      path: '/Form/:workflow/:id',
      name: 'FormView',
      meta: { authName: idsrvAuth.authName },
      props: true,
      component: () => import(/* webpackChunkName: "about" */ '../views/FormView.vue')
    }

  ]

  const router = createRouter({
    history: createWebHistory(process.env.BASE_URL),
    routes
  })
  return router;
}
export default configureRouter
