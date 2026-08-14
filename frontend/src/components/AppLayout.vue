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
    <header class="border-b border-slate-200 bg-white">
      <div
        class="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4 sm:px-6"
      >
        <h1 class="text-lg font-semibold">Vacation Management</h1>
        <nav class="flex items-center gap-4 text-sm text-slate-600">
          <RouterLink
            v-if="!isAuthenticated"
            class="hover:text-slate-900"
            to="/login"
            >Login</RouterLink
          >
          <RouterLink
            v-if="authenticatedRole === 'REQUESTER'"
            class="hover:text-slate-900"
            to="/requester"
            >Requester Dashboard</RouterLink
          >
          <RouterLink
            v-if="authenticatedRole === 'VALIDATOR'"
            class="hover:text-slate-900"
            to="/validator"
            >Validator Dashboard</RouterLink
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

    <main class="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <slot />
    </main>
  </div>
</template>
