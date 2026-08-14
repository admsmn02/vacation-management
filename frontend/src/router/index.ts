import { createRouter, createWebHistory } from "vue-router";
import { getAuthenticatedRole } from "@/services/auth";
import type { UserRole } from "@/types/auth.types";

import LoginView from "../views/LoginView.vue";
import RequesterDashboardView from "../views/RequesterDashboardView.vue";
import ValidatorDashboardView from "../views/ValidatorDashboardView.vue";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", redirect: "/login" },
    {
      path: "/login",
      name: "login",
      component: LoginView,
      meta: { requiresAuth: false },
    },
    {
      path: "/requester",
      name: "requester-dashboard",
      component: RequesterDashboardView,
      meta: { requiresAuth: true, requiredRole: "REQUESTER" as UserRole },
    },
    {
      path: "/validator",
      name: "validator-dashboard",
      component: ValidatorDashboardView,
      meta: { requiresAuth: true, requiredRole: "VALIDATOR" as UserRole },
    },
  ],
});

router.beforeEach((to) => {
  const role = getAuthenticatedRole();
  const isAuthenticated = role !== null;
  const requiresAuth = to.meta.requiresAuth === true;
  const requiredRole = to.meta.requiredRole as UserRole | undefined;

  if (requiresAuth && !isAuthenticated) {
    return { name: "login" };
  }

  if (requiredRole && role !== requiredRole) {
    return { name: "login" };
  }

  if (to.name === "login" && isAuthenticated) {
    return role === "VALIDATOR"
      ? { name: "validator-dashboard" }
      : { name: "requester-dashboard" };
  }

  return true;
});

export default router;
