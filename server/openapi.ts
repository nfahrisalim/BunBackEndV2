import { z } from 'zod';
import { createRoute } from '@hono/zod-openapi';

// Base schemas
export const BlogSchema = z.object({
  id: z.number().int().positive().openapi({ example: 1 }),
  title: z.string().max(255).openapi({ example: 'My Blog Post Title' }),
  excerpt: z.string().nullable().openapi({ example: 'A short excerpt of the blog post' }),
  content: z.string().openapi({ example: 'Full content of the blog post...' }),
  coverImageUrl: z.string().url().nullable().openapi({ example: 'https://example.com/image.jpg' }),
  status: z.enum(['draft', 'published']).openapi({ example: 'published' }),
  publishedAt: z.string().datetime().nullable().openapi({ example: '2025-06-06T04:11:32.056Z' }),
  createdAt: z.string().datetime().openapi({ example: '2025-06-06T04:11:32.091Z' }),
  updatedAt: z.string().datetime().openapi({ example: '2025-06-06T04:11:32.056Z' })
});

export const ProjectSchema = z.object({
  id: z.number().int().positive().openapi({ example: 1 }),
  title: z.string().max(255).openapi({ example: 'My Project Title' }),
  excerpt: z.string().nullable().openapi({ example: 'A short project excerpt' }),
  abstract: z.string().nullable().openapi({ example: 'Project abstract description' }),
  projectScope: z.string().nullable().openapi({ example: 'Web application development' }),
  isGroup: z.boolean().openapi({ example: true }),
  projectLink: z.string().url().nullable().openapi({ example: 'https://project.example.com' }),
  githubLink: z.string().url().nullable().openapi({ example: 'https://github.com/user/project' }),
  documentationLink: z.string().url().nullable().openapi({ example: 'https://docs.example.com' }),
  content: z.string().nullable().openapi({ example: 'Detailed project content...' }),
  coverImageUrl: z.string().url().nullable().openapi({ example: 'https://example.com/project-image.jpg' }),
  status: z.enum(['draft', 'published']).openapi({ example: 'published' }),
  publishedAt: z.string().datetime().nullable().openapi({ example: '2025-06-06T04:11:32.056Z' }),
  createdAt: z.string().datetime().openapi({ example: '2025-06-06T04:11:32.091Z' }),
  updatedAt: z.string().datetime().openapi({ example: '2025-06-06T04:11:32.056Z' })
});

// Input schemas
export const CreateBlogSchema = z.object({
  title: z.string().min(1).max(255).openapi({ example: 'My Blog Post Title' }),
  excerpt: z.string().optional().openapi({ example: 'A short excerpt' }),
  content: z.string().min(1).openapi({ example: 'Full content of the blog post...' }),
  coverImageUrl: z.string().url().optional().or(z.literal('')).openapi({ example: 'https://example.com/image.jpg' }),
  status: z.enum(['draft', 'published']).default('draft').openapi({ example: 'draft' }),
  publishedAt: z.string().datetime().optional().or(z.null()).openapi({ example: '2025-06-06T04:11:32.056Z' })
});

export const UpdateBlogSchema = z.object({
  title: z.string().min(1).max(255).optional().openapi({ example: 'Updated Blog Title' }),
  excerpt: z.string().optional().or(z.null()).openapi({ example: 'Updated excerpt' }),
  content: z.string().min(1).optional().openapi({ example: 'Updated content...' }),
  coverImageUrl: z.string().url().optional().or(z.literal('')).or(z.null()).openapi({ example: 'https://example.com/new-image.jpg' }),
  status: z.enum(['draft', 'published']).optional().openapi({ example: 'published' }),
  publishedAt: z.string().datetime().optional().or(z.null()).openapi({ example: '2025-06-06T04:11:32.056Z' })
});

