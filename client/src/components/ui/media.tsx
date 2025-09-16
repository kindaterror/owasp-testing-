// src/components/shared/media.tsx
import React, { useMemo, useState } from "react";
import { User as UserIcon, BookOpen as BookIcon, Image as ImageIcon } from "lucide-react";

/** tiny className joiner (no external deps) */
function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/** quick url check (prevents broken <img src="null">) */
function isHttpUrl(url?: string | null) {
  if (!url) return false;
  return /^https?:\/\//i.test(url);
}

/* =======================
 * AvatarImg
 * ======================= */
export type AvatarImgProps = {
  /** Prefer `src`; `url` kept for backward compat */
  src?: string | null;
  url?: string | null; // legacy alias
  /** pixel size of the avatar (width & height). Default: 40 */
  size?: number;
  /** accessible alt; falls back to initials if provided */
  alt?: string;
  /** First + last name (used to derive initials fallback) */
  firstName?: string | null;
  lastName?: string | null;
  /** extra classNames */
  className?: string;
  /** show a subtle ring/border */
  ring?: boolean;
};

export const AvatarImg: React.FC<AvatarImgProps> = ({
  src,
  url,
  size = 40,
  alt = "User avatar",
  firstName,
  lastName,
  className,
  ring = true,
}) => {
  const [failed, setFailed] = useState(false);

  const initials = useMemo(() => {
    const f = (firstName || "").trim();
    const l = (lastName || "").trim();
    const a = (f ? f[0] : "") + (l ? l[0] : "");
    return a.toUpperCase() || undefined;
  }, [firstName, lastName]);

  // accept src first, then url as a fallback for older calls
  const raw = src ?? url ?? undefined;
  const hasImg = isHttpUrl(raw) && !failed;

  return (
    <div
      className={cx(
        "relative inline-flex items-center justify-center rounded-full overflow-hidden bg-brand-amber text-ilaw-navy",
        ring && "ring-1 ring-black/5",
        className
      )}
      style={{ width: size, height: size }}
      aria-label={alt}
      title={alt}
    >
      {hasImg ? (
        <img
          src={raw as string}
          alt={alt}
          loading="lazy"
          className="w-full h-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : initials ? (
        <span className="font-semibold text-sm select-none">{initials}</span>
      ) : (
        <UserIcon className="w-1/2 h-1/2 opacity-70" aria-hidden />
      )}
    </div>
  );
};

/* =======================
 * BookCover
 * ======================= */
export type BookCoverProps = {
  /** Prefer `src`; `url` kept for backward compat */
  src?: string | null;
  url?: string | null; // legacy alias
  alt?: string;
  /** aspect ratio; "portrait" (default) or "square" */
  ratio?: "portrait" | "square";
  /** adds small shadow frame around the cover */
  framed?: boolean;
  className?: string;
};

export const BookCover: React.FC<BookCoverProps> = ({
  src,
  url,
  alt = "Book cover",
  ratio = "portrait",
  framed = true,
  className,
}) => {
  const [failed, setFailed] = useState(false);
  const raw = src ?? url ?? undefined;
  const hasImg = isHttpUrl(raw) && !failed;

  // aspect-ratio via Tailwind utilities
  const ratioClass = ratio === "square" ? "aspect-square" : "aspect-[3/4]"; // portrait default

  return (
    <div
      className={cx(
        "relative rounded-xl overflow-hidden bg-brand-gold-50 border border-brand-gold-200",
        ratioClass,
        framed && "shadow-sm",
        className
      )}
      aria-label={alt}
      title={alt}
    >
      {hasImg ? (
        <img
          src={raw as string}
          alt={alt}
          loading="lazy"
          className="w-full h-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-brand-gold-600">
          <div className="mb-2">
            <BookIcon className="w-8 h-8 opacity-80" aria-hidden />
          </div>
          <div className="text-xs font-medium opacity-80">No cover</div>
        </div>
      )}

      {/* subtle top-right watermark when image missing */}
      {!hasImg && (
        <div className="absolute bottom-2 right-2 text-brand-gold-500/70">
          <ImageIcon className="w-4 h-4" aria-hidden />
        </div>
      )}
    </div>
  );
};

/* =======================
 * Optional: generic square image
 * ======================= */
export type SquareImageProps = {
  /** Prefer `src`; `url` kept for backward compat */
  src?: string | null;
  url?: string | null; // legacy alias
  alt?: string;
  className?: string;
};

export const SquareImage: React.FC<SquareImageProps> = ({
  src,
  url,
  alt = "Image",
  className,
}) => {
  const [failed, setFailed] = useState(false);
  const raw = src ?? url ?? undefined;
  const hasImg = isHttpUrl(raw) && !failed;

  return (
    <div
      className={cx(
        "aspect-square rounded-xl overflow-hidden bg-gray-50 border border-gray-200",
        className
      )}
    >
      {hasImg ? (
        <img
          src={raw as string}
          alt={alt}
          loading="lazy"
          className="w-full h-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-gray-400">
          <ImageIcon className="w-6 h-6" aria-hidden />
        </div>
      )}
    </div>
  );
};

export default {
  AvatarImg,
  BookCover,
  SquareImage,
};