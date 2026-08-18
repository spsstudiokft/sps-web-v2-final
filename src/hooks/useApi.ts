import { useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";

export function useApi() {
  const { token, logout } = useAuth();

  const fetchApi = useCallback(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      
      const response = await fetch(input, { ...init, headers });
      
      if (response.status === 401) {
        logout(true);
        throw new Error("Unauthorized");
      }
      
      return response;
    },
    [token, logout]
  );

  return { fetchApi };
}
