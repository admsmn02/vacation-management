<script setup lang="ts">
import axios from "axios";
import { computed, onMounted, ref } from "vue";

import { Button } from "@/components/ui/button";
import apiClient from "@/services/api";
import { getAuthToken } from "@/services/auth";

type VacationRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

type VacationRequest = {
  id: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: VacationRequestStatus;
  comments: string | null;
  createdAt: string;
  updatedAt: string;
};

const startDate = ref("");
const endDate = ref("");
const reason = ref("");

const isSubmitting = ref(false);
const submitError = ref("");
const submitSuccess = ref("");

const isLoadingRequests = ref(false);
const requestsError = ref("");
const vacationRequests = ref<VacationRequest[]>([]);

const todayDate = computed(() => new Date().toISOString().slice(0, 10));

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
  return new Date(`${value}T00:00:00.000Z`).toLocaleDateString();
};

const fetchVacationRequests = async (): Promise<void> => {
  isLoadingRequests.value = true;
  requestsError.value = "";

  try {
    const { data } = await apiClient.get<VacationRequest[]>(
      "/vacation-requests/me",
      {
        headers: getAuthHeaders(),
      },
    );

    vacationRequests.value = data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      requestsError.value =
        (error.response?.data as { message?: string } | undefined)?.message ||
        "Failed to load your vacation requests.";
    } else {
      requestsError.value = "Failed to load your vacation requests.";
    }
  } finally {
    isLoadingRequests.value = false;
  }
};

const validateForm = (): string | null => {
  if (!startDate.value || !endDate.value) {
    return "Start date and end date are required.";
  }

  if (startDate.value < todayDate.value || endDate.value < todayDate.value) {
    return "Past dates are not allowed.";
  }

  if (endDate.value <= startDate.value) {
    return "End date must be after start date.";
  }

  return null;
};

const resetForm = (): void => {
  startDate.value = "";
  endDate.value = "";
  reason.value = "";
};

const submitVacationRequest = async (): Promise<void> => {
  submitError.value = "";
  submitSuccess.value = "";

  const validationError = validateForm();
  if (validationError) {
    submitError.value = validationError;
    return;
  }

  isSubmitting.value = true;

  try {
    await apiClient.post(
      "/vacation-requests",
      {
        startDate: startDate.value,
        endDate: endDate.value,
        reason: reason.value.trim() || undefined,
      },
      {
        headers: getAuthHeaders(),
      },
    );

    submitSuccess.value = "Vacation request submitted successfully.";
    resetForm();
    await fetchVacationRequests();
  } catch (error) {
    if (axios.isAxiosError(error)) {
      submitError.value =
        (error.response?.data as { message?: string } | undefined)?.message ||
        "Failed to submit vacation request.";
    } else {
      submitError.value = "Failed to submit vacation request.";
    }
  } finally {
    isSubmitting.value = false;
  }
};

onMounted(async () => {
  await fetchVacationRequests();
});
</script>

<template>
  <div class="space-y-6">
    <section class="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 class="text-xl font-semibold">Create Vacation Request</h2>
      <p class="mt-2 text-sm text-slate-600">
        Submit a new vacation request as a requester.
      </p>

      <form class="mt-6 space-y-4" @submit.prevent="submitVacationRequest">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div class="space-y-1">
            <label
              for="request-start-date"
              class="block text-sm font-medium text-slate-700"
            >
              Start Date
            </label>
            <input
              id="request-start-date"
              v-model="startDate"
              type="date"
              :min="todayDate"
              class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring"
              required
            />
          </div>

          <div class="space-y-1">
            <label
              for="request-end-date"
              class="block text-sm font-medium text-slate-700"
            >
              End Date
            </label>
            <input
              id="request-end-date"
              v-model="endDate"
              type="date"
              :min="todayDate"
              class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring"
              required
            />
          </div>
        </div>

        <div class="space-y-1">
          <label
            for="request-reason"
            class="block text-sm font-medium text-slate-700"
          >
            Reason (Optional)
          </label>
          <textarea
            id="request-reason"
            v-model="reason"
            rows="3"
            class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Add context for your request"
          />
        </div>

        <p v-if="submitError" class="text-sm text-red-600">
          {{ submitError }}
        </p>
        <p v-if="submitSuccess" class="text-sm text-emerald-700">
          {{ submitSuccess }}
        </p>

        <Button type="submit" :disabled="isSubmitting">
          {{ isSubmitting ? "Submitting..." : "Submit Request" }}
        </Button>
      </form>
    </section>

    <section class="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 class="text-xl font-semibold">My Vacation Requests</h2>
      <p class="mt-2 text-sm text-slate-600">
        Review your submitted requests and their current status.
      </p>

      <div v-if="isLoadingRequests" class="mt-6 text-sm text-slate-600">
        Loading requests...
      </div>

      <p v-else-if="requestsError" class="mt-6 text-sm text-red-600">
        {{ requestsError }}
      </p>

      <p
        v-else-if="vacationRequests.length === 0"
        class="mt-6 rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600"
      >
        You have no vacation requests yet.
      </p>

      <div v-else class="mt-6 overflow-x-auto">
        <table class="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead class="bg-slate-50 text-slate-700">
            <tr>
              <th class="px-3 py-2 font-medium">Start Date</th>
              <th class="px-3 py-2 font-medium">End Date</th>
              <th class="px-3 py-2 font-medium">Reason</th>
              <th class="px-3 py-2 font-medium">Status</th>
              <th class="px-3 py-2 font-medium">Comment</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="request in vacationRequests" :key="request.id">
              <td class="px-3 py-3">{{ formatDate(request.startDate) }}</td>
              <td class="px-3 py-3">{{ formatDate(request.endDate) }}</td>
              <td class="px-3 py-3">
                {{ request.reason || "-" }}
              </td>
              <td class="px-3 py-3">
                <span
                  class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold"
                  :class="getStatusBadgeClass(request.status)"
                >
                  {{ request.status }}
                </span>
              </td>
              <td class="px-3 py-3 text-slate-600">
                {{
                  request.status === "REJECTED" ? request.comments || "-" : "-"
                }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
