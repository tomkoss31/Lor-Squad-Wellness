// =============================================================================
// Types Announcements / Spotlights (2026-05-04)
// =============================================================================

export type AnnouncementAccent = "gold" | "teal" | "coral" | "purple";
export type AnnouncementAudience = "all" | "distri" | "admin";

export interface AppAnnouncement {
  id: string;
  title: string;
  body: string;
  emoji: string;
  accent: AnnouncementAccent;
  link_path: string | null;
  link_label: string | null;
  audience: AnnouncementAudience;
  published_at: string;
  expires_at: string | null;
  created_by: string | null;
  created_at: string;
}

export const ACCENT_TO_TOKEN: Record<AnnouncementAccent, string> = {
  gold: "var(--ls-gold)",
  teal: "var(--ls-teal)",
  coral: "var(--ls-coral)",
  purple: "var(--ls-purple)",
};
