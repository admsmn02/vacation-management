<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import axios from "axios";

import { Button } from "@/components/ui/button";
import { login } from "@/services/auth";

const router = useRouter();

const email = ref("");
const password = ref("");
const isSubmitting = ref(false);
const errorMessage = ref("");

const onSubmit = async (): Promise<void> => {
  errorMessage.value = "";

  if (!email.value.trim() || !password.value) {
    errorMessage.value = "Email and password are required.";
    return;
  }

  isSubmitting.value = true;

  try {
    const role = await login({
      email: email.value.trim().toLowerCase(),
      password: password.value,
    });

    if (role === "VALIDATOR") {
      await router.push({ name: "validator-dashboard" });
      return;
    }

    await router.push({ name: "requester-dashboard" });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message =
        (error.response?.data as { message?: string } | undefined)?.message ||
        "Authentication failed. Please check your credentials.";
      errorMessage.value = message;
    } else {
      errorMessage.value = "Authentication failed. Please try again.";
    }
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <section
    class="mx-auto w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
  >
    <h2 class="text-2xl font-semibold tracking-tight text-slate-900">
      Sign in
    </h2>
    <p class="mt-2 text-sm text-slate-600">
      Use your account to access vacation management tools.
    </p>

    <form class="mt-6 space-y-4" @submit.prevent="onSubmit">
      <div class="space-y-1.5">
        <label for="email" class="block text-sm font-medium text-slate-700"
          >Email</label
        >
        <input
          id="email"
          v-model="email"
          type="email"
          autocomplete="email"
          class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="you@example.com"
        />
      </div>

      <div class="space-y-1.5">
        <label for="password" class="block text-sm font-medium text-slate-700"
          >Password</label
        >
        <input
          id="password"
          v-model="password"
          type="password"
          autocomplete="current-password"
          class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="Enter your password"
        />
      </div>

      <p
        v-if="errorMessage"
        class="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
      >
        {{ errorMessage }}
      </p>

      <Button type="submit" class="w-full" :disabled="isSubmitting">
        {{ isSubmitting ? "Signing in..." : "Sign in" }}
      </Button>
    </form>
  </section>
</template>
