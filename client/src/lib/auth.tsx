import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import type { AppRole } from "@shared/schema";
import { apiRequest, queryClient } from "./queryClient";

type AuthUser = {
  id: string;
  username: string;
  role: AppRole;
};

type AuthMeResponse = {
  user: AuthUser;
};

type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasRole: (roles: readonly AppRole[]) => boolean;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function getAuthMe(): Promise<AuthMeResponse | null> {
  const response = await fetch("/api/auth/me", {
    credentials: "include",
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    const text = (await response.text()) || response.statusText;
    throw new Error(`${response.status}: ${text}`);
  }

  return (await response.json()) as AuthMeResponse;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const shouldLoadAuth = typeof window === "undefined"
    ? true
    : window.location.pathname.startsWith("/backoffice");

  const { data, isLoading } = useQuery<AuthMeResponse | null>({
    queryKey: ["/api/auth/me"],
    queryFn: getAuthMe,
    enabled: shouldLoadAuth,
    staleTime: 0,
  });

  const value = useMemo<AuthContextValue>(() => {
    const user = data?.user ?? null;
    return {
      user,
      isLoading,
      isAuthenticated: user !== null,
      hasRole: (roles: readonly AppRole[]) => (user ? roles.includes(user.role) : false),
      logout: async () => {
        await apiRequest("POST", "/api/auth/logout");
        await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      },
    };
  }, [data, isLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
