import { POST_STATUS } from "@/lib/constants";
export function isPostEditable(post: { status: string; videoPath: string | null }) {
  return (
    !post.videoPath && (post.status === POST_STATUS.DRAFT || post.status === POST_STATUS.FAILED)
  );
}

export interface DownloadEntry {
  name: string;
  path: string;
}

export type DownloadPlan =
  | { ready: true; entries: DownloadEntry[] }
  | { ready: false; error: string };

/**
 * What a post's download archive holds, and whether it is there yet. Each post type finishes
 * into a different artifact, so the readiness rule belongs beside the file list rather than as
 * a branch in the route that zips them.
 */
export function planDownload(post: {
  type: string;
  status: string;
  videoPath: string | null;
  media: { path: string }[];
}): DownloadPlan {
  if (post.type === "CAROUSEL") {
    if (post.media.length === 0) return { ready: false, error: "Slides not ready" };

    return {
      ready: true,
      entries: post.media.map((media, index) => ({
        name: `${String(index + 1).padStart(2, "0")}.png`,
        path: media.path,
      })),
    };
  }

  if (post.status !== POST_STATUS.COMPLETED || !post.videoPath) {
    return { ready: false, error: "Video not ready" };
  }

  return { ready: true, entries: [{ name: "video.mp4", path: post.videoPath }] };
}
