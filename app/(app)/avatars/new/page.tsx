import { Suspense } from "react";
import { NewAvatarForm } from "@/components/avatars/NewAvatarForm";

export default function NewAvatarPage() {
  return (
    <div className="px-6 py-8 sm:px-10 max-w-2xl space-y-8">
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">New Avatar</h1>
        <p className="text-sm text-muted-foreground mt-1.5">Generate with AI or upload your own image</p>
      </div>
      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading form…</div>}>
        <NewAvatarForm />
      </Suspense>
    </div>
  );
}
