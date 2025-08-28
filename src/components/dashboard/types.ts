export interface InstagramPost {
  caption: string;
  media_url: string;
  like_count: number;
  comments_count: number;
  timestamp: string;
  permalink?: string;
}

export interface FacebookPost {
  message: string;
  full_picture: string;
  totalCount: number;
  created_time: string;
  permalink_url?: string;
}

export interface LinkedInPost {
  text: string;
  media?: {
    type: string;
    items: Array<{
      url: string;
      width: number;
      height: number;
    }>;
  };
  document?: {
    url: string;
  };
  stats: {
    total_reactions: number;
    like: number;
  };
  posted_at: {
    date: string;
  };
  post_url?: string;
}

export interface SocialStats {
  follow_insta: number;
  publication_instagram: InstagramPost[];
  publication_facebook: FacebookPost[];
  publication_linkedin: LinkedInPost[];
  publication_like_facebook: number;
  follow_facebook: number;
  like_linkedin: number;
  follow_gain_linkedin: number;
  follow_linkedin: number;
}

export interface StoredData {
  stats: SocialStats;
  lastUpdate: string;
}

export interface MonthlyStats {
  month: string;
  instagram_followers: number;
  instagram_likes: number;
  facebook_followers: number;
  facebook_likes: number;
  linkedin_followers: number;
  linkedin_likes: number;
}

export interface CurrentStats {
  follow_insta: number;
  publication_instagram: Array<{ like_count: number }>;
  follow_facebook: number;
  publication_facebook: Array<{ totalCount: number }>;
  follow_linkedin: number;
  like_linkedin: number;
}