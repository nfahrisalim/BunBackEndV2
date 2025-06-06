import { Hono } from 'hono';
import { projectStorage } from '../storage';
import { validateBody, validateQuery, validateIdParam, createProjectSchema, updateProjectSchema, statusQuerySchema } from '../middleware/validation';
import type { ApiResponse } from '../types';
import type { Project } from '../../shared/schema';

const projects = new Hono();

// GET /projects - Get all projects with optional status filter
projects.get('/', validateQuery(statusQuerySchema), async (c) => {
  try {
    const { status } = c.get('validatedQuery');
    const projectList = await projectStorage.getAllProjects(status);
    
    const response: ApiResponse<Project[]> = {
      success: true,
      data: projectList,
      message: `Retrieved ${projectList.length} projects${status ? ` with status: ${status}` : ''}`
    };
    
    return c.json(response);
  } catch (error) {
    console.error('Error fetching projects:', error);
    const response: ApiResponse<null> = {
      success: false,
      data: null,
      error: 'Failed to fetch projects. Please try again later.'
    };
    return c.json(response, 500);
  }
});

// GET /projects/:id - Get a specific project by ID
projects.get('/:id', validateIdParam, async (c) => {
  try {
    const id = c.get('id');
    const project = await projectStorage.getProject(id);
    
    if (!project) {
      const response: ApiResponse<null> = {
        success: false,
        data: null,
        error: `Project with ID ${id} not found`
      };
      return c.json(response, 404);
    }
    
    const response: ApiResponse<Project> = {
      success: true,
      data: project,
      message: 'Project retrieved successfully'
    };
    
    return c.json(response);
  } catch (error) {
    console.error('Error fetching project:', error);
    const response: ApiResponse<null> = {
      success: false,
      data: null,
      error: 'Failed to fetch project. Please try again later.'
    };
    return c.json(response, 500);
  }
});

// POST /projects - Create a new project
projects.post('/', validateBody(createProjectSchema), async (c) => {
  try {
    const validatedData = c.get('validatedData');
    
    // Convert publishedAt string to Date if provided
    const projectData = {
      ...validatedData,
      publishedAt: validatedData.publishedAt ? new Date(validatedData.publishedAt) : null
    };
    
    const newProject = await projectStorage.createProject(projectData);
    
    const response: ApiResponse<Project> = {
      success: true,
      data: newProject,
      message: 'Project created successfully'
    };
    
    return c.json(response, 201);
  } catch (error) {
    console.error('Error creating project:', error);
    const response: ApiResponse<null> = {
      success: false,
      data: null,
      error: 'Failed to create project. Please try again later.'
    };
    return c.json(response, 500);
  }
});

// PUT /projects/:id - Update a project
projects.put('/:id', validateIdParam, validateBody(updateProjectSchema), async (c) => {
  try {
    const id = c.get('id');
    const validatedData = c.get('validatedData');
    
    // Convert publishedAt string to Date if provided
    const updateData = {
      ...validatedData,
      publishedAt: validatedData.publishedAt ? new Date(validatedData.publishedAt) : undefined
    };
    
    const updatedProject = await projectStorage.updateProject(id, updateData);
    
    if (!updatedProject) {
      const response: ApiResponse<null> = {
        success: false,
        data: null,
        error: `Project with ID ${id} not found`
      };
      return c.json(response, 404);
    }
    
    const response: ApiResponse<Project> = {
      success: true,
      data: updatedProject,
      message: 'Project updated successfully'
    };
    
    return c.json(response);
  } catch (error) {
    console.error('Error updating project:', error);
    const response: ApiResponse<null> = {
      success: false,
      data: null,
      error: 'Failed to update project. Please try again later.'
    };
    return c.json(response, 500);
  }
});

// DELETE /projects/:id - Delete a project
projects.delete('/:id', validateIdParam, async (c) => {
  try {
    const id = c.get('id');
    const deleted = await projectStorage.deleteProject(id);
    
    if (!deleted) {
      const response: ApiResponse<null> = {
        success: false,
        data: null,
        error: `Project with ID ${id} not found`
      };
      return c.json(response, 404);
    }
    
    const response: ApiResponse<null> = {
      success: true,
      data: null,
      message: 'Project deleted successfully'
    };
    
    return c.json(response);
  } catch (error) {
    console.error('Error deleting project:', error);
    const response: ApiResponse<null> = {
      success: false,
      data: null,
      error: 'Failed to delete project. Please try again later.'
    };
    return c.json(response, 500);
  }
});

export default projects;
