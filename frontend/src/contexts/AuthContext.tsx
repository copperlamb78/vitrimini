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
  clearLegacyAuthStorage,
  clearStoredAuthSession,
  getAccessToken,
  getImpersonationToken,
  getMe,
  hasStoredSessionHint,
  isJwtTokenExpired,
  loginUser,
  logoutUser,
  markStoredSessionHint,
  refreshAuthSession,
  registerUser,
  setAccessToken,
  setImpersonationToken,
} from '../services/api';

const DRAFT_STORAGE_KEY = 'vitrimini_draft_v1';

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
  startImpersonation: (token: string, user: AuthUser) => void;
  stopImpersonation: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getAccessToken());
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(() => hasStoredSessionHint());

  const persistSession = useCallback((auth: AuthResponse) => {
    setAccessToken(auth.token);
    markStoredSessionHint();
    clearLegacyAuthStorage();
    setToken(auth.token);
    setUser(auth.user);
    setLoading(false);
  }, []);

  const stopImpersonation = useCallback(async () => {
    setImpersonationToken(null);
    const refreshed = await refreshAuthSession();
    if (refreshed) {
      setAccessToken(refreshed.token);
      setToken(refreshed.token);
      setUser(refreshed.user);
    } else {
      clearStoredAuthSession();
      setToken(null);
      setUser(null);
    }
  }, []);

  const logout = useCallback(() => {
    if (user?.isImpersonation) {
      void stopImpersonation();
      return;
    }
    setImpersonationToken(null);
    void logoutUser();
    clearStoredAuthSession();
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {
      // Ignora falhas de storage
    }
    setToken(null);
    setUser(null);
    setLoading(false);
  }, [user?.isImpersonation, stopImpersonation]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrapSession() {
      clearLegacyAuthStorage();

      const impToken = getImpersonationToken();
      if (impToken && !isJwtTokenExpired(impToken)) {
        try {
          setAccessToken(impToken);
          const res = await getMe(impToken);
          if (!cancelled) {
            setToken(impToken);
            setUser(res.user);
            setLoading(false);
          }
          return;
        } catch {
          setImpersonationToken(null);
        }
      }

      if (!hasStoredSessionHint()) {
        if (!cancelled) {
          setAccessToken(null);
          setToken(null);
          setUser(null);
          setLoading(false);
        }
        return;
      }

      const existingToken = getAccessToken();
      let activeToken =
        existingToken && !isJwtTokenExpired(existingToken) ? existingToken : null;

      if (!activeToken) {
        const refreshed = await refreshAuthSession();
        if (cancelled) return;
        if (!refreshed) {
          clearStoredAuthSession();
          setToken(null);
          setUser(null);
          setLoading(false);
          return;
        }
        activeToken = refreshed.token;
      }

      try {
        const res = await getMe(activeToken);
        if (cancelled) return;
        const latestToken = getAccessToken() || activeToken;
        setToken(latestToken);
        setUser(res.user);
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
      setAccessToken(null);
      setToken(null);
      setUser(null);
      setLoading(false);
    }

    function handleRefreshed(e: Event) {
      const detail = (e as CustomEvent<AuthResponse>).detail;
      if (detail?.token && detail?.user) {
        setAccessToken(detail.token);
        setToken(detail.token);
        setUser(detail.user);
      }
    }

    function handleStorageChange(e: StorageEvent) {
      if (e.key === AUTH_SESSION_HINT_KEY || e.key === null) {
        if (!hasStoredSessionHint()) {
          setAccessToken(null);
          setToken(null);
          setUser(null);
          setLoading(false);
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

  const startImpersonation = useCallback((impToken: string, impUser: AuthUser) => {
    setImpersonationToken(impToken);
    setAccessToken(impToken);
    setToken(impToken);
    setUser(impUser);
    setLoading(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        startImpersonation,
        stopImpersonation,
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
