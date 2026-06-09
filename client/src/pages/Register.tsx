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



function useRedirectPath() {

  if (typeof window === "undefined") return "/dashboard";

  const params = new URLSearchParams(window.location.search);

  const redirect = params.get("redirect");

  return redirect?.startsWith("/") ? redirect : "/dashboard";

}



export default function Register() {

  const [, navigate] = useLocation();

  const redirectPath = useRedirectPath();
  const { user, loading } = useAuth();

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

      toast.success("Account created!");

      navigate(redirectPath);

    },

    onError: (error) => {

      toast.error(error.message || "Registration failed");

    },

  });



  return (

    <AuthLayout title="Create your account" subtitle="Start researching products in minutes">

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

          <Label htmlFor="name">Name</Label>

          <Input

            id="name"

            value={name}

            onChange={(e) => setName(e.target.value)}

            className="input-elegant"

            placeholder="Optional"

          />

        </div>

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

          {registerMutation.isPending ? "Creating account…" : "Create account"}

        </Button>

      </form>



      <p className="text-center text-sm text-muted-foreground pt-2">

        Already have an account?{" "}

        <Link href={getLoginUrl(redirectPath)} className="text-primary font-medium hover:underline">

          Sign in

        </Link>

      </p>

    </AuthLayout>

  );

}


