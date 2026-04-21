import { Sidebar } from "@/components/layout/sidebar";
import { verifySession } from "@/lib/auth/dal";
import { redirect } from "next/navigation";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await verifySession();
  if (!session) redirect("/login");

  const { user } = session;

  return (
    <div className="h-full flex">
      <Sidebar user={{ name: user.name, email: user.email, avatarUrl: user.avatarUrl }} />
      <main className="flex-1 overflow-y-auto pt-14 md:pt-0">{children}</main>
    </div>
  );
}
