// client/src/pages/api/badges.ts
import { apiRequest } from "@/lib/queryClient";

/** ---------- Badge catalog (create/list) ---------- **/

export type BadgeDTO = {
  id: number;
  name: string;
  description?: string | null;
  iconUrl?: string | null;
  iconPublicId?: string | null;
  isActive: boolean;
  isGeneric: boolean;
  createdById?: number | null;
  createdAt: string;
  updatedAt: string;
};

export async function listBadges(): Promise<BadgeDTO[]> {
  const res = await fetch("/api/badges", {
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });
  if (!res.ok) throw new Error("Failed to load badges");
  const data = await res.json();
  return data.badges ?? [];
}

export async function createBadge(input: {
  name: string;
  description?: string;
  iconUrl?: string | null;
  iconPublicId?: string | null;
  isGeneric?: boolean; // default true when no icon
  isActive?: boolean;
}) {
  const body = {
    name: input.name,
    description: input.description ?? null,
    iconUrl: input.iconUrl ?? null,
    iconPublicId: input.iconPublicId ?? null,
    isGeneric: input.isGeneric ?? (input.iconUrl ? false : true),
    isActive: input.isActive ?? true,
  };
  return apiRequest("POST", "/api/badges", body);
}

/** ---------- Book ↔ Badge mapping ---------- **/

export type BookBadgeDTO = {
  id: number;
  bookId: number;
  badgeId: number;
  awardMethod: "auto_on_book_complete" | "manual";
  completionThreshold: number; // %
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  badge?: BadgeDTO;
};

export async function attachBadgeToBook(
  bookId: number,
  input: {
    badgeId: number;
    awardMethod?: "auto_on_book_complete" | "manual";
    completionThreshold?: number; // default 100 for auto
  } & {
    // optional per-book customizations (server stores if you added these fields)
    customName?: string | null;
    customIconUrl?: string | null;
    customIconPublicId?: string | null;
  }
) {
  const body = {
    badgeId: input.badgeId,
    awardMethod: input.awardMethod ?? "auto_on_book_complete",
    completionThreshold:
      input.awardMethod === "auto_on_book_complete"
        ? input.completionThreshold ?? 100
        : 100,
    customName: input.customName ?? null,
    customIconUrl: input.customIconUrl ?? null,
    customIconPublicId: input.customIconPublicId ?? null,
  };
  return apiRequest("POST", `/api/books/${bookId}/badges`, body);
}

export async function listBookBadges(bookId: number): Promise<BookBadgeDTO[]> {
  const res = await fetch(`/api/books/${bookId}/badges`, {
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });
  if (!res.ok) throw new Error("Failed to load book badges");
  const data = await res.json();
  return data.bookBadges ?? data.mappings ?? [];
}

export async function detachBadgeFromBook(bookId: number, badgeId: number) {
  return apiRequest("DELETE", `/api/books/${bookId}/badges/${badgeId}`);
}

/** ---------- Earned badges (per user) ---------- **/

export type EarnedBadgeDTO = {
  id: number;
  userId: number;
  badgeId: number;
  bookId?: number | null;
  awardedById?: number | null;
  note?: string | null;
  awardedAt: string;
  createdAt: string;
  badge?: BadgeDTO;
};

export async function listUserBadges(userId: number): Promise<EarnedBadgeDTO[]> {
  const res = await fetch(`/api/users/${userId}/badges`, {
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });
  if (!res.ok) throw new Error("Failed to load user badges");
  const data = await res.json();
  return data.badges ?? data.earnedBadges ?? [];
}

/** Teacher/Admin manually award a badge to a student */
export async function awardBadgeToUser(
  userId: number,
  input: { badgeId: number; bookId?: number | null; note?: string | null }
) {
  const body = {
    badgeId: input.badgeId,
    bookId: input.bookId ?? null,
    note: input.note ?? null,
  };
  return apiRequest("POST", `/api/users/${userId}/badges`, body);
}