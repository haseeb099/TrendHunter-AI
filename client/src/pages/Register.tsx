import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthLayout } from "@/components/AuthLayout";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";
import { safeRedirectPath } from "@/lib/safeRedirect";

function useRedirectPath() {
  if (typeof window === "undefined") return "/dashboard/billing?welcome=1";
  const params = new URLSearchParams(window.location.search);
  return safeRedirectPath(params.get("redirect"), "/dashboard/billing?welcome=1");
}

export default function Register() {
  const [, navigate] = useLocation();
  const redirectPath = useRedirectPath();
  const { user, loading } = useAuth();
  const configQuery = trpc.system.getConfig.useQuery();

  useEffect(() => {
    if (!loading && user) navigate(redirectPath);
  }, [loading, user, navigate, redirectPath]);

  const utils = trpc.useUtils();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      toast.success("Welcome to TrendHunter! Your Pro trial is ready.");
      navigate(redirectPath);
    },
    onError: (error) => {
      toast.error(error.message || "Registration failed");
    },
  });

  const registrationOpen = configQuery.data?.registrationEnabled !== false;

  if (configQuery.isLoading) {
    return (
      <AuthLayout title="Create your account" subtitle="Setting things up…">
        <p className="text-sm text-muted-foreground text-center py-8">Loading…</p>
      </AuthLayout>
    );
  }

  if (!registrationOpen) {
    return (
      <AuthLayout
        title="Registration closed"
        subtitle="New sign-ups are temporarily paused. Sign in if you already have an account."
      >
        <div className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            We're not accepting new accounts right now. Please check back later or contact support.
          </p>
          <Link href={getLoginUrl("/dashboard")}>
            <Button className="w-full">Sign in instead</Button>
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start your free Pro trial instantly — no credit card required."
    >
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          registerMutation.mutate({
            email,
            password,
            name: name.trim() || undefined,
          });
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="name">Full name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-elegant"
            placeholder="Your name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Work email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-elegant"
            placeholder="you@company.com"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-elegant"
            minLength={8}
            required
          />
          <p className="text-xs text-muted-foreground">At least 8 characters</p>
        </div>
        <Button type="submit" className="w-full h-11" disabled={registerMutation.isPending}>
          {registerMutation.isPending ? "Creating account…" : "Create account & start trial"}
        </Button>
      </form>

      <p className="text-center text-xs text-muted-foreground leading-relaxed">
        By creating an account you agree to our terms of service. Your trial includes full Pro access.
      </p>

      <p className="text-center text-sm text-muted-foreground pt-2">
        Already have an account?{" "}
        <Link href={getLoginUrl(redirectPath)} className="text-primary font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
