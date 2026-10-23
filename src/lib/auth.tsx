import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getToken, setToken } from "./api";
import { authApi } from "./endpoints";

interface User {
  id: string;
  email: string;
  name: string;
  userName?: string;
  emailVerified: boolean;
  bio?: string;
  imageUrl?: string;
}
interface AuthCtx {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: {
    email: string;
    password: string;
    confirmPassword: string;
    name: string;
    userName: string;
  }) => Promise<{ requiresEmailVerification?: boolean; user?: User }>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}
const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const r = (await authApi.me()) as { data: { user: User } };
      setUser(r.data?.user ?? null);
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    (async () => {
      await refresh();
      setLoading(false);
    })();
  }, []);

  const signIn = async (email: string, password: string) => {
    const r = (await authApi.signin({ email, password })) as any;
    const token = r?.data?.token || r?.data?.accessToken || r?.token;
    if (token) setToken(token);
    setUser(r?.data?.user ?? null);
    if (!r?.data?.user) await refresh();
  };

  const signUp: AuthCtx["signUp"] = async (input) => {
    const r = (await authApi.signup({
      email: input.email,
      password: input.password,
      confirmPassword: input.confirmPassword,
      name: input.name,
      username: input.userName,
    })) as any;
    const token = r?.data?.token || r?.data?.accessToken;
    if (token) setToken(token);
    if (token && r?.data?.user) setUser(r.data.user);
    else if (!r?.data?.requiresEmailVerification) {
      setUser(r?.data?.user ?? null);
      if (!r?.data?.user) await refresh();
    }
    return {
      requiresEmailVerification: r?.data?.requiresEmailVerification,
      user: r?.data?.user,
    };
  };

  const signOut = async () => {
    try {
      await authApi.signout();
    } catch {
      // Still clear local auth state if the server-side sign-out request fails.
    }
    setToken(null);
    setUser(null);
  };

  // hydrate token from storage on first paint (already used in api())
  useEffect(() => {
    void getToken();
  }, []);

  return (
    <Ctx.Provider value={{ user, loading, signIn, signUp, signOut, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth outside AuthProvider");
  return v;
}
