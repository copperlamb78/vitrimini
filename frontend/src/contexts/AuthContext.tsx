import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import type { AuthResponse, AuthUser } from '../types/catalog';
import {
  AUTH_SESSION_HINT_KEY,
  AUTH_TOKEN_KEY,
  AUTH_USER_KEY,
  clearStoredAuthSession,
  getMe,
  isJwtTokenExpired,
  loginUser,
  logoutUser,
  refreshAuthSession,
  registerUser,
} from '../services/api';

interface RegisterInput {
  name: string;
  email: string;
  phone: string;
  password: string;
  acceptTerms: boolean;
}

interface LoginInput {
  email: string;
  password: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (input: LoginInput) => Promise<AuthResponse>;
  register: (input: RegisterInput) => Promise<AuthResponse>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readInitialToken(): string | null {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

function hasSessionHint(): boolean {
  try {
    return (
      localStorage.getItem(AUTH_SESSION_HINT_KEY) === '1' ||
      Boolean(localStorage.getItem(AUTH_TOKEN_KEY))
    );
  } catch {
    return false;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    const raw = readInitialToken();
    if (!raw || isJwtTokenExpired(raw)) return null;
    return raw;
  });
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(() => hasSessionHint());

  const persistSession = useCallback((auth: AuthResponse) => {
    localStorage.setItem(AUTH_TOKEN_KEY, auth.token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(auth.user));
    localStorage.setItem(AUTH_SESSION_HINT_KEY, '1');
    setToken(auth.token);
    setUser(auth.user);
    setLoading(false);
  }, []);

  const logout = useCallback(() => {
    void logoutUser();
    clearStoredAuthSession();
    setToken(null);
    setUser(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrapSession() {
      const storedToken = readInitialToken();
      const shouldTryRefresh = hasSessionHint();

      if (!storedToken && !shouldTryRefresh) {
        if (!cancelled) {
          setUser(null);
          setLoading(false);
        }
        return;
      }

      if (!storedToken || isJwtTokenExpired(storedToken)) {
        const refreshed = await refreshAuthSession();
        if (cancelled) return;
        if (refreshed) {
          setToken(refreshed.token);
          setUser(refreshed.user);
          setLoading(false);
          return;
        }
        clearStoredAuthSession();
        setToken(null);
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const res = await getMe(storedToken);
        if (cancelled) return;
        const latestToken = readInitialToken() || storedToken;
        setToken(latestToken);
        setUser(res.user);
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(res.user));
      } catch {
        if (cancelled) return;
        clearStoredAuthSession();
        setToken(null);
        setUser(null);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void bootstrapSession();

    return () => {
      cancelled = true;
    };
  }, []);

  // Sincronia entre abas (storage), refresh silencioso (auth:refreshed) e 401 (auth:logout)
  useEffect(() => {
    function handleForceLogout() {
      setToken(null);
      setUser(null);
      setLoading(false);
    }

    function handleRefreshed(e: Event) {
      const detail = (e as CustomEvent<AuthResponse>).detail;
      if (detail?.token && detail?.user) {
        setToken(detail.token);
        setUser(detail.user);
      }
    }

    function handleStorageChange(e: StorageEvent) {
      if (
        e.key === AUTH_TOKEN_KEY ||
        e.key === AUTH_USER_KEY ||
        e.key === AUTH_SESSION_HINT_KEY ||
        e.key === null
      ) {
        const currentToken = localStorage.getItem(AUTH_TOKEN_KEY);
        if (!currentToken || isJwtTokenExpired(currentToken)) {
          setToken(null);
          setUser(null);
          setLoading(false);
        } else {
          setToken(currentToken);
        }
      }
    }

    window.addEventListener('auth:logout', handleForceLogout);
    window.addEventListener('auth:refreshed', handleRefreshed);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('auth:logout', handleForceLogout);
      window.removeEventListener('auth:refreshed', handleRefreshed);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const login = useCallback(
    async (input: LoginInput) => {
      const res = await loginUser(input);
      persistSession(res);
      return res;
    },
    [persistSession]
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      const res = await registerUser(input);
      persistSession(res);
      return res;
    },
    [persistSession]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return ctx;
}
