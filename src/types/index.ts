export interface ContentData {
  id: string;
  title: string;
  views: number;
  url: string;
}

export interface SocialProfile {
  platform: 'youtube' | 'instagram' | 'tiktok';
  username: string;
  accountName: string;
  profilePicture: string;
  totalViews: number;
  recentContent: ContentData[];
  error?: string; 
}