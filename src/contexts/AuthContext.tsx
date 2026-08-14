import React, {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { DeviceVerificationRequired, User } from "../domain/user";
import { authService } from "../services/AuthService";
import { sessionStorage } from "../storage/sessionStorage";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signIn: (
    email: string,
    password: string,
  ) => Promise<User | DeviceVerificationRequired>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      setUser(await authService.currentUser());
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    authService
      .hasSession()
      .then((hasSession) => (hasSession ? refreshUser() : undefined))
      .finally(() => setLoading(false));
  }, [refreshUser]);

  useEffect(() => sessionStorage.onCleared(() => setUser(null)), []);

  const signIn = useCallback(async (email: string, password: string) => {
    const result = await authService.login(email, password);
    if ("verificationRequired" in result) return result;
    const authenticatedUser = result.data ?? result;
    setUser(authenticatedUser);
    return authenticatedUser;
  }, []);

  const signOut = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, signIn, signOut, refreshUser }),
    [loading, refreshUser, signIn, signOut, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context)
    throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return context;
}
