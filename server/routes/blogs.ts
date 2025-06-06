import { Hono } from 'hono';
import { blogStorage } from '../storage';
import { validateBody, validateQuery, validateIdParam, createBlogSchema, updateBlogSchema, statusQuerySchema } from '../middleware/validation';
import type { ApiResponse } from '../types';
import type { Blog } from '../../shared/schema';

const blogs = new Hono();

// GET /blogs - Get all blogs with optional status filter
blogs.get('/', validateQuery(statusQuerySchema), async (c) => {
  try {
    const { status } = c.get('validatedQuery');
    const blogList = await blogStorage.getAllBlogs(status);
    
    const response: ApiResponse<Blog[]> = {
      success: true,
      data: blogList,
      message: `Retrieved ${blogList.length} blogs${status ? ` with status: ${status}` : ''}`
    };
    
    return c.json(response);
  } catch (error) {
    console.error('Error fetching blogs:', error);
    const response: ApiResponse<null> = {
      success: false,
      data: null,
      error: 'Failed to fetch blogs. Please try again later.'
    };
    return c.json(response, 500);
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
