import { z } from 'zod';
import { Context, Next } from 'hono';

// Blog validation schemas
export const createBlogSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title must be 255 characters or less'),
  excerpt: z.string().optional(),
  content: z.string().min(1, 'Content is required'),
  coverImageUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  status: z.enum(['draft', 'published']).default('draft'),
  publishedAt: z.string().datetime().optional().or(z.null())
});

export const updateBlogSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title must be 255 characters or less').optional(),
  excerpt: z.string().optional().or(z.null()),
  content: z.string().min(1, 'Content is required').optional(),
  coverImageUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')).or(z.null()),
  status: z.enum(['draft', 'published']).optional(),
  publishedAt: z.string().datetime().optional().or(z.null())
});

// Project validation schemas
export const createProjectSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title must be 255 characters or less'),
  excerpt: z.string().optional(),
  abstract: z.string().optional(),
  projectScope: z.string().optional(),
  isGroup: z.boolean().default(false),
  projectLink: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  githubLink: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  documentationLink: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  content: z.string().optional(),
  coverImageUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  status: z.enum(['draft', 'published']).default('draft'),
  publishedAt: z.string().datetime().optional().or(z.null())
});

export const updateProjectSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title must be 255 characters or less').optional(),
  excerpt: z.string().optional().or(z.null()),
  abstract: z.string().optional().or(z.null()),
  projectScope: z.string().optional().or(z.null()),
  isGroup: z.boolean().optional(),
  projectLink: z.string().url('Must be a valid URL').optional().or(z.literal('')).or(z.null()),
  githubLink: z.string().url('Must be a valid URL').optional().or(z.literal('')).or(z.null()),
  documentationLink: z.string().url('Must be a valid URL').optional().or(z.literal('')).or(z.null()),
  content: z.string().optional().or(z.null()),
  coverImageUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')).or(z.null()),
  status: z.enum(['draft', 'published']).optional(),
  publishedAt: z.string().datetime().optional().or(z.null())
});

// Query parameter validation
export const statusQuerySchema = z.object({
  status: z.enum(['draft', 'published']).optional()
});

// Validation middleware factory
export function validateBody(schema: z.ZodSchema) {
  return async (c: Context, next: Next) => {
    try {
      const body = await c.req.json();
      const validatedData = schema.parse(body);
      c.set('validatedData', validatedData);
      await next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return c.json({
          error: 'Validation failed',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        }, 400);
      }
      return c.json({ error: 'Invalid JSON format' }, 400);
    }
  };
}

export function validateQuery(schema: z.ZodSchema) {
  return async (c: Context, next: Next) => {
    try {
      const query = c.req.query();
      const validatedQuery = schema.parse(query);
      c.set('validatedQuery', validatedQuery);
      await next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return c.json({
          error: 'Invalid query parameters',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        }, 400);
      }
      return c.json({ error: 'Invalid query parameters' }, 400);
    }
  };
}

// ID parameter validation middleware
export async function validateIdParam(c: Context, next: Next) {
  const id = c.req.param('id');
  const parsedId = parseInt(id);
  
  if (isNaN(parsedId) || parsedId <= 0) {
    return c.json({ error: 'Invalid ID parameter. Must be a positive integer.' }, 400);
  }
  
  c.set('id', parsedId);
  await next();
}
