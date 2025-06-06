import { blogs, projects, type Blog, type InsertBlog, type UpdateBlog, type Project, type InsertProject, type UpdateProject } from '../shared/schema';
import { db } from './db';
import { eq, desc, asc } from 'drizzle-orm';

export interface IBlogStorage {
  getAllBlogs(status?: string): Promise<Blog[]>;
  getBlog(id: number): Promise<Blog | undefined>;
  createBlog(insertBlog: InsertBlog): Promise<Blog>;
  updateBlog(id: number, updateBlog: UpdateBlog): Promise<Blog | undefined>;
  deleteBlog(id: number): Promise<boolean>;
}

export interface IProjectStorage {
  getAllProjects(status?: string): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  createProject(insertProject: InsertProject): Promise<Project>;
  updateProject(id: number, updateProject: UpdateProject): Promise<Project | undefined>;
  deleteProject(id: number): Promise<boolean>;
}

export class BlogStorage implements IBlogStorage {
  async getAllBlogs(status?: string): Promise<Blog[]> {
    let query = db.select().from(blogs).orderBy(desc(blogs.createdAt));
    
    if (status) {
      query = query.where(eq(blogs.status, status));
    }
    
    return await query;
  }

  async getBlog(id: number): Promise<Blog | undefined> {
    const [blog] = await db.select().from(blogs).where(eq(blogs.id, id));
    return blog || undefined;
  }

  async createBlog(insertBlog: InsertBlog): Promise<Blog> {
    const blogData = {
      ...insertBlog,
      updatedAt: new Date()
    };

    // If status is being set to published and no publishedAt date, set it now
    if (blogData.status === 'published' && !blogData.publishedAt) {
      blogData.publishedAt = new Date();
    }

    const [blog] = await db
      .insert(blogs)
      .values(blogData)
      .returning();
    return blog;
  }

  async updateBlog(id: number, updateBlog: UpdateBlog): Promise<Blog | undefined> {
    const updateData = {
      ...updateBlog,
      updatedAt: new Date()
    };

    // If status is being changed to published and no publishedAt date, set it now
    if (updateData.status === 'published' && !updateData.publishedAt) {
      updateData.publishedAt = new Date();
    }

    const [blog] = await db
      .update(blogs)
      .set(updateData)
      .where(eq(blogs.id, id))
      .returning();
    
    return blog || undefined;
  }

  async deleteBlog(id: number): Promise<boolean> {
    const result = await db
      .delete(blogs)
      .where(eq(blogs.id, id))
      .returning({ id: blogs.id });
    
    return result.length > 0;
  }
}

export class ProjectStorage implements IProjectStorage {
  async getAllProjects(status?: string): Promise<Project[]> {
    let query = db.select().from(projects).orderBy(desc(projects.createdAt));
    
    if (status) {
      query = query.where(eq(projects.status, status));
    }
    
    return await query;
  }

  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project || undefined;
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const projectData = {
      ...insertProject,
      updatedAt: new Date()
    };

    // If status is being set to published and no publishedAt date, set it now
    if (projectData.status === 'published' && !projectData.publishedAt) {
      projectData.publishedAt = new Date();
    }

    const [project] = await db
      .insert(projects)
      .values(projectData)
      .returning();
    return project;
  }

  async updateProject(id: number, updateProject: UpdateProject): Promise<Project | undefined> {
    const updateData = {
      ...updateProject,
      updatedAt: new Date()
    };

    // If status is being changed to published and no publishedAt date, set it now
    if (updateData.status === 'published' && !updateData.publishedAt) {
      updateData.publishedAt = new Date();
    }

    const [project] = await db
      .update(projects)
      .set(updateData)
      .where(eq(projects.id, id))
      .returning();
    
    return project || undefined;
  }

  async deleteProject(id: number): Promise<boolean> {
    const result = await db
      .delete(projects)
      .where(eq(projects.id, id))
      .returning({ id: projects.id });
    
    return result.length > 0;
  }
}

export const blogStorage = new BlogStorage();
export const projectStorage = new ProjectStorage();
