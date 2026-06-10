import { useEffect, useState } from "react";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminLoading } from "@/components/admin/AdminLoading";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Bell, Brain, CreditCard, Mail, Save, Settings2, Wrench } from "lucide-react";
import { toast } from "sonner";

export default function AdminSettingsTab() {
  const utils = trpc.useUtils();
  const settingsQuery = trpc.admin.getSettings.useQuery();

  const [trialDays, setTrialDays] = useState("3");
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [announcementBanner, setAnnouncementBanner] = useState("");
  const [announcementType, setAnnouncementType] = useState<"info" | "warning" | "success">("info");
  const [supportEmail, setSupportEmail] = useState("");
  const [aiFeaturesEnabled, setAiFeaturesEnabled] = useState(true);
  const [selfServeBilling, setSelfServeBilling] = useState(false);

  useEffect(() => {
    if (!settingsQuery.data) return;
    const s = settingsQuery.data;
    setTrialDays(String(s.trial_days));
    setRegistrationEnabled(s.registration_enabled);
    setMaintenanceMode(s.maintenance_mode);
    setMaintenanceMessage(s.maintenance_message);
    setAnnouncementBanner(s.announcement_banner);
    setAnnouncementType(s.announcement_type);
    setSupportEmail(s.support_email);
    setAiFeaturesEnabled(s.ai_features_enabled);
    setSelfServeBilling(s.self_serve_billing);
  }, [settingsQuery.data]);

  const updateSettings = trpc.admin.updateSettings.useMutation({
    onSuccess: async () => {
      await utils.admin.getSettings.invalidate();
      await utils.system.getConfig.invalidate();
      toast.success("Platform settings saved");
    },
    onError: (e) => toast.error(e.message),
  });

  const save = () =>
    updateSettings.mutate({
      trial_days: Number(trialDays),
      registration_enabled: registrationEnabled,
      maintenance_mode: maintenanceMode,
      maintenance_message: maintenanceMessage,
      announcement_banner: announcementBanner,
      announcement_type: announcementType,
      support_email: supportEmail,
      ai_features_enabled: aiFeaturesEnabled,
      self_serve_billing: selfServeBilling,
    });

  if (settingsQuery.isLoading) return <AdminLoading label="Loading platform settings…" />;
  if (settingsQuery.isError) {
    return (
      <AdminEmptyState
        title="Could not load settings"
        description={settingsQuery.error.message}
      />
    );
  }

  return (
    <div className="space-y-8 admin-stagger max-w-3xl">
      <AdminPageHeader
        title="Platform settings"
        description="Global switches for access, messaging, and feature availability across the entire product."
        icon={Settings2}
        actions={
          <Button disabled={updateSettings.isPending} onClick={save}>
            {updateSettings.isPending ? <Spinner className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            Save all
          </Button>
        }
      />

      <div className="admin-settings-group">
        <p className="font-medium text-sm flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-primary" />
          Access & trials
        </p>

        <div className="space-y-1.5 max-w-xs">
          <Label className="text-xs">Default trial length (days)</Label>
          <Input
            type="number"
            min={1}
            max={90}
            value={trialDays}
            onChange={(e) => setTrialDays(e.target.value)}
            className="input-elegant h-9"
          />
        </div>

        <label className="admin-toggle-row">
          <div>
            <p className="text-sm font-medium">Allow new registrations</p>
            <p className="text-xs text-muted-foreground mt-0.5">Close sign-ups without affecting existing users.</p>
          </div>
          <Switch checked={registrationEnabled} onCheckedChange={setRegistrationEnabled} />
        </label>

        <label className="admin-toggle-row">
          <div>
            <p className="text-sm font-medium flex items-center gap-2">
              <Brain className="w-4 h-4" />
              AI features enabled
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Kill switch for all AI tools. Admins retain access.</p>
          </div>
          <Switch checked={aiFeaturesEnabled} onCheckedChange={setAiFeaturesEnabled} />
        </label>

        <label className="admin-toggle-row">
          <div>
            <p className="text-sm font-medium flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Self-serve billing
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Allow users to change paid plans from billing. Keep off until Stripe checkout is wired.
            </p>
          </div>
          <Switch checked={selfServeBilling} onCheckedChange={setSelfServeBilling} />
        </label>
      </div>

      <div className="admin-settings-group">
        <p className="font-medium text-sm flex items-center gap-2">
          <Wrench className="w-4 h-4 text-primary" />
          Maintenance
        </p>

        <label className="admin-toggle-row">
          <div>
            <p className="text-sm font-medium">Maintenance mode</p>
            <p className="text-xs text-muted-foreground mt-0.5">Blocks workspace access for all non-admin users.</p>
          </div>
          <Switch checked={maintenanceMode} onCheckedChange={setMaintenanceMode} />
        </label>

        {maintenanceMode ? (
          <div className="space-y-1.5">
            <Label className="text-xs">Maintenance message</Label>
            <Textarea
              value={maintenanceMessage}
              onChange={(e) => setMaintenanceMessage(e.target.value)}
              rows={3}
              className="input-elegant resize-none text-sm"
              placeholder="We're performing scheduled maintenance…"
            />
          </div>
        ) : null}
      </div>

      <div className="admin-settings-group">
        <p className="font-medium text-sm flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" />
          User-facing messaging
        </p>

        <div className="space-y-1.5">
          <Label className="text-xs">Announcement banner</Label>
          <Textarea
            value={announcementBanner}
            onChange={(e) => setAnnouncementBanner(e.target.value)}
            rows={2}
            className="input-elegant resize-none text-sm"
            placeholder="Shown at the top of every user's workspace. Leave empty to hide."
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Banner style</Label>
            <Select value={announcementType} onValueChange={(v) => setAnnouncementType(v as typeof announcementType)}>
              <SelectTrigger className="input-elegant h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="success">Success</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" />
              Support email
            </Label>
            <Input
              type="email"
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
              className="input-elegant h-9"
              placeholder="support@yourcompany.com"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
