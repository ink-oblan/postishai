import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitApprovalDetails } from "@/lib/auth/actions";
import { verifySession } from "@/lib/auth/dal";
import { deleteSession } from "@/lib/auth/session";

async function logout() {
  "use server";

  await deleteSession();
  redirect("/login");
}

export default async function PendingApprovalPage({
  searchParams,
}: {
  searchParams: Promise<{ details?: string }>;
}) {
  const session = await verifySession();
  const { details } = await searchParams;

  if (!session) redirect("/login");
  if (session.user.approvedAt) redirect("/dashboard");

  return (
    <div className="w-full max-w-xl space-y-8">
      <div className="space-y-3 text-center">
        <h1 className="font-bold text-2xl">Thanks for signing up 🥳🎉</h1>
        <p className="text-muted-foreground text-sm leading-6">
          Thanks for signing up for the beta testing. Your account will be approved soon.
        </p>
      </div>

      <form action={submitApprovalDetails} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="useCaseDetails">Add details for approval</Label>
          <Textarea
            id="useCaseDetails"
            name="useCaseDetails"
            defaultValue={session.user.approvalDetails || ""}
            placeholder="Tell us why you want access and how you plan to use the platform."
            className="min-h-32 resize-none"
          />
        </div>
        {details === "sent" && (
          <p className="text-center text-muted-foreground text-sm">Details sent for review.</p>
        )}
        {details === "invalid" && (
          <p className="text-center text-destructive text-sm">
            Please add at least a short note before sending.
          </p>
        )}
        <Button type="submit" size="lg" className="w-full">
          Send details
        </Button>
      </form>

      <form action={logout} className="text-center">
        <Button type="submit" variant="ghost">
          Sign out
        </Button>
      </form>
    </div>
  );
}
