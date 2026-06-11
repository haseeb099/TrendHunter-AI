import { useMemo, useState } from "react";
import { Link } from "wouter";
import { AuthLayout } from "@/components/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";

function useResetToken() {
  return useMemo(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("token")?.trim() ?? "";
  }, []);
}

export default function ResetPassword() {
  const token = useResetToken();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const resetMutation = trpc.auth.resetPassword.useMutation({
    onSuccess: () => {
      toast.success("Password updated — sign in with your new password.");
    },
    onError: (err) => toast.error(err.message),
  });

  if (!token) {
    return (
      <AuthLayout title="Invalid reset link" subtitle="This link is missing or expired.">
        <div className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            Request a new password reset from the sign-in page.
          </p>
          <Link href="/forgot-password">
            <Button className="w-full">Request new link</Button>
          </Link>
        </div>
      </AuthLayout>
    );
  }

  if (resetMutation.isSuccess) {
    return (
      <AuthLayout title="Password updated" subtitle="You can now sign in with your new password.">
        <Link href={getLoginUrl()}>
          <Button className="w-full">Sign in</Button>
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Choose a new password" subtitle="Must be at least 8 characters.">
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (password !== confirm) {
            toast.error("Passwords do not match");
            return;
          }
          resetMutation.mutate({ token, newPassword: password });
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
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
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm password</Label>
          <Input
            id="confirm"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="input-elegant"
            minLength={8}
            required
          />
        </div>
        <Button type="submit" className="w-full h-11" disabled={resetMutation.isPending}>
          {resetMutation.isPending ? "Updating…" : "Update password"}
        </Button>
      </form>
    </AuthLayout>
  );
}
