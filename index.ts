import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { swaggerUI } from '@hono/swagger-ui';
import { serveStatic } from 'hono/bun';
import type { ApiResponse } from './server/types';
import { blogStorage, projectStorage } from './server/storage';
import {
  BlogSchema,
  ProjectSchema,
  CreateBlogSchema,
  UpdateBlogSchema,
  CreateProjectSchema,
  UpdateProjectSchema,
  ApiResponseSchema,
  ErrorResponseSchema,
  StatusQuerySchema,
  IdParamSchema,
  UploadResponseSchema
} from './server/openapi';

const app = new OpenAPIHono();

// Middleware
app.use('*', logger());
app.use('*', prettyJSON());
app.use('*', cors({
  origin: ['http://localhost:3000', 'http://localhost:5000'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Serve uploaded files
app.use('/uploads/*', serveStatic({ root: './' }));

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

// Image upload endpoint
const uploadRoute = createRoute({
  method: 'post',
  path: '/api/upload',
  request: {
    body: {
      content: {
        'multipart/form-data': {
          schema: z.object({
            image: z.instanceof(File).openapi({ type: 'string', format: 'binary' })
          })
        }
      }
    }
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: ApiResponseSchema(UploadResponseSchema)
        }
      },
      description: 'Image uploaded successfully'
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema
        }
      },
      description: 'Invalid file or validation error'
    }
  },
  tags: ['Upload']
});

app.openapi(uploadRoute, async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body['image'] as File;

    if (!file) {
      return c.json({
        success: false,
        data: null,
        error: 'No image file provided'
      }, 400);
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return c.json({
        success: false,
        data: null,
        error: 'Only image files (JPEG, PNG, WebP) are allowed'
      }, 400);
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      return c.json({
        success: false,
        data: null,
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

    return c.json({
      success: true,
      data: {
        filename,
        originalname: file.name,
        mimetype: file.type,
        size: file.size,
        url: imageUrl
      },
      message: 'Image uploaded successfully'
    }, 201);
  } catch (error) {
    console.error('Upload error:', error);
    return c.json({
      success: false,
      data: null,
      error: 'Failed to upload image'
    }, 500);
  }
});

// Blog API endpoints
const getBlogsRoute = createRoute({
  method: 'get',
  path: '/api/blogs',
  request: {
    query: StatusQuerySchema
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: ApiResponseSchema(z.array(BlogSchema))
        }
      },
      description: 'List of blogs retrieved successfully'
    }
  },
  tags: ['Blogs']
});

app.openapi(getBlogsRoute, async (c) => {
  try {
    const { status } = c.req.valid('query');
    const blogList = await blogStorage.getAllBlogs(status);
    
    return c.json({
      success: true,
      data: blogList,
      message: `Retrieved ${blogList.length} blogs${status ? ` with status: ${status}` : ''}`
    });
  } catch (error) {
    console.error('Error fetching blogs:', error);
    return c.json({
      success: false,
      data: null,
      error: 'Failed to fetch blogs'
    }, 500);
  }
});

const getBlogRoute = createRoute({
  method: 'get',
  path: '/api/blogs/{id}',
  request: {
    params: IdParamSchema
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: ApiResponseSchema(BlogSchema)
        }
      },
      description: 'Blog retrieved successfully'
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema
        }
      },
      description: 'Blog not found'
    }
  },
  tags: ['Blogs']
});

app.openapi(getBlogRoute, async (c) => {
  try {
    const { id } = c.req.valid('param');
    const blog = await blogStorage.getBlog(id);
    
    if (!blog) {
      return c.json({
        success: false,
        data: null,
        error: `Blog with ID ${id} not found`
      }, 404);
    }
    
    return c.json({
      success: true,
      data: blog,
      message: 'Blog retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching blog:', error);
    return c.json({
      success: false,
      data: null,
      error: 'Failed to fetch blog'
    }, 500);
  }
});

const createBlogRoute = createRoute({
  method: 'post',
  path: '/api/blogs',
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateBlogSchema
        }
      }
    }
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: ApiResponseSchema(BlogSchema)
        }
      },
      description: 'Blog created successfully'
    }
  },
  tags: ['Blogs']
});

app.openapi(createBlogRoute, async (c) => {
  try {
    const validatedData = c.req.valid('json');
    
    const blogData = {
      ...validatedData,
      publishedAt: validatedData.publishedAt ? new Date(validatedData.publishedAt) : null
    };
    
    const newBlog = await blogStorage.createBlog(blogData);
    
    return c.json({
      success: true,
      data: newBlog,
      message: 'Blog created successfully'
    }, 201);
  } catch (error) {
    console.error('Error creating blog:', error);
    return c.json({
      success: false,
      data: null,
      error: 'Failed to create blog'
    }, 500);
  }
});

const updateBlogRoute = createRoute({
  method: 'put',
  path: '/api/blogs/{id}',
  request: {
    params: IdParamSchema,
    body: {
      content: {
        'application/json': {
          schema: UpdateBlogSchema
        }
      }
    }
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: ApiResponseSchema(BlogSchema)
        }
      },
      description: 'Blog updated successfully'
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema
        }
      },
      description: 'Blog not found'
    }
  },
  tags: ['Blogs']
});

app.openapi(updateBlogRoute, async (c) => {
  try {
    const { id } = c.req.valid('param');
    const validatedData = c.req.valid('json');
    
    const updateData = {
      ...validatedData,
      publishedAt: validatedData.publishedAt ? new Date(validatedData.publishedAt) : undefined
    };
    
    const updatedBlog = await blogStorage.updateBlog(id, updateData);
    
    if (!updatedBlog) {
      return c.json({
        success: false,
        data: null,
        error: `Blog with ID ${id} not found`
      }, 404);
    }
    
    return c.json({
      success: true,
      data: updatedBlog,
      message: 'Blog updated successfully'
    });
  } catch (error) {
    console.error('Error updating blog:', error);
    return c.json({
      success: false,
      data: null,
      error: 'Failed to update blog'
    }, 500);
  }
});

