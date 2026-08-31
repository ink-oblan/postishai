import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/dal";
import {
  BRAND_ASSET_EXTENSIONS,
  brandAssetStoragePath,
  fileExtension,
  isBrandAssetType,
  MAX_BRAND_ASSET_FILES_PER_REQUEST,
  MAX_BRAND_ASSET_SIZE_BYTES,
  MAX_BRAND_UPLOAD_BODY_BYTES,
  sanitizeAssetFileName,
} from "@/lib/brand-assets";
import { prisma } from "@/lib/db";
import { writeFile } from "@/lib/storage";

function megabytes(bytes: number): string {
  return `${Math.round(bytes / 1024 / 1024)}MB`;
}

export const POST = withAuth(async function POST(request: NextRequest, _context, { userId }) {
  // Reject oversized bodies before `formData()` buffers them into memory. A missing or
  // unparseable Content-Length is refused rather than waved through: without it there is
  // nothing to check the body against until it has already been buffered.
  const contentLengthHeader = request.headers.get("content-length");
  const contentLength = contentLengthHeader === null ? Number.NaN : Number(contentLengthHeader);
  if (!Number.isInteger(contentLength) || contentLength <= 0) {
    return NextResponse.json({ error: "A valid Content-Length is required" }, { status: 411 });
  }
  if (contentLength > MAX_BRAND_UPLOAD_BODY_BYTES) {
    return NextResponse.json(
      { error: `Upload exceeds the ${megabytes(MAX_BRAND_UPLOAD_BODY_BYTES)} limit` },
      { status: 413 },
    );
  }

  const formData = await request.formData();
  const files = formData.getAll("files").filter((v): v is File => v instanceof File);
  const fileType = formData.get("fileType");

  if (!isBrandAssetType(fileType)) {
    return NextResponse.json({ error: "Invalid fileType" }, { status: 400 });
  }

  if (!files.length) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  if (files.length > MAX_BRAND_ASSET_FILES_PER_REQUEST) {
    return NextResponse.json(
      { error: `At most ${MAX_BRAND_ASSET_FILES_PER_REQUEST} files per request` },
      { status: 400 },
    );
  }

  const acceptedExtensions = BRAND_ASSET_EXTENSIONS[fileType];
  const maxFileSize = MAX_BRAND_ASSET_SIZE_BYTES[fileType];

  let totalBytes = 0;
  for (const file of files) {
    if (!acceptedExtensions.includes(fileExtension(file.name))) {
      return NextResponse.json(
        { error: `${fileType} files must be one of: ${acceptedExtensions.join(", ")}` },
        { status: 400 },
      );
    }
    if (file.size > maxFileSize) {
      return NextResponse.json(
        { error: `"${file.name}" exceeds the ${megabytes(maxFileSize)} limit` },
        { status: 413 },
      );
    }
    totalBytes += file.size;
  }

  if (totalBytes > MAX_BRAND_UPLOAD_BODY_BYTES) {
    return NextResponse.json(
      { error: `Upload exceeds the ${megabytes(MAX_BRAND_UPLOAD_BODY_BYTES)} limit` },
      { status: 413 },
    );
  }

  const uploadedFiles = [];
  const batchTimestamp = Date.now();

  for (const [index, file] of files.entries()) {
    // Offset by index so files uploaded within the same millisecond don't overwrite each other.
    const timestamp = batchTimestamp + index;
    const storagePath = brandAssetStoragePath(userId, fileType, file.name, timestamp);
    const fileName = sanitizeAssetFileName(file.name);

    // Row first: a row without a file only makes the asset 404, but a file without a row is
    // untracked and nothing can ever find it again.
    const asset = await prisma.brandAsset.create({
      data: { userId, type: fileType, storagePath, fileName, sizeBytes: file.size },
    });

    try {
      await writeFile(storagePath, Buffer.from(await file.arrayBuffer()));
    } catch (error) {
      await prisma.brandAsset.delete({ where: { id: asset.id } }).catch(() => null);
      throw error;
    }

    uploadedFiles.push({
      id: asset.id,
      name: fileName,
      size: file.size,
      type: file.type,
    });
  }

  return NextResponse.json({ files: uploadedFiles });
});
