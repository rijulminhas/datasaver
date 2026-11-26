import Link from "next/link";
import type { ReactNode } from "react";

import Logo from "@/components/brand/Logo";
import { FolderIcon, ImageIcon, ShieldIcon } from "@/components/ui/icons";

interface AuthCardProps {
  title: string;
  description: string;
  children: ReactNode;
  footerText: string;
  footerLink: string;
  footerLinkText: string;
}

const highlights = [
  { icon: ImageIcon, title: "Every format", text: "Photos, videos, documents, audio and archives in one place." },
  { icon: FolderIcon, title: "Organised your way", text: "Folders, search and filters to find anything fast." },
  { icon: ShieldIcon, title: "Private by default", text: "Your files are only ever accessible to you." },
];

export default function AuthCard({
  title,
  description,
  children,
  footerText,
  footerLink,
  footerLinkText,
}: AuthCardProps) {
  return (
    <main className="flex min-h-screen w-full bg-slate-50">
      {/* Brand panel (large screens) */}
      <aside className="relative hidden w-[44%] max-w-xl flex-col justify-between overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 p-12 text-white lg:flex">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/10 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-violet-400/20 blur-3xl"
        />

        <Logo variant="light" />

        <div className="relative">
          <h2 className="text-3xl font-bold leading-tight tracking-tight xl:text-4xl">
            Your Memories. Your Files.
            <br />
            <span className="text-indigo-200">Always Yours.</span>
          </h2>
          <p className="mt-4 max-w-md text-indigo-100/90">
            A personal cloud for everything that matters — safely stored and always within reach.
          </p>

          <ul className="mt-10 space-y-5">
            {highlights.map(({ icon: Icon, title: itemTitle, text }) => (
              <li key={itemTitle} className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
                  <Icon width={20} height={20} />
                </span>
                <div>
                  <p className="font-semibold">{itemTitle}</p>
                  <p className="text-sm text-indigo-100/80">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-indigo-200/80">© DataSaver. All rights reserved.</p>
      </aside>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center lg:hidden">
            <Logo />
            <p className="mt-2 text-sm text-slate-500">Your Memories. Your Files. Always Yours.</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-8">
            <div className="mb-7">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
              <p className="mt-1.5 text-sm text-slate-500">{description}</p>
            </div>

            {children}

            <div className="mt-7 border-t border-slate-100 pt-6 text-center">
              <p className="text-sm text-slate-600">
                {footerText}{" "}
                <Link
                  href={footerLink}
                  className="font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
                >
                  {footerLinkText}
                </Link>
              </p>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-slate-400 lg:hidden">© DataSaver. All rights reserved.</p>
        </div>
      </div>
    </main>
  );
}