const deleteBlogRoute = createRoute({
  method: 'delete',
  path: '/api/blogs/{id}',
  request: {
    params: IdParamSchema
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: ApiResponseSchema(z.null())
        }
      },
      description: 'Blog deleted successfully'
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema
        }
      },
      description: 'Blog not found'
    }
  },
  tags: ['Blogs']
});

app.openapi(deleteBlogRoute, async (c) => {
  try {
    const { id } = c.req.valid('param');
    const deleted = await blogStorage.deleteBlog(id);
    
    if (!deleted) {
      return c.json({
        success: false,
        data: null,
        error: `Blog with ID ${id} not found`
      }, 404);
    }
    
    return c.json({
      success: true,
      data: null,
      message: 'Blog deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting blog:', error);
    return c.json({
      success: false,
      data: null,
      error: 'Failed to delete blog'
    }, 500);
  }
});

// Project API endpoints
const getProjectsRoute = createRoute({
  method: 'get',
  path: '/api/projects',
  request: {
    query: StatusQuerySchema
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: ApiResponseSchema(z.array(ProjectSchema))
        }
      },
      description: 'List of projects retrieved successfully'
    }
  },
  tags: ['Projects']
});

app.openapi(getProjectsRoute, async (c) => {
  try {
    const { status } = c.req.valid('query');
    const projectList = await projectStorage.getAllProjects(status);
    
    return c.json({
      success: true,
      data: projectList,
      message: `Retrieved ${projectList.length} projects${status ? ` with status: ${status}` : ''}`
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return c.json({
      success: false,
      data: null,
      error: 'Failed to fetch projects'
    }, 500);
  }
});

const getProjectRoute = createRoute({
  method: 'get',
  path: '/api/projects/{id}',
  request: {
    params: IdParamSchema
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: ApiResponseSchema(ProjectSchema)
        }
      },
      description: 'Project retrieved successfully'
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema
        }
      },
      description: 'Project not found'
    }
  },
  tags: ['Projects']
});

app.openapi(getProjectRoute, async (c) => {
  try {
    const { id } = c.req.valid('param');
    const project = await projectStorage.getProject(id);
    
    if (!project) {
      return c.json({
        success: false,
        data: null,
        error: `Project with ID ${id} not found`
      }, 404);
    }
    
    return c.json({
      success: true,
      data: project,
      message: 'Project retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching project:', error);
    return c.json({
      success: false,
      data: null,
      error: 'Failed to fetch project'
    }, 500);
  }
});

const createProjectRoute = createRoute({
  method: 'post',
  path: '/api/projects',
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateProjectSchema
        }
      }
    }
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: ApiResponseSchema(ProjectSchema)
        }
      },
      description: 'Project created successfully'
    }
  },
  tags: ['Projects']
});

app.openapi(createProjectRoute, async (c) => {
  try {
    const validatedData = c.req.valid('json');
    
    const projectData = {
      ...validatedData,
      publishedAt: validatedData.publishedAt ? new Date(validatedData.publishedAt) : null
    };
    
    const newProject = await projectStorage.createProject(projectData);
    
    return c.json({
      success: true,
      data: newProject,
      message: 'Project created successfully'
    }, 201);
  } catch (error) {
    console.error('Error creating project:', error);
    return c.json({
      success: false,
      data: null,
      error: 'Failed to create project'
    }, 500);
  }
});

const updateProjectRoute = createRoute({
  method: 'put',
  path: '/api/projects/{id}',
  request: {
    params: IdParamSchema,
    body: {
      content: {
        'application/json': {
          schema: UpdateProjectSchema
        }
      }
    }
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: ApiResponseSchema(ProjectSchema)
        }
      },
      description: 'Project updated successfully'
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema
        }
      },
      description: 'Project not found'
    }
  },
  tags: ['Projects']
});

app.openapi(updateProjectRoute, async (c) => {
  try {
    const { id } = c.req.valid('param');
    const validatedData = c.req.valid('json');
    
    const updateData = {
      ...validatedData,
      publishedAt: validatedData.publishedAt ? new Date(validatedData.publishedAt) : undefined
    };
    
    const updatedProject = await projectStorage.updateProject(id, updateData);
    
    if (!updatedProject) {
      return c.json({
        success: false,
        data: null,
        error: `Project with ID ${id} not found`
      }, 404);
    }
    
    return c.json({
      success: true,
      data: updatedProject,
      message: 'Project updated successfully'
    });
  } catch (error) {
    console.error('Error updating project:', error);
    return c.json({
      success: false,
      data: null,
      error: 'Failed to update project'
    }, 500);
  }
});

const deleteProjectRoute = createRoute({
  method: 'delete',
  path: '/api/projects/{id}',
  request: {
    params: IdParamSchema
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: ApiResponseSchema(z.null())
        }
      },
      description: 'Project deleted successfully'
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema
        }
      },
      description: 'Project not found'
    }
  },
  tags: ['Projects']
});

app.openapi(deleteProjectRoute, async (c) => {
  try {
    const { id } = c.req.valid('param');
    const deleted = await projectStorage.deleteProject(id);
    
    if (!deleted) {
      return c.json({
        success: false,
        data: null,
        error: `Project with ID ${id} not found`
      }, 404);
    }
    
    return c.json({
      success: true,
      data: null,
      message: 'Project deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting project:', error);
    return c.json({
      success: false,
      data: null,
      error: 'Failed to delete project'
    }, 500);
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
