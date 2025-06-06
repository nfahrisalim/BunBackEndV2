import { OpenAPIHono } from '@hono/zod-openapi';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { swaggerUI } from '@hono/swagger-ui';
import { serveStatic } from 'hono/bun';
import blogs from './server/routes/blogs';
import projects from './server/routes/projects';
import type { ApiResponse } from './server/types';

const app = new OpenAPIHono();

// Middleware
app.use('*', logger());
app.use('*', prettyJSON());
app.use('*', cors({
  origin: ['http://localhost:3000', 'http://localhost:5000'], // Common frontend ports
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Health check endpoint
app.get('/', (c) => {
  const response: ApiResponse<{ status: string; timestamp: string }> = {
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString()
    },
    message: 'Blog & Projects API is running successfully'
  };
  return c.json(response);
});

// Serve uploaded files
app.use('/uploads/*', serve({
  root: './',
  rewriteRequestPath: (path) => path.replace(/^\/uploads/, '/uploads')
}));

// OpenAPI documentation
app.doc('/doc', {
  openapi: '3.0.0',
  info: {
    version: '1.0.0',
    title: 'Blog & Projects API',
    description: 'A REST API for managing blogs and projects with image upload capabilities'
  },
  servers: [
    {
      url: 'http://localhost:5000',
      description: 'Development server'
    }
  ]
});

// Swagger UI
app.get('/docs', swaggerUI({ url: '/doc' }));

// API routes
app.route('/api/blogs', blogs);
app.route('/api/projects', projects);

// Image upload endpoint
app.post('/api/upload', async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body['image'] as File;

    if (!file) {
      return c.json({
        success: false,
        error: 'No image file provided'
      }, 400);
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return c.json({
        success: false,
        error: 'Only image files (JPEG, PNG, WebP) are allowed'
      }, 400);
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      return c.json({
        success: false,
        error: 'File size must be less than 5MB'
      }, 400);
    }

    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = file.name.split('.').pop() || 'jpg';
    const filename = `image-${uniqueSuffix}.${ext}`;
    
    // Ensure uploads directory exists
    const uploadsDir = './uploads';
    const fs = await import('fs');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    const filepath = `${uploadsDir}/${filename}`;

    // Save file
    const buffer = await file.arrayBuffer();
    fs.writeFileSync(filepath, new Uint8Array(buffer));

    // Generate URL
    const protocol = c.req.header('x-forwarded-proto') || 'http';
    const host = c.req.header('host') || 'localhost:5000';
    const imageUrl = `${protocol}://${host}/uploads/${filename}`;

    const response: ApiResponse<{filename: string, url: string, size: number}> = {
      success: true,
      data: {
        filename,
        url: imageUrl,
        size: file.size
      },
      message: 'Image uploaded successfully'
    };

    return c.json(response, 201);
  } catch (error) {
    console.error('Upload error:', error);
    const response: ApiResponse<null> = {
      success: false,
      data: null,
      error: 'Failed to upload image'
    };
    return c.json(response, 500);
  }
});

// 404 handler for unknown routes
app.notFound((c) => {
  const response: ApiResponse<null> = {
    success: false,
    data: null,
    error: `Route ${c.req.method} ${c.req.path} not found`
  };
  return c.json(response, 404);
});

// Global error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  const response: ApiResponse<null> = {
    success: false,
    data: null,
    error: 'Internal server error. Please try again later.'
  };
  return c.json(response, 500);
});

// Start server
const port = process.env.PORT || 5000;

console.log(`🚀 Starting Blog & Projects API server on port ${port}...`);

export default {
  port: port,
  fetch: app.fetch,
  hostname: '0.0.0.0'
};
