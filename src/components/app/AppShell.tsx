"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useState, type ReactNode } from "react";

import { NAV_SECTIONS } from "@/components/app/nav";
import Logo from "@/components/brand/Logo";
import { MenuIcon, SpinnerIcon, XIcon } from "@/components/ui/icons";
import { ToastProvider } from "@/components/ui/Toast";

interface AppShellProps {
  children: ReactNode;
  /** Server-rendered user menu (streams in behind Suspense). */
  userMenu: ReactNode;
  /** Server-rendered storage meter for the sidebar footer. */
  storageWidget: ReactNode;
}

/** Spinner shown on a nav link while its page is loading (fixed size: no layout shift). */
function NavPendingHint() {
  const { pending } = useLinkStatus();
  return (
    <span className={`ml-auto transition-opacity ${pending ? "opacity-100" : "opacity-0"}`} aria-hidden="true">
      <SpinnerIcon width={14} height={14} className="text-indigo-500" />
    </span>
  );
}

function isActive(pathname: string | null, href: string) {
  if (pathname === null) return false;
  return href === "/dashboard" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * The nav links. pathname = null renders them without an active highlight
 * (used as the Suspense fallback while the URL is not known yet).
 */
function NavLinks({ pathname, onNavigate }: { pathname: string | null; onNavigate?: () => void }) {
  return (
    <>
        {NAV_SECTIONS.map((section, index) => (
          <div key={section.title ?? index}>
            {section.title && (
              <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {section.title}
              </p>
            )}
            <ul className="space-y-0.5">
              {section.items.map(({ label, href, icon: Icon }) => {
                const active = isActive(pathname, href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        active
                          ? "bg-indigo-50 text-indigo-700"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      <Icon width={18} height={18} className={active ? "text-indigo-600" : "text-slate-400"} />
                      {label}
                      <NavPendingHint />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
    </>
  );
}

/**
 * Reads the URL for the active highlight. Under Cache Components the URL of a
 * route with a dynamic segment (e.g. /dashboard/folders/[id]) is runtime data,
 * so usePathname() must sit inside <Suspense> or it blocks prerendering.
 */
function ActiveNavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return <NavLinks pathname={pathname} onNavigate={onNavigate} />;
}

function SidebarContent({ storageWidget, onNavigate }: { storageWidget: ReactNode; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center px-5">
        <Logo href="/dashboard" />
      </div>

      <nav aria-label="Main" className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        <Suspense fallback={<NavLinks pathname={null} onNavigate={onNavigate} />}>
          <ActiveNavLinks onNavigate={onNavigate} />
        </Suspense>
      </nav>

      <div className="shrink-0 border-t border-slate-200 p-4">{storageWidget}</div>
    </div>
  );
}

export default function AppShell({ children, userMenu, storageWidget }: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close the mobile drawer with Escape and lock page scroll while it's open.
  useEffect(() => {
    if (!drawerOpen) return;
    const onKeyDown = (e: KeyboardEvent) => e.key === "Escape" && setDrawerOpen(false);
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [drawerOpen]);

  return (
    <ToastProvider>
    <div className="min-h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200 bg-white lg:block">
        <SidebarContent storageWidget={storageWidget} />
      </aside>

      {/* Mobile drawer */}
      <div className={`fixed inset-0 z-40 lg:hidden ${drawerOpen ? "" : "pointer-events-none"}`} aria-hidden={!drawerOpen}>
        <div
          onClick={() => setDrawerOpen(false)}
          className={`absolute inset-0 bg-slate-900/40 transition-opacity duration-200 ${drawerOpen ? "opacity-100" : "opacity-0"}`}
        />
        <aside
          id="mobile-sidebar"
          inert={!drawerOpen}
          className={`absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-white shadow-xl transition-transform duration-200 ${
            drawerOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close navigation"
            className="absolute right-3 top-3.5 rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          >
            <XIcon width={18} height={18} />
          </button>
          <SidebarContent
            storageWidget={storageWidget}
            onNavigate={() => setDrawerOpen(false)}
          />
        </aside>
      </div>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation"
            aria-controls="mobile-sidebar"
            aria-expanded={drawerOpen}
            className="-ml-1 rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
          >
            <MenuIcon width={20} height={20} />
          </button>
          <div className="lg:hidden">
            <Logo href="/dashboard" />
          </div>
          <div className="ml-auto">{userMenu}</div>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">{children}</main>
      </div>
    </div>
    </ToastProvider>
  );
}
