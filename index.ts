import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { cors } from "hono/cors";
import { prettyJSON } from "hono/pretty-json";
import { swaggerUI } from "@hono/swagger-ui";
import { logger } from "hono/logger";

import { Storage } from "@google-cloud/storage";
import path from "path";
import fs from "fs/promises";

import blogs from "./server/routes/blogs";
import projects from "./server/routes/projects";

// === Setup Google Cloud Credentials dari ENV jika perlu ===
// Jika di Vercel tidak bisa simpan file credentials.json, bisa simpan JSON string di env GCP_SERVICE_ACCOUNT
async function setupGcpCredentials() {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && process.env.GCP_SERVICE_ACCOUNT) {
    const saPath = '/tmp/gcp-sa.json';
    await fs.writeFile(saPath, process.env.GCP_SERVICE_ACCOUNT);
    process.env.GOOGLE_APPLICATION_CREDENTIALS = saPath;
  }
}

await setupGcpCredentials();

// Inisialisasi Google Cloud Storage
const keyFilePath = path.resolve("./bwai-460805-dc1ae9dcb44b.json");

// Inisialisasi Google Cloud Storage dengan credential file key JSON
const storage = new Storage({
  keyFilename: keyFilePath
});

const bucketName = "janda";
const bucket = storage.bucket(bucketName);

const app = new OpenAPIHono();
const port = process.env.PORT || 8787;
// const baseUrl = process.env.BASE_URL || `http://localhost:${port}`;
const baseUrl = process.env.BASE_URL || `https://bunbackendv2-production.up.railway.app`;
const imageUrl = `https://storage.googleapis.com/janda/${filename}`;


// Middleware
app.use("*", logger());
app.use("*", prettyJSON());
app.use("*", cors({
  origin: "http://localhost:5000",
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));


const ApiResponseSchema = (schema: z.ZodTypeAny) =>
  z.object({
    success: z.literal(true),
    data: schema,
    message: z.string().optional()
  });

const ErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string()
});

const UploadResponseSchema = z.object({
  filename: z.string(),
  url: z.string().url()
});

app.get('/', (c) => {
  return c.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString()
    },
    message: 'API berjalan dengan sukses menggunakan Firestore'
  });
});

const healthCheckRoute = createRoute({
  method: 'get',
  path: '/api/health',
  responses: {
    200: {
      description: 'Status kesehatan API',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.object({
              status: z.literal('healthy'),
              timestamp: z.string()
            }),
            message: z.string()
          })
        }
      }
    }
  },
  tags: ['Health']
});

app.openapi(healthCheckRoute, async (c) => {
  return c.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString()
    },
    message: 'Server dalam kondisi normal'
  });
});


app.route('/api/blogs', blogs);
app.route('/api/projects', projects);

// --- GET /api/upload
const getUploadsRoute = createRoute({
  method: 'get',
  path: '/api/upload',
  responses: {
    200: {
      description: 'Daftar semua gambar yang diunggah',
      content: {
        'application/json': {
          schema: ApiResponseSchema(z.array(UploadResponseSchema))
        }
      }
    },
    500: {
      description: 'Eror server',
      content: {
        'application/json': {
          schema: ErrorResponseSchema
        }
      }
    }
  },
  tags: ['Upload']
});

app.openapi(getUploadsRoute, async (c) => {
  try {
    // List file dari GCS bucket
    const [files] = await bucket.getFiles();

    const fileData = await Promise.all(
      files.map(async (file) => {
        const [metadata] = await file.getMetadata();
        return {
          filename: file.name,
          url: `https://storage.googleapis.com/${bucket.name}/${file.name}`,
          uploadDate: metadata.timeCreated, // ISO 8601 string
        };
      })
    );


    return c.json({ success: true, data: fileData, message: `Berhasil mengambil ${fileData.length} gambar` });
  } catch (err) {
    console.error('Gagal mengambil daftar file dari GCS:', err);
    return c.json({ success: false, error: 'Gagal mengambil daftar gambar' }, 500);
  }
});

// --- POST /api/upload
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
      description: 'Gambar berhasil diunggah',
      content: {
        'application/json': {
          schema: ApiResponseSchema(UploadResponseSchema)
        }
      }
    },
    400: {
      description: 'File tidak valid',
      content: {
        'application/json': {
          schema: ErrorResponseSchema
        }
      }
    }
  },
  tags: ['Upload']
});

app.get('/api/upload/:filename', async (c) => {
  const { filename } = c.req.param();

  const fileRef = bucket.file(`janda/${filename}`);

  const [exists] = await fileRef.exists();
  if (!exists) {
    return c.json({ error: 'File tidak ditemukan' }, 404);
  }

  const [buffer] = await fileRef.download();
  const ext = filename.split('.').pop();
  const contentType = ext === 'png' ? 'image/png'
                    : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
                    : ext === 'webp' ? 'image/webp'
                    : 'application/octet-stream';

  return new Response(buffer, {
    headers: {
      'Content-Type': contentType,
    },
  });
});


// --- DELETE /api/upload/:filename
const FilenameParamSchema = z.object({
  filename: z.string().min(1)
});

const deleteUploadRoute = createRoute({
  method: 'delete',
  path: '/api/upload/{filename}',
  request: {
    params: FilenameParamSchema
  },
  responses: {
    200: { description: 'Gambar berhasil dihapus' },
    404: {
      description: 'Gambar tidak ditemukan',
      content: { 'application/json': { schema: ErrorResponseSchema } }
    },
    500: {
      description: 'Gagal menghapus gambar',
      content: { 'application/json': { schema: ErrorResponseSchema } }
    }
  },
  tags: ['Upload']
});

app.openapi(deleteUploadRoute, async (c) => {
  const { filename } = c.req.valid('param');

  // Validasi sederhana nama file (hindari path traversal dll)
  if (!/^[a-zA-Z0-9_.-]+\.(jpg|jpeg|png|webp)$/i.test(filename)) {
    return c.json({ success: false, error: 'Nama file tidak valid' }, 400);
  }

  try {
    const fileRef = bucket.file(`janda/${filename}`); // pastikan folder path sesuai

    const [exists] = await fileRef.exists();
    if (!exists) {
      return c.json({ success: false, error: `File ${filename} tidak ditemukan` }, 404);
    }

    await fileRef.delete();

    return c.json({
      success: true,
      message: `Gambar ${filename} berhasil dihapus dari Google Cloud Storage`,
    });
  } catch (err) {
    console.error('Gagal menghapus gambar dari GCS:', err);
    return c.json({ success: false, error: 'Gagal menghapus gambar' }, 500);
  }
});

// --- OpenAPI Documentation

app.doc('/doc', {
  openapi: '3.0.0',
  info: {
    version: '1.0.0',
    title: 'Hono & Firebase API',
    description: 'REST API untuk mengelola blog dan proyek, menggunakan Hono dan Firebase Firestore.'
  },
  servers: [
    {
      url: baseUrl,  
      description: 'URL server aktif'
    }
  ]
});

app.get('/docs', swaggerUI({ url: '/doc' }));

// --- Not Found & Error Handler
app.notFound((c) => c.json({ success: false, error: 'Rute tidak ditemukan' }, 404));
app.onError((err, c) => {
  console.error('Eror tidak terduga:', err);
  return c.json({ success: false, error: 'Terjadi eror internal pada server' }, 500);
});

console.log(`✅ Server berjalan pada port ${port}`);
export default {
  port,
  fetch: app.fetch,
  hostname: '0.0.0.0'
};

console.log('BASE_URL environment variable:', process.env.BASE_URL);
console.log('Computed baseUrl:', baseUrl);
