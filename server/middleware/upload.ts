import type { Context, Next } from 'hono';
import path from 'path';
import fs from 'fs';

// Ensure uploads directory exists
const uploadsDir = './uploads';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Simple file upload handler for Hono
export const uploadImage = async (c: Context, next: Next) => {
  try {
    const body = await c.req.parseBody();
    const file = body['image'] as File;

    if (!file) {
      await next();
      return;
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
    const ext = path.extname(file.name);
    const filename = `image-${uniqueSuffix}${ext}`;
    const filepath = path.join(uploadsDir, filename);

    // Save file
    const buffer = await file.arrayBuffer();
    fs.writeFileSync(filepath, new Uint8Array(buffer));

    // Generate URL
    const protocol = c.req.header('x-forwarded-proto') || 'http';
    const host = c.req.header('host') || 'localhost:5000';
    const imageUrl = `${protocol}://${host}/uploads/${filename}`;

    // Add file info to context
    c.set('uploadedFile', {
      filename,
      originalname: file.name,
      mimetype: file.type,
      size: file.size,
      url: imageUrl
    });

    await next();
  } catch (error) {
    if (error instanceof Error) {
      return c.json({
        success: false,
        error: `File upload error: ${error.message}`
      }, 400);
    }
    return c.json({
      success: false,
      error: 'File upload failed'
    }, 500);
  }
};