import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { requireSession } from "@/lib/auth/dal";
import { fetchDashboardData } from "@/lib/dashboard-utils";

export default async function DashboardPage() {
  const { userId } = await requireSession();
  const initialData = await fetchDashboardData(userId);
  return <DashboardClient initialData={initialData} />;
}
