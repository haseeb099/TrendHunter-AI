import { useEffect, useState } from "react";

import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";

import { AuthLayout } from "@/components/AuthLayout";

import { trpc } from "@/lib/trpc";

import { getRegisterUrl } from "@/const";

import { toast } from "sonner";



function useRedirectPath() {

  if (typeof window === "undefined") return "/dashboard";

  const params = new URLSearchParams(window.location.search);

  const redirect = params.get("redirect");

  return redirect?.startsWith("/") ? redirect : "/dashboard";

}



export default function Login() {

  const [, navigate] = useLocation();

  const redirectPath = useRedirectPath();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) navigate(redirectPath);
  }, [loading, user, navigate, redirectPath]);

  const utils = trpc.useUtils();

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");



  const loginMutation = trpc.auth.login.useMutation({

    onSuccess: async () => {

      await utils.auth.me.invalidate();

      toast.success("Welcome back!");

      navigate(redirectPath);

    },

    onError: (error) => {

      toast.error(error.message || "Login failed");

    },

  });



  return (

    <AuthLayout title="Welcome back" subtitle="Sign in to continue to your dashboard">

      <form

        className="space-y-5"

        onSubmit={(e) => {

          e.preventDefault();

          loginMutation.mutate({ email, password });

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

        <div className="space-y-2">

          <Label htmlFor="password">Password</Label>

          <Input

            id="password"

            type="password"

            autoComplete="current-password"

            value={password}

            onChange={(e) => setPassword(e.target.value)}

            className="input-elegant"

            required

          />

        </div>

        <Button type="submit" className="w-full h-11" disabled={loginMutation.isPending}>

          {loginMutation.isPending ? "Signing in…" : "Sign in"}

        </Button>

      </form>



      <p className="text-center text-sm text-muted-foreground pt-2">

        No account?{" "}

        <Link href={getRegisterUrl(redirectPath)} className="text-primary font-medium hover:underline">

          Create one

        </Link>

      </p>

    </AuthLayout>

  );

}


