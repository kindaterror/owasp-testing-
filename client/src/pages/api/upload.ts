// == IMPORTS & DEPENDENCIES ==
import type { IncomingMessage, ServerResponse } from "http";
import busboy, { BusboyConfig } from "busboy";
import type { Busboy as BusboyInstance } from "busboy";
import { v2 as cloudinary } from "cloudinary";
import crypto from "crypto";

// == API CONFIGURATION ==
// (Used by Next-like runtimes; harmless under Express passthrough)
export const config = {
  api: { bodyParser: false },
};

// == CLOUDINARY SETUP ==
if (
  !process.env.CLOUDINARY_CLOUD_NAME ||
  !process.env.CLOUDINARY_API_KEY ||
  !process.env.CLOUDINARY_API_SECRET
) {
  // eslint-disable-next-line no-console
  console.warn(
    "[upload.ts] Missing Cloudinary env vars. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET."
  );
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME ?? "",
  api_key: process.env.CLOUDINARY_API_KEY ?? "",
  api_secret: process.env.CLOUDINARY_API_SECRET ?? "",
});

// == TYPES ==
type MultipartResult = {
  fields: Record<string, string>;
  fileBuffer?: Buffer;
  filename?: string;
  mimetype?: string;
};

// == HELPERS ==
function parseMultipart(req: IncomingMessage): Promise<MultipartResult> {
  return new Promise((resolve, reject) => {
    const bb: BusboyInstance = busboy({ headers: req.headers } as BusboyConfig);
    const fields: Record<string, string> = {};

    let fileBuffer: Buffer | undefined;
    let filename: string | undefined;
    let mimetype: string | undefined;

    bb.on("file", (_name, file, info: { filename: string; mimeType: string }) => {
      filename = info.filename;
      mimetype = info.mimeType;

      const chunks: Buffer[] = [];
      file.on("data", (d: Buffer) => chunks.push(d));
      file.on("limit", () => reject(new Error("File too large")));
      file.on("end", () => {
        fileBuffer = Buffer.concat(chunks);
      });
    });

    bb.on("field", (name: string, val: string) => {
      fields[name] = val;
    });

    bb.on("error", reject);
    bb.on("finish", () => resolve({ fields, fileBuffer, filename, mimetype }));

    req.pipe(bb);
  });
}

function pickFolder(kind?: string, customFolder?: string) {
  if (customFolder) return customFolder;
  switch ((kind || "").toLowerCase()) {
    case "avatar":
      return "ilaw/avatars";
    case "book_cover":
      return "ilaw/books/covers";
    case "page_image":
      return "ilaw/books/pages/images";
    case "page_audio":
      return "ilaw/books/pages/audio";
    default:
      return "ilaw/misc";
  }
}

function makePublicId(kind?: string, provided?: string, filename?: string) {
  if (provided) return provided;
  const base = (filename || "upload").replace(/\.[^.]+$/, ""); // strip extension
  const rand = crypto.randomBytes(4).toString("hex");
  return `${(kind || "asset").toLowerCase()}-${Date.now()}-${rand}-${base}`.slice(0, 120);
}

function uploadToCloudinary(
  file: Buffer,
  folder: string,
  publicId: string
): Promise<{
  secure_url: string;
  public_id: string;
  asset_id?: string;
  bytes?: number;
  format?: string;
  resource_type?: string;
  original_filename?: string;
}> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        overwrite: true,
        resource_type: "auto", // auto-detect image/audio/etc.
      },
      (err, result) => {
        if (err || !result) return reject(err || new Error("Upload failed"));
        resolve({
          secure_url: result.secure_url,
          public_id: result.public_id,
          asset_id: (result as any).asset_id,
          bytes: (result as any).bytes,
          format: (result as any).format,
          resource_type: (result as any).resource_type,
          original_filename: (result as any).original_filename,
        });
      }
    );
    stream.end(file);
  });
}

const IMAGE_MIMES = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
const AUDIO_MIMES = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/ogg", "audio/aac"];

// == MAIN API HANDLER ==
export default async function handler(
  req: IncomingMessage & { query?: any },
  res: ServerResponse & { status?: (code: number) => any; json?: (data: any) => any }
) {
  // Response helpers for plain Node types
  if (!res.status) {
    res.status = (code: number) => {
      res.statusCode = code;
      return res;
    };
  }
  if (!res.json) {
    res.json = (data: any) => {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(data));
      return res;
    };
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  // Validate Cloudinary env
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    return res.status(500).json({
      success: false,
      error:
        "Cloudinary not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.",
    });
  }

  try {
    const { fields, fileBuffer, filename, mimetype } = await parseMultipart(req);

    if (!fileBuffer || fileBuffer.length === 0) {
      return res.status(400).json({ success: false, error: "No file received" });
    }

    // Validation: size + mime (gentle defaults)
    const MAX_MB = Number(fields.maxMb || 5); // allow override
    if (fileBuffer.length > MAX_MB * 1024 * 1024) {
      return res.status(400).json({ success: false, error: `File too large (>${MAX_MB}MB)` });
    }

    const kind = (fields.kind || "").toLowerCase();
    if (kind === "avatar" || kind === "book_cover" || kind === "page_image") {
      if (mimetype && !IMAGE_MIMES.includes(mimetype)) {
        return res
          .status(400)
          .json({ success: false, error: "Invalid image type. Use JPEG, PNG, GIF, or WebP." });
      }
    } else if (kind === "page_audio") {
      if (mimetype && !AUDIO_MIMES.includes(mimetype)) {
        return res
          .status(400)
          .json({ success: false, error: "Invalid audio type. Use MP3, WAV, OGG, or AAC." });
      }
    }

    const folder = pickFolder(kind, fields.folder);
    const publicId = makePublicId(kind, fields.publicId, filename);

    const uploaded = await uploadToCloudinary(fileBuffer, folder, publicId);

    return res.status(200).json({
      success: true,
      kind: kind || "asset",
      folder,
      filename,
      mimetype,
      // Persist these if needed:
      url: uploaded.secure_url,
      publicId: uploaded.public_id,
      // Extras:
      assetId: uploaded.asset_id,
      bytes: uploaded.bytes,
      format: uploaded.format,
      resourceType: uploaded.resource_type,
      originalFilename: uploaded.original_filename,
    });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error("Upload error:", err);
    return res.status(500).json({
      success: false,
      error: err?.message || "Error uploading file",
    });
  }
}