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

const processingRequestIds = ref<string[]>([]);
const actionErrorById = ref<Record<string, string>>({});
const rejectingRequestId = ref<string | null>(null);
const rejectionComment = ref("");
const rejectFormError = ref("");
const openActionMenuRequestId = ref<string | null>(null);

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

const isProcessingRequest = (requestId: string): boolean => {
  return processingRequestIds.value.includes(requestId);
};

const setRequestProcessing = (
  requestId: string,
  isProcessing: boolean,
): void => {
  if (isProcessing) {
    if (!processingRequestIds.value.includes(requestId)) {
      processingRequestIds.value.push(requestId);
    }
    return;
  }

  processingRequestIds.value = processingRequestIds.value.filter(
    (id) => id !== requestId,
  );
};

const clearActionError = (requestId: string): void => {
  if (!actionErrorById.value[requestId]) {
    return;
  }

  const nextErrors = { ...actionErrorById.value };
  delete nextErrors[requestId];
  actionErrorById.value = nextErrors;
};

const setActionError = (requestId: string, message: string): void => {
  actionErrorById.value = {
    ...actionErrorById.value,
    [requestId]: message,
  };
};

const updateRequestInList = (
  requestId: string,
  patch: Partial<VacationRequestItem>,
): void => {
  const index = requests.value.findIndex((request) => request.id === requestId);
  if (index < 0) {
    return;
  }

  requests.value[index] = {
    ...requests.value[index],
    ...patch,
  };
};

const approveRequest = async (requestId: string): Promise<void> => {
  clearActionError(requestId);
  setRequestProcessing(requestId, true);

  try {
    await apiClient.patch(
      `/vacation-requests/${requestId}/approve`,
      {},
      {
        headers: getAuthHeaders(),
      },
    );

    updateRequestInList(requestId, {
      status: "APPROVED",
      comments: null,
    });
    await fetchVacationRequests();
  } catch (error) {
    if (axios.isAxiosError(error)) {
      setActionError(
        requestId,
        (error.response?.data as { message?: string } | undefined)?.message ||
          "Failed to approve vacation request.",
      );
    } else {
      setActionError(requestId, "Failed to approve vacation request.");
    }
  } finally {
    setRequestProcessing(requestId, false);
  }
};

const openRejectForm = (requestId: string): void => {
  clearActionError(requestId);
  rejectFormError.value = "";
  rejectingRequestId.value = requestId;
  rejectionComment.value = "";
  openActionMenuRequestId.value = null;
};

const cancelRejectForm = (): void => {
  rejectingRequestId.value = null;
  rejectionComment.value = "";
  rejectFormError.value = "";
};

const toggleActionMenu = (requestId: string): void => {
  openActionMenuRequestId.value =
    openActionMenuRequestId.value === requestId ? null : requestId;
};

const closeActionMenu = (): void => {
  openActionMenuRequestId.value = null;
};

