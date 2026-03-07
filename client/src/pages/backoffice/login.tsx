import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, useLocation, useSearch } from "wouter";
import { LockKeyhole, LogIn, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";

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
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
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
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4" data-testid="backoffice-login-page">
      <div className="w-full max-w-md border-[4px] border-black bg-white">
        <div className="bg-black border-b-[4px] border-[#FFFF00] p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 border-[2px] border-[#FFFF00] bg-[#FFFF00] flex items-center justify-center">
              <LockKeyhole className="w-5 h-5 text-black" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-black text-[#FFFF00] leading-none">BACKOFFICE LOGIN</h1>
              <p className="font-mono text-[10px] text-white/70 uppercase tracking-wider mt-1">
                OKU Selatan Pajak Daerah
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="font-mono text-xs font-bold">USERNAME</label>
            <Input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="rounded-none border-[2px] border-black font-mono"
              autoComplete="username"
              data-testid="input-login-username"
            />
          </div>
          <div className="space-y-1.5">
            <label className="font-mono text-xs font-bold">PASSWORD</label>
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="rounded-none border-[2px] border-black font-mono"
              autoComplete="current-password"
              data-testid="input-login-password"
            />
          </div>
          <Button
            type="submit"
            disabled={loginMutation.isPending}
            className="w-full rounded-none border-[3px] border-black bg-[#FFFF00] text-black font-mono font-bold"
            data-testid="button-login-submit"
          >
            <LogIn className="w-4 h-4 mr-2" />
            {loginMutation.isPending ? "MEMPROSES..." : "MASUK"}
          </Button>

          <div className="flex items-center justify-between pt-1">
            <p className="font-mono text-[11px] text-gray-500">Gunakan akun admin/editor/viewer.</p>
            <Link href="/">
              <Button
                type="button"
                variant="outline"
                className="rounded-none border-[2px] border-black font-mono text-[11px]"
                data-testid="button-login-back-map"
              >
                <MapPin className="w-3 h-3 mr-1" />
                Peta
              </Button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
