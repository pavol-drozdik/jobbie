export type SeoFeedItemDto = {
  id: string;
  title: string;
  summary: string;
  url_path: string;
  published_at: string;
  updated_at: string | null;
  image_url: string | null;
};

export type SeoFeedPayloadDto = {
  items: SeoFeedItemDto[];
};
