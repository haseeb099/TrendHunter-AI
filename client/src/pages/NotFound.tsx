import { Button } from "@/components/ui/button";
import { Home, SearchX } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-svh flex items-center justify-center bg-background p-6">
      <div className="surface-elevated max-w-md w-full p-10 text-center">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-muted/40 text-muted-foreground">
          <SearchX className="h-5 w-5" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">
          404
        </p>
        <h1 className="font-display text-xl font-semibold mb-2">Page not found</h1>
        <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist or was moved.
        </p>
        <Link href="/">
          <Button>
            <Home className="h-4 w-4" />
            Back to home
          </Button>
        </Link>
      </div>
    </div>
  );
}
