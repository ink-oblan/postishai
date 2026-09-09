import { CarouselWizard } from "@/components/posts/carousel/CarouselWizard";

export default function NewCarouselPage() {
  return (
    <div className="max-w-3xl space-y-8 px-6 py-8 sm:px-10">
      <div>
        <h1 className="font-bold text-3xl tracking-tight sm:text-4xl">Carousel</h1>
        <p className="mt-1.5 text-muted-foreground text-sm">
          Plan the slides, then generate and tweak the design.
        </p>
      </div>
      <CarouselWizard />
    </div>
  );
}
