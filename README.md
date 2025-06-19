# 🧾 Blogging & Project Management API

A RESTful API for managing **blogs**, **projects**, and **image uploads**, built using [Hono](https://hono.dev/) and [Firebase Firestore](https://firebase.google.com/docs/firestore), with image storage powered by **Google Cloud Storage**.

## 🔗 API Base URL

[https://bunbackendv2-production.up.railway.app](https://bunbackendv2-production.up.railway.app)

---

## 📦 Main Features

* ✅ **Blog CRUD** – Create, retrieve, update, and delete blog entries
* ✅ **Project CRUD** – Manage projects with links and documentation
* ✅ **Image Upload** – Upload and delete images via Google Cloud Storage
* ✅ **Health Check** – Simple API status endpoint

---

## 🧠 Tech Stack

* ⚡ [Bun](https://bun.sh) + [Hono](https://hono.dev) – Lightweight and fast REST framework
* 🔥 [Firebase Firestore](https://firebase.google.com/docs/firestore) – NoSQL database
* ☁️ [Google Cloud Storage](https://cloud.google.com/storage) – Image file storage
* 🚉 Hosted and deployed with [Railway](https://railway.app)

---

## 🛠️ API Endpoints

### 📍 Health Check

* `GET /api/health`
  Check if the server is running properly.

---

### 📝 Blog Endpoints

* `GET /api/blogs?status=draft|published`
  Get list of blogs filtered by status.

* `POST /api/blogs`
  Create a new blog.

* `GET /api/blogs/{id}`
  Get a specific blog by its ID.

* `PUT /api/blogs/{id}`
  Update an existing blog.

* `DELETE /api/blogs/{id}`
  Delete a blog.

---

### 💼 Project Endpoints

* `GET /api/projects?status=draft|published`
  Get all projects filtered by status.

* `POST /api/projects`
  Add a new project.

* `GET /api/projects/{id}`
  Get project details by ID.

* `PUT /api/projects/{id}`
  Update a project.

* `DELETE /api/projects/{id}`
  Delete a project.

---

### 🖼️ Image Upload Endpoints

* `GET /api/upload`
  Get all uploaded images.

* `POST /api/upload`
  Upload an image (form-data field: `image`).

* `DELETE /api/upload/{filename}`
  Delete an image by its filename.

---

## 🔒 Status & Validation

* Endpoints support filtering by `status: draft | published`.
* Validation is implemented for:

  * Empty strings
  * URL formatting
  * Valid image file uploads

---

## 📘 OpenAPI Documentation

You can view the API specification using Swagger UI:

* [Open in Swagger Editor](https://editor.swagger.io/)
* Or import from a local `openapi.json` file.

---

## 🚀 Deployment

This project is deployed via [Railway](https://railway.app).
It is built using **Bun** and **Docker** for fast and lightweight deployment.

---

## 👨‍💻 Contributors

* Developed by [Naufal Fahri Salim](https://github.com/nfahrisalim)
* Powered by: **Bun**, **Firebase**, **Google Cloud Platform**, and **Hono**

---
