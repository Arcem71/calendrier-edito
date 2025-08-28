export type Status = 'Publiée' | 'En Attente de Validation' | 'Planifiée';
export type Platform = 'Instagram' | 'Facebook' | 'Twitter' | 'LinkedIn' | 'TikTok' | 'YouTube' | 'Blog';
export type Vote = 'up' | 'down' | null;
export type ViewMode = 'calendar' | 'database' | 'dashboard' | 'ai' | 'prospection';

export interface ImageInfo {
  url: string;
  filename: string;
  uploaded_at: string;
  vote?: Vote;
}

export interface ContentItem {
  id: string;
  name: string;
  status: Status;
  date_brute: string;
  platforms: Platform[];
  description: string;
  images: ImageInfo[];
  informations?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}