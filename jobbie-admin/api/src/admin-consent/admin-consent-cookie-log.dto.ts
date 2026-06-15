export type CookieConsentLogItemDto = {
  id: string;
  visitor_id: string;
  user_id: string | null;
  action: string;
  analytics: boolean;
  marketing: boolean;
  personalization: boolean;
  policy_version: number;
  source: string | null;
  page_path: string | null;
  user_agent: string | null;
  recorded_at: string;
};

export type CookieConsentLogListDto = {
  items: CookieConsentLogItemDto[];
  next_cursor: string | null;
};
