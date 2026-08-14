<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";

import { Button } from "@/components/ui/button";
import { authState, logout } from "@/services/auth";

const route = useRoute();
const router = useRouter();

const authenticatedRole = computed(() => authState.role.value);
const isAuthenticated = computed(() => authenticatedRole.value !== null);

const handleLogout = async (): Promise<void> => {
  logout();
  if (route.name !== "login") {
    await router.push({ name: "login" });
  }
};
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-900">
    <header
      class="sticky top-0 z-10 border-b border-slate-200/90 bg-white/95 backdrop-blur"
    >
      <div
        class="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
      >
        <div>
          <h1 class="text-lg font-semibold tracking-tight text-slate-900">
            Vacation Management
          </h1>
          <p class="text-xs text-slate-500">Internal planning and approvals</p>
        </div>

        <nav class="flex flex-wrap items-center gap-2 text-sm text-slate-600">
          <RouterLink
            v-if="!isAuthenticated"
            class="rounded-md px-2 py-1 hover:bg-slate-100 hover:text-slate-900"
            to="/login"
            >Login</RouterLink
          >
          <RouterLink
            v-if="authenticatedRole === 'REQUESTER'"
            class="rounded-md px-2 py-1 hover:bg-slate-100 hover:text-slate-900"
            to="/requester"
            >Requester Dashboard</RouterLink
          >
          <RouterLink
            v-if="authenticatedRole === 'VALIDATOR'"
            class="rounded-md px-2 py-1 hover:bg-slate-100 hover:text-slate-900"
            to="/validator"
            >Validator Dashboard</RouterLink
          >
          <RouterLink
            v-if="isAuthenticated"
            class="rounded-md px-2 py-1 hover:bg-slate-100 hover:text-slate-900"
            to="/team-planning"
            >Team Planning</RouterLink
          >
          <Button
            v-if="isAuthenticated"
            type="button"
            variant="outline"
            size="sm"
            @click="handleLogout"
          >
            Logout
          </Button>
        </nav>
      </div>
    </header>

    <main class="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <slot />
    </main>
  </div>
</template>
