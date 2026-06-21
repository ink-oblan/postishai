import { CaptionGenerator } from "@/components/posts/CaptionGenerator";

export default function NewCaptionPage() {
  return (
    <div className="max-w-3xl space-y-8 px-6 py-8 sm:px-10">
      <div>
        <h1 className="font-bold text-3xl tracking-tight sm:text-4xl">Generate Caption</h1>
        <p className="mt-1.5 text-muted-foreground text-sm">
          Write a caption for content you&apos;ve already created.
        </p>
      </div>
      <CaptionGenerator />
    </div>
  );
}
