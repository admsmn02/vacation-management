<script setup lang="ts">
import axios from "axios";
import { computed, onMounted, ref } from "vue";

import { Button } from "@/components/ui/button";
import apiClient from "@/services/api";
import { getAuthToken } from "@/services/auth";

type VacationRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

type RequesterSummary = {
  id: string;
  name: string;
  email: string;
};

type VacationRequestItem = {
  id: string;
  userId: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: VacationRequestStatus;
  comments: string | null;
  createdAt: string;
  user: RequesterSummary;
};

type VacationRequestsResponse = {
  items: VacationRequestItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

const isLoading = ref(false);
const errorMessage = ref("");
const requests = ref<VacationRequestItem[]>([]);

const selectedStatus = ref<"ALL" | VacationRequestStatus>("ALL");
const selectedUserId = ref<string>("ALL");

const availableUsersMap = ref<Record<string, RequesterSummary>>({});

const page = ref(1);
const limit = ref(10);
const total = ref(0);
const totalPages = ref(1);

const availableUsers = computed(() => {
  return Object.values(availableUsersMap.value).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
});

const getAuthHeaders = (): Record<string, string> => {
  const token = getAuthToken();
  if (!token) {
    return {};
  }

  return {
    Authorization: `Bearer ${token}`,
  };
};

const getStatusBadgeClass = (status: VacationRequestStatus): string => {
  if (status === "APPROVED") {
    return "bg-emerald-100 text-emerald-800";
  }

  if (status === "REJECTED") {
    return "bg-red-100 text-red-800";
  }

  return "bg-amber-100 text-amber-800";
};

const formatDate = (value: string): string => {
  return new Date(value).toLocaleDateString();
};

const fetchVacationRequests = async (): Promise<void> => {
  isLoading.value = true;
  errorMessage.value = "";

  try {
    const params: Record<string, string | number> = {
      page: page.value,
      limit: limit.value,
    };

    if (selectedStatus.value !== "ALL") {
      params.status = selectedStatus.value;
    }

    if (selectedUserId.value !== "ALL") {
      params.userId = selectedUserId.value;
    }

    const { data } = await apiClient.get<VacationRequestsResponse>(
      "/vacation-requests",
      {
        params,
        headers: getAuthHeaders(),
      },
    );

    requests.value = data.items;
    for (const request of data.items) {
      availableUsersMap.value[request.user.id] = request.user;
    }
    page.value = data.page;
    limit.value = data.limit;
    total.value = data.total;
    totalPages.value = data.totalPages || 1;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      errorMessage.value =
        (error.response?.data as { message?: string } | undefined)?.message ||
        "Failed to load vacation requests.";
    } else {
      errorMessage.value = "Failed to load vacation requests.";
    }
  } finally {
    isLoading.value = false;
  }
};

const applyFilters = async (): Promise<void> => {
  page.value = 1;
  await fetchVacationRequests();
};

const goToPreviousPage = async (): Promise<void> => {
  if (page.value <= 1) {
    return;
  }

  page.value -= 1;
  await fetchVacationRequests();
};

const goToNextPage = async (): Promise<void> => {
  if (page.value >= totalPages.value) {
    return;
  }

  page.value += 1;
  await fetchVacationRequests();
};

onMounted(async () => {
  await fetchVacationRequests();
});
</script>

<template>
  <section class="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
    <h2 class="text-xl font-semibold">Validator Dashboard</h2>
    <p class="mt-2 text-sm text-slate-600">
      Review vacation requests submitted by requesters.
    </p>

    <div class="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
      <div class="space-y-1">
        <label
          for="status-filter"
          class="block text-sm font-medium text-slate-700"
        >
          Status
        </label>
        <select
          id="status-filter"
          v-model="selectedStatus"
          class="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring"
          @change="applyFilters"
        >
          <option value="ALL">All</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      <div class="space-y-1 md:col-span-2">
        <label
          for="user-filter"
          class="block text-sm font-medium text-slate-700"
        >
          User
        </label>
        <select
          id="user-filter"
          v-model="selectedUserId"
          class="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring"
          @change="applyFilters"
        >
          <option value="ALL">All users</option>
          <option
            v-for="user in availableUsers"
            :key="user.id"
            :value="user.id"
          >
            {{ user.name }}
          </option>
        </select>
      </div>
    </div>

    <div v-if="isLoading" class="mt-6 text-sm text-slate-600">
      Loading vacation requests...
    </div>

    <p v-else-if="errorMessage" class="mt-6 text-sm text-red-600">
      {{ errorMessage }}
    </p>

    <p
      v-else-if="requests.length === 0"
      class="mt-6 rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600"
    >
      No vacation requests match the current filters.
    </p>

    <div v-else class="mt-6 overflow-x-auto">
      <table class="min-w-full divide-y divide-slate-200 text-left text-sm">
        <thead class="bg-slate-50 text-slate-700">
          <tr>
            <th class="px-3 py-2 font-medium">Requester</th>
            <th class="px-3 py-2 font-medium">Email</th>
            <th class="px-3 py-2 font-medium">Start Date</th>
            <th class="px-3 py-2 font-medium">End Date</th>
            <th class="px-3 py-2 font-medium">Reason</th>
            <th class="px-3 py-2 font-medium">Status</th>
            <th class="px-3 py-2 font-medium">Created</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-for="request in requests" :key="request.id">
            <td class="px-3 py-3">{{ request.user.name }}</td>
            <td class="px-3 py-3">{{ request.user.email }}</td>
            <td class="px-3 py-3">{{ formatDate(request.startDate) }}</td>
            <td class="px-3 py-3">{{ formatDate(request.endDate) }}</td>
            <td class="px-3 py-3">{{ request.reason || "-" }}</td>
            <td class="px-3 py-3">
              <span
                class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold"
                :class="getStatusBadgeClass(request.status)"
              >
                {{ request.status }}
              </span>
            </td>
            <td class="px-3 py-3">{{ formatDate(request.createdAt) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div
      class="mt-6 flex items-center justify-between border-t border-slate-200 pt-4"
    >
      <p class="text-sm text-slate-600">
        Page {{ page }} of {{ totalPages }} ({{ total }} total)
      </p>
      <div class="flex gap-2">
        <Button
          type="button"
          variant="outline"
          :disabled="page <= 1 || isLoading"
          @click="goToPreviousPage"
        >
          Previous
        </Button>
        <Button
          type="button"
          variant="outline"
          :disabled="page >= totalPages || isLoading"
          @click="goToNextPage"
        >
          Next
        </Button>
      </div>
    </div>
  </section>
</template>
