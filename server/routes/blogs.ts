import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import { z } from 'zod';
import { db } from '../db';
// Perubahan 1: Impor Timestamp secara langsung
import { Timestamp } from 'firebase-admin/firestore'; 

// Impor Zod schema Anda
import {
  BlogSchema,
  CreateBlogSchema,
  UpdateBlogSchema,
  ApiResponseSchema,
  ErrorResponseSchema,
  StatusQuerySchema,
  IdParamSchema
} from '../openapi';

const blogs = new OpenAPIHono();

// Helper function untuk konversi Timestamp
const convertTimestamps = (data: Record<string, any>) => {
  const converted = { ...data };
  for (const key in converted) {
    // Perubahan 2: Gunakan Timestamp langsung
    if (converted[key] instanceof Timestamp) {
      converted[key] = converted[key].toDate().toISOString();
    }
  }
  return converted;
};


// GET /blogs
const getBlogsRoute = createRoute({
  method: 'get',
  path: '/',
  request: { query: StatusQuerySchema },
  responses: { /* ... responses ... */ },
  tags: ['Blogs']
});
blogs.openapi(getBlogsRoute, async (c) => {
  try {
    const { status } = c.req.valid('query');
    let query = db.collection('blogs');
    if (status) {
      query = query.where('status', '==', status) as any;
    }
    const snapshot = await query.orderBy('createdAt', 'desc').get();
    const blogList = snapshot.docs.map(doc => ({ id: doc.id, ...convertTimestamps(doc.data()) }));
    return c.json({ success: true, data: blogList, message: `Retrieved ${blogList.length} blogs` });
  } catch (error: any) {
    console.error('Error fetching blogs:', error);
    return c.json({ success: false, error: 'Failed to fetch blogs.' }, 500);
  }
});

// GET /blogs/:id
const IdParamSchema = z.object({
  id: z.string().min(1, "ID is required"), // ubah dari regex ke string biasa
});
blogs.openapi(getBlogByIdRoute, async (c) => {
    try {
        const { id } = c.req.valid('param');
        const doc = await db.collection('blogs').doc(id).get();
        if (!doc.exists) {
            return c.json({ success: false, error: `Blog with ID ${id} not found` }, 404);
        }
        return c.json({ success: true, data: { id: doc.id, ...convertTimestamps(doc.data()!) } });
    } catch (error: any) {
        console.error('Error fetching blog:', error);
        return c.json({ success: false, error: 'Failed to fetch blog.' }, 500);
    }
});

// POST /blogs
const createBlogRoute = createRoute({
    method: 'post',
    path: '/',
    request: { body: { content: { 'application/json': { schema: CreateBlogSchema } } } },
    responses: { /* ... responses ... */ },
    tags: ['Blogs']
});
blogs.openapi(createBlogRoute, async (c) => {
    try {
        const blogData = c.req.valid('json');
        const now = Timestamp.now(); // Perubahan 3: Gunakan Timestamp langsung
        const newBlog = {
            ...blogData,
            createdAt: now,
            updatedAt: now,
            // Perubahan 4: Gunakan Timestamp langsung
            publishedAt: blogData.publishedAt ? Timestamp.fromDate(new Date(blogData.publishedAt)) : null,
        };
        const docRef = await db.collection('blogs').add(newBlog);
        return c.json({ success: true, data: { id: docRef.id }, message: 'Blog created successfully' }, 201);
    } catch (error: any) {
        console.error('Error creating blog:', error);
        return c.json({ success: false, error: 'Failed to create blog.' }, 500);
    }
});

// PUT /blogs/:id
const updateBlogRoute = createRoute({
    method: 'put',
    path: '/{id}',
    request: { params: IdParamSchema, body: { content: { 'application/json': { schema: UpdateBlogSchema } } } },
    responses: { /* ... responses ... */ },
    tags: ['Blogs']
});
blogs.openapi(updateBlogRoute, async (c) => {
    try {
        const { id } = c.req.valid('param');
        const updateData = c.req.valid('json');
        const docRef = db.collection('blogs').doc(id);

        if (!(await docRef.get()).exists) {
            return c.json({ success: false, error: `Blog with ID ${id} not found` }, 404);
        }
        
        const finalUpdateData: Record<string, any> = {
            ...updateData,
            updatedAt: Timestamp.now(), // Perubahan 5: Gunakan Timestamp langsung
        };

        if (updateData.publishedAt) {
            // Perubahan 6: Gunakan Timestamp langsung
            finalUpdateData.publishedAt = Timestamp.fromDate(new Date(updateData.publishedAt));
        } else if (updateData.hasOwnProperty('publishedAt')) {
            finalUpdateData.publishedAt = null;
        }

        await docRef.update(finalUpdateData);
        const updatedDoc = await docRef.get();
        return c.json({ success: true, data: { id: updatedDoc.id, ...convertTimestamps(updatedDoc.data()!) }, message: 'Blog updated successfully' });
    } catch (error: any) {
        console.error('Error updating blog:', error);
        return c.json({ success: false, error: 'Failed to update blog.' }, 500);
    }
});

// DELETE /blogs/:id
const deleteBlogRoute = createRoute({
    method: 'delete',
    path: '/{id}',
    request: { params: IdParamSchema },
    responses: { /* ... responses ... */ },
    tags: ['Blogs']
});
blogs.openapi(deleteBlogRoute, async (c) => {
    try {
        const { id } = c.req.valid('param');
        const docRef = db.collection('blogs').doc(id);
        if (!(await docRef.get()).exists) {
            return c.json({ success: false, error: `Blog with ID ${id} not found` }, 404);
        }
        await docRef.delete();
        return c.json({ success: true, data: null, message: 'Blog deleted successfully' });
    } catch (error: any) {
        console.error('Error deleting blog:', error);
        return c.json({ success: false, error: 'Failed to delete blog.' }, 500);
    }
});


export default blogs;
