import { readonly, ref } from "vue";

import apiClient from "./api";
import type {
  JwtPayload,
  LoginRequest,
  LoginResponse,
  UserRole,
} from "@/types/auth.types";

const AUTH_TOKEN_KEY = "vacation_auth_token";

const decodeBase64Url = (value: string): string => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return atob(padded);
};

export const decodeJwtPayload = (token: string): JwtPayload | null => {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }

  try {
    const payloadRaw = decodeBase64Url(parts[1]);
    const parsed = JSON.parse(payloadRaw) as Partial<JwtPayload>;

    if (
      typeof parsed.id !== "string" ||
      (parsed.role !== "REQUESTER" && parsed.role !== "VALIDATOR")
    ) {
      return null;
    }

    return {
      id: parsed.id,
      role: parsed.role,
      exp: parsed.exp,
      iat: parsed.iat,
    };
  } catch {
    return null;
  }
};

export const getAuthToken = (): string | null => {
  return localStorage.getItem(AUTH_TOKEN_KEY);
};

export const setAuthToken = (token: string): void => {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
};

export const clearAuthToken = (): void => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
};

const resolveAuthenticatedRoleFromToken = (
  token: string | null,
): UserRole | null => {
  if (!token) {
    return null;
  }

  const payload = decodeJwtPayload(token);
  if (!payload) {
    return null;
  }

  if (typeof payload.exp === "number") {
    const expiresAt = payload.exp * 1000;
    if (Date.now() >= expiresAt) {
      return null;
    }
  }

  return payload.role;
};

const authRole = ref<UserRole | null>(
  resolveAuthenticatedRoleFromToken(getAuthToken()),
);

export const authState = {
  role: readonly(authRole),
};

export const getAuthenticatedRole = (): UserRole | null => {
  return authRole.value;
};

export const login = async (payload: LoginRequest): Promise<UserRole> => {
  const { data } = await apiClient.post<LoginResponse>("/auth/login", payload);
  setAuthToken(data.token);

  const decoded = decodeJwtPayload(data.token);
  if (!decoded) {
    clearAuthToken();
    authRole.value = null;
    throw new Error("Invalid token received");
  }

  authRole.value = decoded.role;

  return decoded.role;
};

export const logout = (): void => {
  clearAuthToken();
  authRole.value = null;
};
