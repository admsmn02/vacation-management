import { createRouter, createWebHistory } from "vue-router";

import LoginView from "../views/LoginView.vue";
import RequesterDashboardView from "../views/RequesterDashboardView.vue";
import ValidatorDashboardView from "../views/ValidatorDashboardView.vue";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", redirect: "/login" },
    { path: "/login", name: "login", component: LoginView },
    {
      path: "/requester",
      name: "requester-dashboard",
      component: RequesterDashboardView,
    },
    {
      path: "/validator",
      name: "validator-dashboard",
      component: ValidatorDashboardView,
    },
  ],
});

export default router;
