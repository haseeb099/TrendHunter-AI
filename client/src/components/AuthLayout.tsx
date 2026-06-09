import { AppLogo } from "@/components/AppLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Link } from "wouter";

type AuthLayoutProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
};

export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <div className="min-h-svh grid lg:grid-cols-[1.05fr_1fr] bg-background">
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden p-12 auth-panel">
        <Link href="/" className="relative z-10">
          <AppLogo inverted />
        </Link>

        <div className="relative z-10 max-w-md space-y-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">
            Commerce research OS
          </p>
          <h2 className="font-display text-[2.5rem] font-semibold leading-[1.1] text-balance text-white">
            The workspace for finding products that actually sell
          </h2>
          <p className="text-white/60 text-base leading-relaxed">
            Search marketplaces, validate with AI, and manage your pipeline —
            without the noise of scattered tools.
          </p>
          <div className="flex gap-8 pt-2">
            {[
              { value: "4+", label: "Marketplaces" },
              { value: "AI", label: "Validation" },
              { value: "∞", label: "Pipeline items" },
            ].map((s) => (
              <div key={s.label}>
                <p className="font-display text-2xl font-semibold text-white">{s.value}</p>
                <p className="text-[11px] text-white/40 uppercase tracking-wider mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-sm text-white/35">
          Trusted by dropshippers, brand operators, and growth teams.
        </p>
      </div>

      <div className="flex flex-col min-h-svh">
        <div className="flex items-center justify-between p-4 sm:p-6 lg:justify-end">
          <Link href="/" className="lg:hidden">
            <AppLogo size="sm" />
          </Link>
          <ThemeToggle />
        </div>

        <div className="flex flex-1 items-center justify-center px-4 pb-10 sm:px-8">
          <div className="w-full max-w-[420px] space-y-8">
            <div className="space-y-2 text-center lg:text-left">
              <h1 className="font-display text-2xl font-semibold tracking-tight">{title}</h1>
              <p className="text-sm text-muted-foreground leading-relaxed">{subtitle}</p>
            </div>
            <div className="surface-elevated p-8 sm:p-9">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
