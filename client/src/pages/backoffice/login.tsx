import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, useLocation, useSearch } from "wouter";
import { LockKeyhole, LogIn, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { regionConfig } from "@/lib/region-config";

type LoginResponse = {
  user: {
    id: string;
    username: string;
    role: "admin" | "editor" | "viewer";
  };
};

export default function BackofficeLogin() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const nextPath = useMemo(() => {
    const raw = new URLSearchParams(search).get("next");
    if (!raw || !raw.startsWith("/")) {
      return "/backoffice";
    }
    return raw;
  }, [search]);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      setLocation(nextPath);
    }
  }, [isAuthenticated, isLoading, nextPath, setLocation]);

  const loginMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/auth/login", {
        username,
        password,
      });
      return (await response.json()) as LoginResponse;
    },
    onSuccess: async (result) => {
      queryClient.setQueryData(["/api/auth/me"], result);
      void queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setLocation(nextPath);
    },
    onError: (error: Error) => {
      toast({
        title: "Login gagal",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast({
        title: "Form belum lengkap",
        description: "Username dan password wajib diisi",
        variant: "destructive",
      });
      return;
    }
    loginMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" data-testid="backoffice-login-page">
      <div className="w-full max-w-md rounded-2xl bg-background shadow-floating overflow-hidden">
        <div className="bg-[#2d3436] p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-background shadow-floating">
              <LockKeyhole className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="font-sans text-xl font-bold text-white">{regionConfig.brand.backofficeLoginTitle}</h1>
              <p className="font-mono text-[10px] text-white/50 uppercase tracking-[0.15em] mt-0.5">
                {regionConfig.brand.backofficeLoginSubtitle}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-1.5">
            <label htmlFor="login-username" className="font-mono text-xs font-bold uppercase tracking-wide text-muted-foreground">
              USERNAME
            </label>
            <Input
              id="login-username"
              name="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="masukkan username…"
              spellCheck={false}
              autoComplete="username"
              data-testid="input-login-username"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="login-password" className="font-mono text-xs font-bold uppercase tracking-wide text-muted-foreground">
              PASSWORD
            </label>
            <Input
              id="login-password"
              name="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="masukkan password…"
              autoComplete="current-password"
              data-testid="input-login-password"
            />
          </div>
          <Button
            type="submit"
            disabled={loginMutation.isPending}
            className="w-full"
            data-testid="button-login-submit"
          >
            <LogIn className="w-4 h-4" aria-hidden="true" />
            {loginMutation.isPending ? "MEMPROSES…" : "MASUK"}
          </Button>

          <div className="flex items-center justify-between pt-1">
            <p className="font-mono text-[11px] text-muted-foreground">Gunakan akun admin/editor/viewer.</p>
            <Link href="/">
              <Button
                type="button"
                variant="outline"
                className="font-mono text-[11px]"
                data-testid="button-login-back-map"
              >
                <MapPin className="w-3 h-3 mr-1" aria-hidden="true" />
                Peta
              </Button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
