import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import blogs from './server/routes/blogs';
import projects from './server/routes/projects';
import type { ApiResponse } from './server/types';

const app = new Hono();

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

// API routes
app.route('/api/blogs', blogs);
app.route('/api/projects', projects);

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
const port = process.env.PORT || 8000;

console.log(`🚀 Starting Blog & Projects API server on port ${port}...`);

export default {
  port: port,
  fetch: app.fetch,
  hostname: '0.0.0.0'
};
