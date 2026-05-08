<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:runtime-log-files -->
# Runtime log files
Use this files for debugging:
- `dev.log` stores the local Next.js dev server output.
- `worker.log` stores the local worker process output.
<!-- END:runtime-log-files -->

<!-- BEGIN:api-integration-rules -->
# Always check API references before integrating

Never guess or trial-and-error external API request/response shapes. Before writing any integration code:

1. Fetch the official API reference for the specific endpoint (method, path, request body, response shape).
2. Confirm field names, types, and accepted values directly from the docs — do not rely on training data, as APIs change.
3. If docs are unavailable, state that explicitly and flag any assumptions made.

Known API references for this project:
- **HeyGen simple video** (`POST /v2/videos`): https://docs.heygen.com/reference/create-video-1.md
- **HeyGen studio video** (`POST /v2/video/generate`): https://docs.heygen.com/reference/create-an-avatar-video-v2.md
- **Google GenAI SDK**: `node_modules/@google/genai/dist/genai.d.ts`
<!-- END:api-integration-rules -->

<!-- BEGIN:ai-prompt-location -->
# AI prompts belong in src/app/api/prompts

Always store prompt text sent to AI services or models in `src/app/api/prompts`. Do not inline AI prompt prose in route handlers, libraries, workers, or components; load and render a prompt template from `src/app/api/prompts` instead.
<!-- END:ai-prompt-location -->

<!-- BEGIN:ffmpeg-video-processing -->
# Video post-processing with ffmpeg

HeyGen-generated videos have ~4px near-white border pillars on the left and right edges (confirmed via pixel sampling — x=0–3 and x=1076–1079 are ~RGB(248,245,250) on 1080px wide output). These are baked in by HeyGen and cannot be suppressed via API parameters.

## Chosen approach: mirror-fill edge pixels + re-encode

Replace the white border with the adjacent valid content pixels (hstack of left-edge slice + cropped center + right-edge slice), keeping output at 1080×1920.

## ffmpeg command

```bash
ffmpeg -i input.mp4 \
  -vf "split=3[a][b][c]; \
       [a]crop=4:ih:4:0[lf]; \
       [b]crop=1072:ih:4:0[mid]; \
       [c]crop=4:ih:1072:0[rf]; \
       [lf][mid][rf]hstack=inputs=3" \
  -c:v h264_nvenc -preset p1 -cq 28 \
  -c:a copy \
  output.mp4
```

**Encoding choice: `h264_nvenc -preset p1 -cq 28`**
- Requires NVIDIA GPU (`h264_nvenc`)
- ~1.5s for a 15s video (~5x faster than CPU)
- Output ~5.8M vs ~9.8M input (smaller due to re-encode at cq=28)
- Visually identical to cq=24 for talking-head videos

## CPU fallback (no GPU)

If deploying to a non-GPU server, replace the encoder flags:

```bash
  -c:v libx264 -preset ultrafast -crf 23
```

- ~1.9s for a 15s video
- Output ~9.9M (similar to input size)
- No hardware dependency
<!-- END:ffmpeg-video-processing -->

<!-- BEGIN:prisma-schema-changes -->
# After every Prisma schema change

Run both commands before writing any code that uses the new fields:

```bash
npx prisma migrate dev --name <migration_name>
npx prisma generate
```

`migrate dev` applies the migration to the database. `generate` regenerates the Prisma client — without it, the new fields are unknown at runtime and queries will fail.
<!-- END:prisma-schema-changes -->

<!-- BEGIN:branching-and-deploy -->
# Branching & deployment model

- **Direct pushes to `main` are prohibited.** All changes reach `main` via pull requests.
- **Deployments are triggered by semver release tags** matching `v<major>.<minor>.<patch>` (e.g. `v0.1.0`, `v1.2.3`). Pushing a tag triggers the GitHub Actions deploy workflow; pushing to `main` alone does not deploy.
- To release: merge all PRs to `main`, then on the `main` branch run:
  ```bash
  npm version 0.1.0
  git push && git push --tags
  ```
  `npm version` bumps `package.json`/`package-lock.json`, commits, and creates the `v0.1.0` tag in one step. The subsequent push sends both the commit and the tag to origin.
- Docker images are tagged with `latest`, the semver tag (e.g. `v0.1.0`), and the commit SHA.
<!-- END:branching-and-deploy -->
