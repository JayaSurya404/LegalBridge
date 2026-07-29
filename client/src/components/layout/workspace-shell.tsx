"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  BarChart3,
  BriefcaseBusiness,
  ChevronLeft,
  ChevronRight,
  FileStack,
  LayoutDashboard,
  LogOut,
  Menu,
  RefreshCw,
  Settings,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { LegalBridgeLogo } from "@/components/brand/legalbridge-logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";

const mainNavigation = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Cases", href: "/cases", icon: BriefcaseBusiness },
  { label: "Observability", href: "/observability", icon: BarChart3 },
  { label: "Settings", href: "/settings", icon: Settings },
];

function Navigation({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const selectedCaseId = useAppStore((state) => state.selectedCaseId);
  const cases = useAppStore((state) => state.cases);
  const currentCase = cases.find((record) => record.id === selectedCaseId);

  return (
    <>
      <div className={cn("px-4 py-5", collapsed && "px-3")}>
        <LegalBridgeLogo compact={collapsed} inverse />
      </div>
      {!collapsed && currentCase && (
        <div className="mx-3 mb-4 rounded-xl border border-white/10 bg-white/5 p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-300">Current case</p>
          <p className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-white">{currentCase.title}</p>
          <p className="mt-1 truncate text-xs text-slate-400">{currentCase.reference}</p>
        </div>
      )}
      <nav aria-label="Primary navigation" className="flex-1 space-y-1 px-2">
        {mainNavigation.map((item) => {
          const active =
            pathname === item.href ||
            (item.href === "/cases" && pathname.startsWith("/cases/"));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400",
                active
                  ? "bg-white text-[var(--navy)]"
                  : "text-slate-300 hover:bg-white/10 hover:text-white",
                collapsed && "justify-center px-0",
              )}
            >
              <item.icon className="size-5 shrink-0" aria-hidden="true" />
              {!collapsed && item.label}
            </Link>
          );
        })}
      </nav>
      {!collapsed && (
        <div className="m-3 rounded-xl border border-amber-300/20 bg-amber-300/10 p-3 text-xs leading-5 text-amber-100">
          <FileStack className="mb-2 size-4" aria-hidden="true" />
          Cases, private originals, and extracted pages persist to the local API. Legal analysis remains synthetic.
        </div>
      )}
    </>
  );
}

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const hydrated = useAppStore((state) => state.hydrated);
  const sessionRestored = useAppStore((state) => state.sessionRestored);
  const sessionRestoring = useAppStore((state) => state.sessionRestoring);
  const authenticated = useAppStore((state) => state.authenticated);
  const currentUser = useAppStore((state) => state.currentUser);
  const workspaceLoading = useAppStore((state) => state.workspaceLoading);
  const workspaceReady = useAppStore((state) => state.workspaceReady);
  const workspaceError = useAppStore((state) => state.workspaceError);
  const settings = useAppStore((state) => state.settings);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const restoreSession = useAppStore((state) => state.restoreSession);
  const logout = useAppStore((state) => state.logout);
  const clearSession = useAppStore((state) => state.clearSession);
  const refreshWorkspace = useAppStore((state) => state.refreshWorkspace);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!useAppStore.persist.hasHydrated()) {
      void useAppStore.persist.rehydrate();
    } else if (!hydrated) {
      useAppStore.getState().setHydrated(true);
    }
  }, [hydrated]);

  useEffect(() => {
    if (hydrated && !sessionRestored && !sessionRestoring) {
      void restoreSession();
    }
  }, [hydrated, restoreSession, sessionRestored, sessionRestoring]);

  useEffect(() => {
    const handleClearedSession = () => clearSession();
    window.addEventListener("legalbridge:session-cleared", handleClearedSession);
    return () =>
      window.removeEventListener(
        "legalbridge:session-cleared",
        handleClearedSession,
      );
  }, [clearSession]);

  useEffect(() => {
    if (hydrated && sessionRestored && !authenticated) {
      const destination = `${pathname}${searchParams.size ? `?${searchParams.toString()}` : ""}`;
      router.replace(`/sign-in?next=${encodeURIComponent(destination)}`);
    }
  }, [
    authenticated,
    hydrated,
    pathname,
    router,
    searchParams,
    sessionRestored,
  ]);

  useEffect(() => {
    if (
      hydrated &&
      sessionRestored &&
      authenticated &&
      !workspaceReady &&
      !workspaceLoading
    ) {
      void refreshWorkspace();
    }
  }, [
    authenticated,
    hydrated,
    refreshWorkspace,
    sessionRestored,
    workspaceLoading,
    workspaceReady,
  ]);

  const breadcrumb = useMemo(() => {
    const segments = pathname.split("/").filter(Boolean);
    return segments
      .map((segment) =>
        segment
          .replaceAll("-", " ")
          .replace(/^case synthetic property 001$/, "Synthetic case")
          .replace(/\b\w/g, (letter) => letter.toUpperCase()),
      )
      .join(" / ");
  }, [pathname]);

  if (
    !hydrated ||
    !sessionRestored ||
    sessionRestoring ||
    (authenticated && !workspaceReady) ||
    !authenticated
  ) {
    return (
      <main className="grid min-h-screen place-items-center bg-[var(--cream)] p-6" aria-live="polite">
        <div className="text-center">
          <LegalBridgeLogo />
          <p className="mt-4 text-sm text-[var(--slate)]">Restoring and verifying the backend session…</p>
        </div>
      </main>
    );
  }

  const collapsed = settings.sidebarCollapsed;

  return (
    <div className="min-h-screen bg-[var(--warm-white)]">
      <aside
        aria-label="Primary navigation"
        className={cn(
          "no-print fixed inset-y-0 left-0 z-30 hidden flex-col bg-[var(--navy)] transition-[width] lg:flex",
          collapsed ? "w-20" : "w-64",
        )}
      >
        <Navigation collapsed={collapsed} />
        <button
          type="button"
          className="absolute -right-4 top-20 grid size-8 place-items-center rounded-full border border-[var(--border)] bg-white text-[var(--navy)] shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
          onClick={() => updateSettings({ sidebarCollapsed: !collapsed })}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
        </button>
      </aside>

      <DialogPrimitive.Root open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-[#071426]/65 lg:hidden" />
          <DialogPrimitive.Content className="fixed inset-y-0 left-0 z-50 flex w-[min(20rem,88vw)] flex-col bg-[var(--navy)] shadow-2xl focus:outline-none lg:hidden">
            <DialogPrimitive.Title className="sr-only">Workspace navigation</DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">
              Navigate the LegalBridge India frontend demonstration.
            </DialogPrimitive.Description>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-3 grid size-10 place-items-center rounded-lg text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              aria-label="Close navigation"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
            <Navigation collapsed={false} onNavigate={() => setMobileOpen(false)} />
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      <div className={cn("transition-[padding] lg:pl-64", collapsed && "lg:pl-20")}>
        <header
          aria-label="Workspace toolbar"
          className="no-print sticky top-0 z-20 flex min-h-16 items-center justify-between gap-3 border-b border-[var(--border)] bg-white/95 px-4 backdrop-blur sm:px-6"
        >
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="size-5" aria-hidden="true" />
            </Button>
            <p className="truncate text-xs font-semibold text-[var(--slate)] sm:text-sm" aria-label={`Breadcrumb: ${breadcrumb}`}>
              {breadcrumb || "Dashboard"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={workspaceLoading}
              onClick={() => void refreshWorkspace()}
              aria-label="Refresh persistent workspace"
            >
              <RefreshCw
                className={`size-4 ${workspaceLoading ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <span className="hidden text-right text-xs text-[var(--slate)] md:inline">
              <span className="block font-semibold text-[var(--navy)]">
                {currentUser?.fullName}
              </span>
              <span className="capitalize">{currentUser?.role}</span>
            </span>
            <Button
              variant="ghost"
              size="sm"
              aria-label="Sign out"
              disabled={signingOut}
              onClick={() => {
                setSigningOut(true);
                void logout().finally(() => {
                  router.replace("/sign-in");
                  setSigningOut(false);
                });
              }}
            >
              <LogOut className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </header>
        <main id="main-content" className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8">
          {workspaceError && (
            <div
              role="alert"
              className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-900"
            >
              {workspaceError} Persisted local display state remains visible; no mock fallback was used.
            </div>
          )}
          {children}
        </main>
        <footer className="no-print border-t border-[var(--border)] px-6 py-4 text-center text-xs leading-5 text-[var(--slate)]">
          Attorney-assistance hackathon prototype · Real case persistence · Synthetic legal analysis · Not final legal advice · Not automatically filed
        </footer>
      </div>
    </div>
  );
}
