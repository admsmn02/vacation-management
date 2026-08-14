<script setup lang="ts">
import axios from "axios";
import { computed, onMounted, ref } from "vue";

import apiClient from "@/services/api";
import { getAuthToken } from "@/services/auth";

type TeamVacationItem = {
  id: string;
  startDate: string;
  endDate: string;
  status: "APPROVED";
  user: {
    id: string;
    name: string;
  };
};

const isLoading = ref(false);
const errorMessage = ref("");
const vacations = ref<TeamVacationItem[]>([]);

const getAuthHeaders = (): Record<string, string> => {
  const token = getAuthToken();
  if (!token) {
    return {};
  }

  return {
    Authorization: `Bearer ${token}`,
  };
};

const formatDate = (value: string): string => {
  return new Date(`${value}T00:00:00.000Z`).toLocaleDateString();
};

const monthFormatter = new Intl.DateTimeFormat(undefined, {
  month: "long",
  year: "numeric",
});

const groupedVacations = computed(() => {
  const groups = new Map<string, TeamVacationItem[]>();

  for (const vacation of vacations.value) {
    const monthLabel = monthFormatter.format(
      new Date(`${vacation.startDate}T00:00:00.000Z`),
    );

    const existing = groups.get(monthLabel) || [];
    existing.push(vacation);
    groups.set(monthLabel, existing);
  }

  return Array.from(groups.entries()).map(([month, items]) => ({
    month,
    items,
  }));
});

const fetchTeamPlanning = async (): Promise<void> => {
  isLoading.value = true;
  errorMessage.value = "";

  try {
    const { data } = await apiClient.get<TeamVacationItem[]>(
      "/vacation-requests/team-planning",
      {
        headers: getAuthHeaders(),
      },
    );

    vacations.value = data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      errorMessage.value =
        (error.response?.data as { message?: string } | undefined)?.message ||
        "Failed to load team vacation planning data.";
    } else {
      errorMessage.value = "Failed to load team vacation planning data.";
    }
  } finally {
    isLoading.value = false;
  }
};

onMounted(async () => {
  await fetchTeamPlanning();
});
</script>

<template>
  <section class="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
    <h2 class="text-xl font-semibold">Team Vacation Planning</h2>
    <p class="mt-2 text-sm text-slate-600">Approved team vacations by month.</p>

    <div v-if="isLoading" class="mt-6 text-sm text-slate-600">
      Loading team planning data...
    </div>

    <p v-else-if="errorMessage" class="mt-6 text-sm text-red-600">
      {{ errorMessage }}
    </p>

    <p
      v-else-if="vacations.length === 0"
      class="mt-6 rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600"
    >
      No approved vacations are currently planned.
    </p>

    <div v-else class="mt-6 space-y-6">
      <div
        v-for="group in groupedVacations"
        :key="group.month"
        class="rounded-lg border border-slate-200"
      >
        <div class="border-b border-slate-200 bg-slate-50 px-4 py-3">
          <h3 class="text-sm font-semibold text-slate-800">
            {{ group.month }}
          </h3>
        </div>

        <ul class="divide-y divide-slate-100">
          <li
            v-for="vacation in group.items"
            :key="vacation.id"
            class="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <p class="text-sm font-medium text-slate-900">
              {{ vacation.user.name }}
            </p>
            <p class="text-sm text-slate-600">
              {{ formatDate(vacation.startDate) }} -
              {{ formatDate(vacation.endDate) }}
            </p>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>
