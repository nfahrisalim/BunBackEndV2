// projects.ts dengan dokumentasi OpenAPI untuk semua endpoint
import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { db } from '../db';
import { Timestamp } from 'firebase-admin/firestore';
import {
  createProjectSchema,
  updateProjectSchema,
  statusQuerySchema
} from '../middleware/validation';
import type { Project } from '../../shared/schema';
import {
  ProjectSchema,
  CreateProjectSchema,
  UpdateProjectSchema,
  ApiResponseSchema,
  ErrorResponseSchema,
  StatusQuerySchema,
  IdParamSchema // Menggunakan IdParamSchema yang sudah benar
} from '../openapi';

const projects = new OpenAPIHono();

const convertTimestamps = (data: Record<string, any>) => {
  const converted = { ...data };
  for (const key in converted) {
    if (converted[key] instanceof Timestamp) {
      converted[key] = converted[key].toDate().toISOString();
    }
  }
  return converted;
};

// Schema definisi eksplisit
const projectBaseSchema = z.object({
  title: z.string(),
  content: z.string(),
  projectLink: z.string().url(),
  githubLink: z.string().url(),
  documentationLink: z.string().url().nullable(),
  coverImageUrl: z.string().url(),
  isGroup: z.boolean(),
  status: z.enum(['draft', 'published']),
  publishedAt: z.string().datetime().nullable()
});

const projectSchemaWithId = projectBaseSchema.extend({
  id: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

// --- GET /api/projects
projects.openapi(createRoute({
  method: 'get',
  path: '/',
  request: {
    query: statusQuerySchema
  },
  responses: {
    200: {
      description: 'Daftar proyek berhasil diambil',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.array(projectSchemaWithId),
            message: z.string()
          })
        }
      }
    }
  },
  tags: ['Projects']
}), async (c) => {
  const { status } = c.req.valid('query');
  let query = db.collection('projects');
  if (status) {
    query = query.where('status', '==', status) as any;
  }
  const snapshot = await query.orderBy('createdAt', 'desc').get();
  const projectList = snapshot.docs.map(doc => ({ id: doc.id, ...convertTimestamps(doc.data()) })) as Project[];
  return c.json({ success: true, data: projectList, message: `Retrieved ${projectList.length} projects` });
});

// --- GET /api/projects/:id (INI YANG DIPERBAIKI) ---
const getProjectByIdRoute = createRoute({
  method: 'get',
  path: '/{id}',
  // Menggunakan IdParamSchema yang sudah kita perbaiki sebelumnya
  // Ini memastikan validasinya benar untuk string Firestore
  request: { 
    params: IdParamSchema
  },
  responses: {
    200: { content: { 'application/json': { schema: ApiResponseSchema(ProjectSchema) } }, description: 'Satu data proyek' },
    404: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Proyek tidak ditemukan' },
    500: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Eror server' }
  },
  tags: ['Projects']
});

projects.openapi(getProjectByIdRoute, async (c) => {
    try {
        // Logika ini sudah benar, masalahnya ada di validasi sebelumnya
        const { id } = c.req.valid('param');
        const doc = await db.collection('projects').doc(id).get();

        if (!doc.exists) {
            return c.json({ success: false, error: `Proyek dengan ID ${id} tidak ditemukan` }, 404);
        }
        
        return c.json({ success: true, data: { id: doc.id, ...convertTimestamps(doc.data()!) } });

    } catch (error: any) {
        console.error('Eror mengambil proyek:', error);
        return c.json({ success: false, error: 'Gagal mengambil data proyek.' }, 500);
    }
});

// --- POST /api/projects
projects.openapi(createRoute({
  method: 'post',
  path: '/',
  request: {
    body: {
      content: {
        'application/json': { schema: projectBaseSchema }
      }
    }
  },
  responses: {
    201: {
      description: 'Proyek berhasil dibuat',
      content: {
        'application/json': {
          schema: z.object({ success: z.literal(true), data: projectSchemaWithId, message: z.string() })
        }
      }
    }
  },
  tags: ['Projects']
}), async (c) => {
  const validatedData = c.req.valid('json');
  const now = Timestamp.now();
  const newProject = {
    ...validatedData,
    createdAt: now,
    updatedAt: now,
    publishedAt: validatedData.publishedAt ? Timestamp.fromDate(new Date(validatedData.publishedAt)) : null
  };
  const docRef = await db.collection('projects').add(newProject);
  const createdDoc = await docRef.get();
  return c.json({ success: true, data: { id: docRef.id, ...convertTimestamps(createdDoc.data()!) }, message: 'Project created successfully' }, 201);
});

// --- PUT /api/projects/:id (INI YANG DIPERBAIKI) ---
const updateProjectRoute = createRoute({
    method: 'put',
    path: '/{id}',
    request: { 
      params: IdParamSchema, 
      body: { 
        content: { 'application/json': { schema: UpdateProjectSchema } } 
      } 
    },
    responses: {
        200: { content: { 'application/json': { schema: ApiResponseSchema(ProjectSchema) } }, description: 'Proyek berhasil diperbarui' },
        404: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Proyek tidak ditemukan' },
        500: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Eror server' }
    },
    tags: ['Projects']
});
projects.openapi(updateProjectRoute, async (c) => {
    try {
        const { id } = c.req.valid('param');
        const validatedData = c.req.valid('json');
        const docRef = db.collection('projects').doc(id);

        if (!(await docRef.get()).exists) {
            return c.json({ success: false, error: `Proyek dengan ID ${id} tidak ditemukan` }, 404);
        }
        
        const updatePayload: Record<string, any> = { 
          ...validatedData, 
          updatedAt: Timestamp.now() 
        };

        // Logika ini diadopsi dari kode Anda karena lebih baik
        if ('publishedAt' in validatedData) {
            updatePayload.publishedAt = validatedData.publishedAt ? Timestamp.fromDate(new Date(validatedData.publishedAt)) : null;
        }

        await docRef.update(updatePayload);
        const updatedDoc = await docRef.get();
        return c.json({ success: true, data: { id: updatedDoc.id, ...convertTimestamps(updatedDoc.data()!) }, message: 'Proyek berhasil diperbarui' });
    } catch (error: any) {
        console.error('Eror memperbarui proyek:', error);
        return c.json({ success: false, error: 'Gagal memperbarui proyek.' }, 500);
    }
});

// DELETE /projects/:id
const deleteProjectRoute = createRoute({
    method: 'delete',
    path: '/{id}',
    request: { params: IdParamSchema },
    responses: {
        200: { content: { 'application/json': { schema: ApiResponseSchema(z.null()) } }, description: 'Proyek berhasil dihapus' },
        404: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Proyek tidak ditemukan' },
        500: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Eror server' }
    },
    tags: ['Projects']
});
projects.openapi(deleteProjectRoute, async (c) => {
    try {
        const { id } = c.req.valid('param');
        const docRef = db.collection('projects').doc(id);
        if (!(await docRef.get()).exists) {
            return c.json({ success: false, error: `Proyek dengan ID ${id} tidak ditemukan` }, 404);
        }
        await docRef.delete();
        return c.json({ success: true, data: null, message: 'Proyek berhasil dihapus' });
    } catch (error: any) {
        console.error('Eror menghapus proyek:', error);
        return c.json({ success: false, error: 'Gagal menghapus proyek.' }, 500);
    }
});

export default projects;
