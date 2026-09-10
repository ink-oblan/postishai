import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { verifySession } from "@/lib/auth/dal";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await verifySession();
  if (!session) redirect("/login");
  if (!session.user.approvedAt) redirect("/pending-approval");

  const { user } = session;

  return (
    <div className="flex h-full">
      <Sidebar
        user={{
          id: user.id,
          name: user.name,
          email: user.email,
          avatarUrl: user.avatarUrl,
          role: user.role,
        }}
      />
      <main className="relative flex-1 overflow-y-auto pt-14 md:pt-0">{children}</main>
    </div>
  );
}
