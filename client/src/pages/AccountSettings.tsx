import { useEffect, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { usePlan } from "@/_core/hooks/usePlan";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { getDashboardPath } from "@/config/dashboardNav";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import {
  CreditCard,
  KeyRound,
  Mail,
  Shield,
  User,
} from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function AccountSettings() {
  const { user } = useAuth();
  const { displayName, isTrial, daysLeftInTrial, role } = usePlan();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const [name, setName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (user?.name) setName(user.name);
  }, [user?.name]);

  const updateProfile = trpc.auth.updateProfile.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      toast.success("Profile updated");
    },
    onError: (e) => toast.error(e.message),
  });

  const changePassword = trpc.auth.changePassword.useMutation({
    onSuccess: (data) => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password updated — sign in again with your new password");
      if (data.requireReLogin) {
        window.location.href = getLoginUrl("/dashboard/account");
      }
    },
    onError: (e) => toast.error(e.message),
  });

  const handlePasswordChange = () => {
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    changePassword.mutate({ currentPassword, newPassword });
  };

  if (!user) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="space-y-8 fade-up">
      <PageHeader
        title="Account settings"
        description="Manage your profile, credentials, and workspace identity."
      />

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card-elevated p-5 lg:col-span-2 space-y-5">
          <p className="font-medium text-sm flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            Profile
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="account-name">Display name</Label>
              <Input
                id="account-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-elegant"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="account-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="account-email"
                  value={user.email ?? ""}
                  disabled
                  className="input-elegant pl-9 opacity-80"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">Email changes require support contact.</p>
            </div>
          </div>
          <Button
            disabled={!name.trim() || updateProfile.isPending}
            onClick={() => updateProfile.mutate({ name: name.trim() })}
          >
            {updateProfile.isPending ? <Spinner className="w-4 h-4" /> : "Save profile"}
          </Button>
        </div>

        <div className="card-elevated p-5 space-y-4">
          <p className="font-medium text-sm">Membership</p>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Plan</span>
              <span className="font-medium">{displayName}</span>
            </div>
            {isTrial && daysLeftInTrial !== null ? (
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Trial</span>
                <Badge variant="outline">{daysLeftInTrial}d left</Badge>
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Role</span>
              {role === "admin" ? (
                <Badge className="gap-1">
                  <Shield className="w-3 h-3" />
                  Admin
                </Badge>
              ) : (
                <Badge variant="outline">Member</Badge>
              )}
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Status</span>
              <Badge variant="outline" className="capitalize">
                {user.accountStatus}
              </Badge>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setLocation(getDashboardPath("billing"))}
          >
            <CreditCard className="w-4 h-4" />
            Manage billing
          </Button>
        </div>
      </div>

      <div className="card-elevated p-5 space-y-4 max-w-2xl">
        <p className="font-medium text-sm flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-primary" />
          Change password
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="current-password">Current password</Label>
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="input-elegant"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="input-elegant"
              minLength={8}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-password">Confirm new password</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input-elegant"
              minLength={8}
            />
          </div>
        </div>
        <Button
          variant="outline"
          disabled={
            changePassword.isPending ||
            !currentPassword ||
            newPassword.length < 8 ||
            newPassword !== confirmPassword
          }
          onClick={handlePasswordChange}
        >
          {changePassword.isPending ? <Spinner className="w-4 h-4" /> : "Update password"}
        </Button>
      </div>
    </div>
  );
}
