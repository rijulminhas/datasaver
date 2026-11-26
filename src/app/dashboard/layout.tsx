import { Suspense } from "react";

import AppShell from "@/components/app/AppShell";
import UserMenu from "@/components/auth/UserMenu";
import SidebarStorage, { SidebarStorageSkeleton } from "@/components/dashboard/SidebarStorage";
import { requireUser } from "@/lib/auth/dal";

// The shell (sidebar, header) is static and prerendered; everything that
// reads the session streams in behind Suspense. requireUser() redirects to
// /login if the session is missing or expired.
export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <AppShell
      userMenu={
        <Suspense fallback={<div className="h-11 w-11 animate-pulse rounded-full bg-slate-100 sm:w-40" />}>
          <HeaderUser />
        </Suspense>
      }
      storageWidget={
        <Suspense fallback={<SidebarStorageSkeleton />}>
          <SidebarStorage />
        </Suspense>
      }
    >
      {children}
    </AppShell>
  );
}

async function HeaderUser() {
  const user = await requireUser();
  return <UserMenu name={user.name} email={user.email} />;
}
