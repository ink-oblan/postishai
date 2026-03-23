import { NewAvatarForm } from "@/components/avatars/NewAvatarForm";

export default function NewAvatarPage() {
  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">New Avatar</h1>
        <p className="text-sm text-muted-foreground mt-1">Generate with AI or upload your own image</p>
      </div>
      <NewAvatarForm />
    </div>
  );
}