export const CreateProjectSchema = z.object({
  title: z.string().min(1).max(255).openapi({ example: 'My Project Title' }),
  excerpt: z.string().optional().openapi({ example: 'A short project excerpt' }),
  abstract: z.string().optional().openapi({ example: 'Project abstract' }),
  projectScope: z.string().optional().openapi({ example: 'Web application development' }),
  isGroup: z.boolean().default(false).openapi({ example: false }),
  projectLink: z.string().url().optional().or(z.literal('')).openapi({ example: 'https://project.example.com' }),
  githubLink: z.string().url().optional().or(z.literal('')).openapi({ example: 'https://github.com/user/project' }),
  documentationLink: z.string().url().optional().or(z.literal('')).openapi({ example: 'https://docs.example.com' }),
  content: z.string().optional().openapi({ example: 'Detailed project content...' }),
  coverImageUrl: z.string().url().optional().or(z.literal('')).openapi({ example: 'https://example.com/image.jpg' }),
  status: z.enum(['draft', 'published']).default('draft').openapi({ example: 'draft' }),
  publishedAt: z.string().datetime().optional().or(z.null()).openapi({ example: '2025-06-06T04:11:32.056Z' })
});

export const UpdateProjectSchema = z.object({
  title: z.string().min(1).max(255).optional().openapi({ example: 'Updated Project Title' }),
  excerpt: z.string().optional().or(z.null()).openapi({ example: 'Updated excerpt' }),
  abstract: z.string().optional().or(z.null()).openapi({ example: 'Updated abstract' }),
  projectScope: z.string().optional().or(z.null()).openapi({ example: 'Updated scope' }),
  isGroup: z.boolean().optional().openapi({ example: true }),
  projectLink: z.string().url().optional().or(z.literal('')).or(z.null()).openapi({ example: 'https://newproject.example.com' }),
  githubLink: z.string().url().optional().or(z.literal('')).or(z.null()).openapi({ example: 'https://github.com/user/newproject' }),
  documentationLink: z.string().url().optional().or(z.literal('')).or(z.null()).openapi({ example: 'https://newdocs.example.com' }),
  content: z.string().optional().or(z.null()).openapi({ example: 'Updated content...' }),
  coverImageUrl: z.string().url().optional().or(z.literal('')).or(z.null()).openapi({ example: 'https://example.com/new-image.jpg' }),
  status: z.enum(['draft', 'published']).optional().openapi({ example: 'published' }),
  publishedAt: z.string().datetime().optional().or(z.null()).openapi({ example: '2025-06-06T04:11:32.056Z' })
});

// Response schemas
export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean().openapi({ example: true }),
    data: dataSchema,
    message: z.string().optional().openapi({ example: 'Operation completed successfully' }),
    error: z.string().optional().openapi({ example: 'Error message if any' })
  });

export const ErrorResponseSchema = z.object({
  success: z.boolean().openapi({ example: false }),
  data: z.null(),
  error: z.string().openapi({ example: 'Error message' }),
  details: z.array(z.object({
    field: z.string().openapi({ example: 'title' }),
    message: z.string().openapi({ example: 'Title is required' })
  })).optional()
});

// Query schemas
export const StatusQuerySchema = z.object({
  status: z.enum(['draft', 'published']).optional().openapi({ example: 'published' })
});

import { z } from "zod";

export const IdParamSchema = z.object({
  id: z.string().min(1).openapi({
    param: { name: 'id', in: 'path' },
    example: 'ajL8SflPjZum2GcjBq2e',
  }),
});


// Upload response schema
export const UploadResponseSchema = z.object({
  filename: z.string().openapi({ example: 'cover-image-1234567890-123456789.jpg' }),
  originalname: z.string().openapi({ example: 'my-image.jpg' }),
  mimetype: z.string().openapi({ example: 'image/jpeg' }),
  size: z.number().openapi({ example: 1024000 }),
  url: z.string().url().openapi({ example: 'http://localhost:5000/uploads/cover-image-1234567890-123456789.jpg' })
});