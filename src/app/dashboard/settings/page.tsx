import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";

import LogoutButton from "@/components/auth/LogoutButton";
import PageHeader from "@/components/dashboard/PageHeader";
import StorageUsage from "@/components/dashboard/StorageUsage";
import { requireUser } from "@/lib/auth/dal";
import { getStorageOverview } from "@/lib/files/overview";

export const metadata: Metadata = {
  title: "Settings",
};

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" description="Manage your account, storage and security." />
      <div className="max-w-3xl space-y-6">
        <Section title="Account" description="Your name and email address.">
          <Link
            href="/dashboard/profile"
            className="inline-flex rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            View profile
          </Link>
        </Section>

        <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white" />}>
          <StorageSection />
        </Suspense>

        <Section title="Session" description="Sign out of DataSaver on this device.">
          <div className="w-fit">
            <LogoutButton className="border border-red-200 px-4" />
          </div>
        </Section>
      </div>
    </>
  );
}

async function StorageSection() {
  const user = await requireUser();
  const overview = await getStorageOverview(user.id);
  return (
    <StorageUsage
      usedBytes={overview.usedBytes}
      quotaBytes={overview.quotaBytes}
      byCategory={overview.byCategory}
      trash={overview.trash}
    />
  );
}

function Section({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div>
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      {children}
    </section>
  );
}
