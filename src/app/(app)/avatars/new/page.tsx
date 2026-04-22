import { Suspense } from "react";
import { NewAvatarForm } from "@/components/avatars/NewAvatarForm";

export default function NewAvatarPage() {
  return (
    <div className="max-w-2xl space-y-8 px-6 py-8 sm:px-10">
      <div>
        <h1 className="font-bold text-3xl tracking-tight sm:text-4xl">New Avatar</h1>
        <p className="mt-1.5 text-muted-foreground text-sm">
          Generate with AI or upload your own image
        </p>
      </div>
      <Suspense fallback={<div className="text-muted-foreground text-sm">Loading form…</div>}>
        <NewAvatarForm />
      </Suspense>
    </div>
  );
}
