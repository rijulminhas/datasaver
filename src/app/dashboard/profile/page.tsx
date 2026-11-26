import type { Metadata } from "next";
import { Suspense } from "react";

import PageHeader from "@/components/dashboard/PageHeader";
import { CalendarIcon, MailIcon, UserIcon } from "@/components/ui/icons";
import { getProfile } from "@/lib/auth/dal";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "Profile",
};

export default function ProfilePage() {
  return (
    <>
      <PageHeader title="Profile" description="Your personal account details." />
      <Suspense fallback={<div className="h-72 animate-pulse rounded-2xl border border-slate-200 bg-white" />}>
        <ProfileCard />
      </Suspense>
    </>
  );
}

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?";
}

async function ProfileCard() {
  const profile = await getProfile();

  const rows = [
    { icon: UserIcon, label: "Full name", value: profile.name },
    { icon: MailIcon, label: "Email address", value: profile.email },
    { icon: CalendarIcon, label: "Member since", value: formatDate(profile.createdAt) },
  ];

  return (
    <section className="max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="h-24 bg-gradient-to-r from-indigo-600 to-violet-600" />
      <div className="px-5 pb-6 sm:px-8">
        <div className="-mt-10 flex items-end gap-4">
          <span className="flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-white bg-indigo-100 text-2xl font-bold text-indigo-700 shadow-sm">
            {initialsOf(profile.name)}
          </span>
        </div>
        <h2 className="mt-4 text-xl font-semibold text-slate-900">{profile.name}</h2>
        <p className="text-sm text-slate-500">{profile.email}</p>

        <dl className="mt-6 divide-y divide-slate-100 border-t border-slate-100">
          {rows.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:gap-6">
              <dt className="flex w-44 shrink-0 items-center gap-2 text-sm font-medium text-slate-500">
                <Icon width={16} height={16} className="text-slate-400" />
                {label}
              </dt>
              <dd className="min-w-0 break-words text-sm text-slate-900">{value}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-2 text-xs text-slate-400">Editing your name and email will be available in a later update.</p>
      </div>
    </section>
  );
}
