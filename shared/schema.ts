import type { firestore } from 'firebase-admin';
export interface Blog {
  id: string; 
  title: string;
  excerpt?: string | null; 
  content: string;
  coverImageUrl?: string | null; 
  status: 'draft' | 'published'; 
  publishedAt?: firestore.Timestamp | null; 
  createdAt: firestore.Timestamp;
  updatedAt: firestore.Timestamp;
}

export interface Project {
  id: string; 
  title: string;
  excerpt?: string | null;
  abstract?: string | null;
  projectScope?: string | null;
  isGroup: boolean;
  projectLink?: string | null;
  githubLink?: string | null;
  documentationLink?: string | null;
  content?: string | null;
  coverImageUrl?: string | null;
  status: 'draft' | 'published';
  publishedAt?: firestore.Timestamp | null;
  createdAt: firestore.Timestamp;
  updatedAt: firestore.Timestamp;
}
export type InsertBlog = Omit<Blog, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateBlog = Partial<Omit<InsertBlog, 'publishedAt'>>;
export type InsertProject = Omit<Project, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateProject = Partial<Omit<InsertProject, 'publishedAt'>>;