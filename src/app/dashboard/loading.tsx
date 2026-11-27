import { PageSkeleton } from "@/components/ui/Loading";

// Shown inside the dashboard shell (sidebar stays visible) while a page's
// first content loads, so navigation never shows a blank area.
export default function DashboardLoading() {
  return <PageSkeleton label="Loading…" />;
}
