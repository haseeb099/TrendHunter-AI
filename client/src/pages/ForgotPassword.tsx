import { useState } from "react";
import { Link } from "wouter";
import { AuthLayout } from "@/components/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const forgotMutation = trpc.auth.forgotPassword.useMutation({
    onSuccess: () => {
      setSent(true);
      toast.success("If that email exists, we sent reset instructions.");
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter your account email and we'll send a reset link if it exists."
    >
      {sent ? (
        <div className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Check your inbox for a password reset link. It expires after 1 hour. If you don&apos;t see it,
            check spam or try again.
          </p>
          <Link href={getLoginUrl()}>
            <Button variant="outline" className="w-full">
              Back to sign in
            </Button>
          </Link>
        </div>
      ) : (
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            forgotMutation.mutate({ email: email.trim() });
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
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
          <Button type="submit" className="w-full h-11" disabled={forgotMutation.isPending}>
            {forgotMutation.isPending ? "Sending…" : "Send reset link"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Remember your password?{" "}
            <Link href={getLoginUrl()} className="text-primary font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      )}
    </AuthLayout>
  );
}
