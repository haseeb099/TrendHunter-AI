import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AuthLayout } from "@/components/AuthLayout";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";
import { safeRedirectPath } from "@/lib/safeRedirect";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

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
  const [inviteCode, setInviteCode] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);

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
  const betaInviteRequired = configQuery.data?.betaRequiresInvite === true;

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
          if (!acceptedTerms) {
            toast.error("Please accept the Terms of Service and Privacy Policy");
            return;
          }
          registerMutation.mutate({
            email,
            password,
            name: name.trim() || undefined,
            acceptedTerms: true,
            acceptedPrivacy: true,
            ...(betaInviteRequired ? { inviteCode: inviteCode.trim() } : {}),
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
        {betaInviteRequired ? (
          <div className="space-y-2">
            <Label htmlFor="inviteCode">Beta invite code</Label>
            <Input
              id="inviteCode"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              className="input-elegant"
              placeholder="Enter your invite code"
              required
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              TrendHunter is in private beta. Use the code from your invite email.
            </p>
          </div>
        ) : null}
        <div className="flex items-start gap-3">
          <Checkbox
            id="terms"
            checked={acceptedTerms}
            onCheckedChange={(v) => setAcceptedTerms(v === true)}
            className="mt-0.5"
          />
          <Label htmlFor="terms" className="text-sm font-normal leading-snug text-muted-foreground">
            I agree to the{" "}
            <Link href="/terms" className="text-primary hover:underline" target="_blank">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-primary hover:underline" target="_blank">
              Privacy Policy
            </Link>
          </Label>
        </div>
        <Button
          type="submit"
          className="w-full h-11"
          disabled={
            registerMutation.isPending ||
            !acceptedTerms ||
            (betaInviteRequired && !inviteCode.trim())
          }
        >
          {registerMutation.isPending ? "Creating account…" : "Create account & start trial"}
        </Button>
        {configQuery.data?.googleLoginEnabled ? (
          <>
            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">or</span>
              </div>
            </div>
            <GoogleSignInButton redirectPath={redirectPath} label="Sign up with Google" />
          </>
        ) : null}
      </form>

      <p className="text-center text-xs text-muted-foreground leading-relaxed">
        Your trial includes full Pro access. We&apos;ll never share your email without consent.
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
