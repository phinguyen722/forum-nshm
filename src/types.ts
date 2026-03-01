export interface Post {
  id?: string;
  subjectId: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  authorPhoto: string;
  createdAt: number;
  repliesCount: number;
  views: number;
  mediaUrl?: string;
  mediaType?: string; // 'image', 'video', 'document'
  status?: 'pending' | 'approved';
}

export interface Reply {
  id?: string;
  postId: string;
  content: string;
  authorId: string;
  authorName: string;
  authorPhoto: string;
  createdAt: number;
  mediaUrl?: string;
}

export interface Notification {
  id?: string;
  userId: string; // The user receiving the notification
  type: 'reply' | 'new_post';
  postId: string;
  postTitle: string;
  actorName: string;
  createdAt: number;
  read: boolean;
}
