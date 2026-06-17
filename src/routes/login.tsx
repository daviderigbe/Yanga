import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { API_BASE } from "@/lib/api";
import { authApi } from "@/lib/endpoints";
import { Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [userName, setUserName] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") await signIn(email, password);
      else await signUp({ email, password, name, userName });
      toast.success(mode === "signin" ? "Welcome back!" : "Account created");
      navigate({ to: "/" });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-4 py-12 md:grid-cols-2 md:py-20">
      <div className="hidden md:block">
        <div className="sticky top-24">
          <h1 className="font-display text-5xl font-black leading-tight">
            Join Africa's
            <br />
            <span className="text-primary">closet.</span>
          </h1>
          <p className="mt-4 max-w-sm text-muted-foreground">
            Buy unique pieces. Sell what you don't wear. Make money. Make magic.
          </p>
          <div className="mt-8 flex gap-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <span>★ Free to join</span>
            <span>★ Instant payouts</span>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-card p-6 shadow-card md:p-8">
        <div className="mb-6 flex rounded-full bg-secondary p-1 text-sm font-semibold">
          {(["signin", "signup"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 rounded-full py-2 transition ${mode === m ? "bg-background shadow-soft text-foreground" : "text-muted-foreground"}`}
            >
              {m === "signin" ? "Log in" : "Sign up"}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" && (
            <>
              <Field label="Full name">
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input"
                />
              </Field>
              <Field label="Username">
                <input
                  required
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="input"
                />
              </Field>
            </>
          )}
          <Field label="Email">
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Password">
            <div className="relative">
              <input
                required
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input password-input"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Field>
          <Button
            type="submit"
            disabled={busy}
            className="mt-2 h-11 w-full rounded-full text-base font-bold"
          >
            {busy ? "Please wait…" : mode === "signin" ? "Log in" : "Create account"}
          </Button>
        </form>

        <div className="mt-5 grid gap-2">
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => {
              window.location.href = `${API_BASE}${authApi.oauthUrl("google", "/")}`;
            }}
          >
            Continue with Google
          </Button>
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => {
              window.location.href = `${API_BASE}${authApi.oauthUrl("apple", "/")}`;
            }}
          >
            Continue with Apple
          </Button>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          By continuing you agree to our{" "}
          <Link to="/" className="underline">
            Terms
          </Link>
          .
        </p>
      </div>

      <style>{`.input { width:100%; height:44px; border-radius:12px; border:1px solid var(--input); background:var(--background); padding:0 14px; font-size:14px; outline:none; transition:border-color .15s; }
        .password-input { padding-right:44px; }
        .input:focus { border-color: var(--primary); }`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
