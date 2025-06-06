import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import { blogStorage } from '../storage';
import { BlogSchema, CreateBlogSchema, UpdateBlogSchema, ApiResponseSchema, ErrorResponseSchema, StatusQuerySchema, IdParamSchema } from '../openapi';
import { z } from 'zod';

const blogs = new OpenAPIHono();

// GET /blogs - Get all blogs with optional status filter
const getBlogsRoute = createRoute({
  method: 'get',
  path: '/',
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
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema
        }
      },
      description: 'Server error'
    }
  },
  tags: ['Blogs']
});

blogs.openapi(getBlogsRoute, async (c) => {
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
      error: 'Failed to fetch blogs. Please try again later.'
    }, 500);
  }
});

// GET /blogs/:id - Get a specific blog by ID
blogs.get('/:id', validateIdParam, async (c) => {
  try {
    const id = c.get('id');
    const blog = await blogStorage.getBlog(id);
    
    if (!blog) {
      const response: ApiResponse<null> = {
        success: false,
        data: null,
        error: `Blog with ID ${id} not found`
      };
      return c.json(response, 404);
    }
    
    const response: ApiResponse<Blog> = {
      success: true,
      data: blog,
      message: 'Blog retrieved successfully'
    };
    
    return c.json(response);
  } catch (error) {
    console.error('Error fetching blog:', error);
    const response: ApiResponse<null> = {
      success: false,
      data: null,
      error: 'Failed to fetch blog. Please try again later.'
    };
    return c.json(response, 500);
  }
});

// POST /blogs - Create a new blog
blogs.post('/', validateBody(createBlogSchema), async (c) => {
  try {
    const validatedData = c.get('validatedData');
    
    // Convert publishedAt string to Date if provided
    const blogData = {
      ...validatedData,
      publishedAt: validatedData.publishedAt ? new Date(validatedData.publishedAt) : null
    };
    
    const newBlog = await blogStorage.createBlog(blogData);
    
    const response: ApiResponse<Blog> = {
      success: true,
      data: newBlog,
      message: 'Blog created successfully'
    };
    
    return c.json(response, 201);
  } catch (error) {
    console.error('Error creating blog:', error);
    const response: ApiResponse<null> = {
      success: false,
      data: null,
      error: 'Failed to create blog. Please try again later.'
    };
    return c.json(response, 500);
  }
});

// PUT /blogs/:id - Update a blog
blogs.put('/:id', validateIdParam, validateBody(updateBlogSchema), async (c) => {
  try {
    const id = c.get('id');
    const validatedData = c.get('validatedData');
    
    // Convert publishedAt string to Date if provided
    const updateData = {
      ...validatedData,
      publishedAt: validatedData.publishedAt ? new Date(validatedData.publishedAt) : undefined
    };
    
    const updatedBlog = await blogStorage.updateBlog(id, updateData);
    
    if (!updatedBlog) {
      const response: ApiResponse<null> = {
        success: false,
        data: null,
        error: `Blog with ID ${id} not found`
      };
      return c.json(response, 404);
    }
    
    const response: ApiResponse<Blog> = {
      success: true,
      data: updatedBlog,
      message: 'Blog updated successfully'
    };
    
    return c.json(response);
  } catch (error) {
    console.error('Error updating blog:', error);
    const response: ApiResponse<null> = {
      success: false,
      data: null,
      error: 'Failed to update blog. Please try again later.'
    };
    return c.json(response, 500);
  }
});

// DELETE /blogs/:id - Delete a blog
blogs.delete('/:id', validateIdParam, async (c) => {
  try {
    const id = c.get('id');
    const deleted = await blogStorage.deleteBlog(id);
    
    if (!deleted) {
      const response: ApiResponse<null> = {
        success: false,
        data: null,
        error: `Blog with ID ${id} not found`
      };
      return c.json(response, 404);
    }
    
    const response: ApiResponse<null> = {
      success: true,
      data: null,
      message: 'Blog deleted successfully'
    };
    
    return c.json(response);
  } catch (error) {
    console.error('Error deleting blog:', error);
    const response: ApiResponse<null> = {
      success: false,
      data: null,
      error: 'Failed to delete blog. Please try again later.'
    };
    return c.json(response, 500);
  }
});

export default blogs;
