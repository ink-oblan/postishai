import type { Platform } from "@prisma/client";
import { CAROUSEL_STAGE, POST_STATUS } from "@/lib/constants";
import { ScenarioEditor, type ScenarioSlideRow } from "./ScenarioEditor";
import { ScenarioPlanning } from "./ScenarioPlanning";
import type { EditorSlide } from "./SlideEditor";
import { SlideEditor } from "./SlideEditor";

interface CarouselPostViewProps {
  postId: string;
  platform: Platform;
  platformLabel: string;
  carouselStage: string | null;
  status: string;
  slideCount: number | null;
  errorMessage: string | null;
  generationStartedAt: string | null;
  scenarioSlides: ScenarioSlideRow[];
  editorSlides: EditorSlide[];
  logoAssetId: string | null;
  uploadedFonts: { assetId: string; name: string }[];
}

export function CarouselPostView({
  postId,
  platform,
  platformLabel,
  carouselStage,
  status,
  slideCount,
  errorMessage,
  generationStartedAt,
  scenarioSlides,
  editorSlides,
  logoAssetId,
  uploadedFonts,
}: CarouselPostViewProps) {
  if (carouselStage === CAROUSEL_STAGE.SCENARIO) {
    // The plan is written by the worker, so the slides only exist once it has finished.
    if (status === POST_STATUS.GENERATING || status === POST_STATUS.FAILED) {
      return (
        <ScenarioPlanning
          postId={postId}
          platformLabel={platformLabel}
          slideCount={slideCount}
          status={status}
          errorMessage={errorMessage}
          startedAt={generationStartedAt}
        />
      );
    }

    return <ScenarioEditor postId={postId} platform={platform} initialSlides={scenarioSlides} />;
  }

  if (carouselStage === CAROUSEL_STAGE.EDITING) {
    return (
      <SlideEditor
        postId={postId}
        platform={platform}
        initialSlides={editorSlides}
        logoAssetId={logoAssetId}
        uploadedFonts={uploadedFonts}
      />
    );
  }

  return null;
}
