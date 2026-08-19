import React from "react";

export interface User {
  id: string;
  email: string;
  role: string;
  name?: string;
  phone?: string;
  workspace?: string;
}

export const AuthContext = React.createContext<{
  token: string | null;
  user: User | null;
  login: (token: string, user?: User) => void;
  updateUser: (patch: Partial<User>) => void;
  logout: (expired?: boolean) => void;
}>({
  token: null,
  user: null,
  login: () => {},
  updateUser: () => {},
  logout: () => {},
});

function isValidJwt(token: string | null): boolean {
  if (!token || typeof token !== "string" || token === "null" || token === "undefined") {
    return false;
  }
  const parts = token.trim().split(".");
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
    return false;
  }
  try {
    const payload = JSON.parse(atob(parts[1]));
    if (payload.exp && typeof payload.exp === "number") {
      // If expired, consider invalid
      if (payload.exp * 1000 < Date.now()) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [token, setToken] = React.useState<string | null>(() => {
    const saved = localStorage.getItem("admin_token") || localStorage.getItem("token");
    if (!isValidJwt(saved)) {
      if (saved) {
        localStorage.removeItem("admin_token");
        localStorage.removeItem("token");
      }
      return null;
    }
    return saved;
  });
  
  const [user, setUser] = React.useState<User | null>(() => {
    const saved = localStorage.getItem("user_info");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (!parsed.role) parsed.role = 'admin'; // fallback for old data
        return parsed;
      } catch (e) {
        // ignore
      }
    }
    const savedToken = localStorage.getItem("admin_token") || localStorage.getItem("token");
    if (isValidJwt(savedToken) && savedToken) {
      try {
        const payload = JSON.parse(atob(savedToken.split('.')[1]));
        return {
          id: payload.id,
          email: payload.email,
          role: payload.role || 'admin',
          name: payload.name
        };
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const login = (newToken: string, newUser?: User) => {
    if (!isValidJwt(newToken)) {
      console.error("[Auth] Attempted to login with invalid token format");
      return;
    }

    localStorage.setItem("admin_token", newToken);
    sessionStorage.removeItem("admin_token_expired");
    setToken(newToken);

    let resolvedUser: User | null = null;
    if (newUser) {
      resolvedUser = {
        ...newUser,
        role: newUser.role || 'admin'
      };
    } else {
      try {
        const payload = JSON.parse(atob(newToken.split('.')[1]));
        resolvedUser = {
          id: payload.id || '',
          email: payload.email || '',
          role: payload.role || 'admin',
          name: payload.name
        };
      } catch (e) {
        resolvedUser = null;
      }
    }

    if (resolvedUser) {
      localStorage.setItem("user_info", JSON.stringify(resolvedUser));
      setUser(resolvedUser);
    }
  };

  const logout = (expired = false) => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("token");
    localStorage.removeItem("user_info");
    if (expired) {
      sessionStorage.setItem("admin_token_expired", "true");
    }
    setToken(null);
    setUser(null);
  };

  const updateUser = React.useCallback((patch: Partial<User>) => {
    setUser((current) => {
      if (!current) return current;
      const next = { ...current, ...patch };
      localStorage.setItem("user_info", JSON.stringify(next));
      return next;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, login, updateUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => React.useContext(AuthContext);
