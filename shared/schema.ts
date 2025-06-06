import { pgTable, serial, varchar, text, boolean, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Blogs table schema
export const blogs = pgTable('blogs', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  excerpt: text('excerpt'),
  content: text('content').notNull(),
  coverImageUrl: text('cover_image_url'),
  status: varchar('status', { length: 50 }).default('draft'),
  publishedAt: timestamp('published_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Projects table schema
export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  excerpt: text('excerpt'),
  abstract: text('abstract'),
  projectScope: text('project_scope'),
  isGroup: boolean('is_group').default(false),
  projectLink: text('project_link'),
  githubLink: text('github_link'),
  documentationLink: text('documentation_link'),
  content: text('content'),
  coverImageUrl: text('cover_image_url'),
  status: varchar('status', { length: 50 }).default('draft'),
  publishedAt: timestamp('published_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Relations (for future use if needed)
export const blogsRelations = relations(blogs, ({ }) => ({}));
export const projectsRelations = relations(projects, ({ }) => ({}));

// Type exports
export type Blog = typeof blogs.$inferSelect;
export type InsertBlog = typeof blogs.$inferInsert;
export type UpdateBlog = Partial<Omit<InsertBlog, 'id' | 'createdAt'>>;

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;
export type UpdateProject = Partial<Omit<InsertProject, 'id' | 'createdAt'>>;
