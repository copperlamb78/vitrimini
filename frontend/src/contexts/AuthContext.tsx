import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import type { AuthResponse, AuthUser } from '../types/catalog';
import {
  AUTH_TOKEN_KEY,
  getMe,
  loginUser,
  registerUser,
} from '../services/api';

const AUTH_USER_KEY = 'vitrimini_auth_user';
const LEGACY_SAVED_CATALOGS_KEY = 'vitrimini_saved_catalogs';

interface RegisterInput {
  name: string;
  email: string;
  phone: string;
  password: string;
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(AUTH_TOKEN_KEY)
  );
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const raw = localStorage.getItem(AUTH_USER_KEY);
      return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState<boolean>(Boolean(token));

  const persistSession = useCallback((auth: AuthResponse) => {
    localStorage.setItem(AUTH_TOKEN_KEY, auth.token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(auth.user));
    setToken(auth.token);
    setUser(auth.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    // Limpa chave legada do sistema antigo sem login
    localStorage.removeItem(LEGACY_SAVED_CATALOGS_KEY);

    if (!token) {
      setLoading(false);
      return;
    }

    getMe(token)
      .then((res) => {
        setUser(res.user);
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(res.user));
      })
      .catch(() => {
        logout();
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token, logout]);

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