const submitRejectRequest = async (requestId: string): Promise<void> => {
  clearActionError(requestId);
  rejectFormError.value = "";

  const trimmedComment = rejectionComment.value.trim();
  if (!trimmedComment) {
    rejectFormError.value = "Rejection comment is required.";
    return;
  }

  setRequestProcessing(requestId, true);

  try {
    await apiClient.patch(
      `/vacation-requests/${requestId}/reject`,
      {
        comments: trimmedComment,
      },
      {
        headers: getAuthHeaders(),
      },
    );

    updateRequestInList(requestId, {
      status: "REJECTED",
      comments: trimmedComment,
    });
    cancelRejectForm();
    await fetchVacationRequests();
  } catch (error) {
    if (axios.isAxiosError(error)) {
      setActionError(
        requestId,
        (error.response?.data as { message?: string } | undefined)?.message ||
          "Failed to reject vacation request.",
      );
      rejectFormError.value = actionErrorById.value[requestId] || "";
    } else {
      setActionError(requestId, "Failed to reject vacation request.");
      rejectFormError.value = "Failed to reject vacation request.";
    }
  } finally {
    setRequestProcessing(requestId, false);
  }
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
  <section
    class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
  >
    <h1 class="text-2xl font-semibold tracking-tight text-slate-900">
      Validator Dashboard
    </h1>

    <div class="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
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

    <div
      v-if="isLoading"
      class="mt-5 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"
    >
      Loading vacation requests...
    </div>

    <p
      v-else-if="errorMessage"
      class="mt-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
    >
      {{ errorMessage }}
    </p>

    <p
      v-else-if="requests.length === 0"
      class="mt-5 rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600"
    >
      No vacation requests match the current filters.
    </p>

    <div v-else class="mt-5 overflow-x-auto rounded-lg border border-slate-200">
      <table class="min-w-full divide-y divide-slate-200 text-left text-sm">
        <thead
          class="bg-slate-50 text-xs uppercase tracking-wide text-slate-600"
        >
          <tr>
            <th class="px-3 py-2.5 font-medium">Requester</th>
            <th class="px-3 py-2.5 font-medium">Dates</th>
            <th class="px-3 py-2.5 font-medium">Reason</th>
            <th class="px-3 py-2.5 font-medium">Status</th>
            <th class="px-3 py-2.5 font-medium">Comment</th>
            <th class="px-3 py-2.5 font-medium">Created</th>
            <th class="px-3 py-2.5 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 bg-white">
          <tr v-for="request in requests" :key="request.id">
            <td class="px-3 py-3">
              <p class="font-medium text-slate-900">{{ request.user.name }}</p>
              <p class="text-xs text-slate-600">{{ request.user.email }}</p>
            </td>
            <td class="px-3 py-3 text-xs text-slate-700 sm:text-sm">
              <p class="whitespace-nowrap">
                {{ formatDate(request.startDate) }}
              </p>
              <p class="whitespace-nowrap">{{ formatDate(request.endDate) }}</p>
            </td>
            <td class="max-w-[220px] px-3 py-3 text-slate-700">
              <p class="line-clamp-2">{{ request.reason || "-" }}</p>
            </td>
            <td class="px-3 py-3">
              <span
                class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold"
                :class="getStatusBadgeClass(request.status)"
              >
                {{ request.status }}
              </span>
            </td>
            <td class="max-w-[220px] px-3 py-3 text-slate-600">
              {{
                request.status === "REJECTED" ? request.comments || "-" : "-"
              }}
            </td>
            <td class="whitespace-nowrap px-3 py-3">
              {{ formatDate(request.createdAt) }}
            </td>
            <td class="px-3 py-3 align-top">
              <div v-if="request.status === 'PENDING'" class="relative">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  title="Open actions"
                  :disabled="isLoading || isProcessingRequest(request.id)"
                  @click="toggleActionMenu(request.id)"
                >
                  Manage
                </Button>

                <div
                  v-if="openActionMenuRequestId === request.id"
                  class="absolute right-0 z-10 mt-2 w-40 rounded-md border border-slate-200 bg-white p-1 shadow-lg"
                >
                  <button
                    type="button"
                    class="block w-full rounded px-3 py-2 text-left text-sm text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                    :disabled="isLoading || isProcessingRequest(request.id)"
                    @click="
                      closeActionMenu();
                      approveRequest(request.id);
                    "
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    class="mt-1 block w-full rounded px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
                    :disabled="isLoading || isProcessingRequest(request.id)"
                    @click="openRejectForm(request.id)"
                  >
                    Reject
                  </button>
                </div>

                <p
                  v-if="actionErrorById[request.id]"
                  class="mt-2 max-w-[180px] text-xs text-red-600"
                >
                  {{ actionErrorById[request.id] }}
                </p>
              </div>
              <span v-else class="text-xs text-slate-500">-</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div
      v-if="rejectingRequestId"
      class="fixed inset-0 z-20 flex items-center justify-center bg-black/30 px-4"
      @click.self="cancelRejectForm"
    >
      <div
        class="w-full max-w-md rounded-lg border border-slate-200 bg-white p-4 shadow-xl"
      >
        <h3 class="text-base font-semibold text-slate-900">
          Reject vacation request
        </h3>
        <p class="mt-1 text-sm text-slate-600">
          Provide a rejection comment before submitting.
        </p>

        <div class="mt-3 space-y-2">
          <label class="block text-sm font-medium text-slate-700">
            Rejection comment
          </label>
          <textarea
            v-model="rejectionComment"
            rows="3"
            class="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Enter rejection reason"
            :disabled="isProcessingRequest(rejectingRequestId)"
          />
          <p v-if="rejectFormError" class="text-sm text-red-600">
            {{ rejectFormError }}
          </p>
        </div>

        <div class="mt-4 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            :disabled="isProcessingRequest(rejectingRequestId)"
            @click="cancelRejectForm"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            :disabled="isProcessingRequest(rejectingRequestId)"
            @click="submitRejectRequest(rejectingRequestId)"
          >
            Reject Request
          </Button>
        </div>
      </div>
    </div>

    <div
      class="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between"
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
