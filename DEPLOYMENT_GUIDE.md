# 🚀 Cloud Deployment Guide for ERP

This guide provides simple, step-by-step instructions to deploy your ERP online so anyone can access it 24/7 with a secure HTTPS link.

---

## 🌟 Recommended Platform: Render.com (or Railway.app)

### Step 1: Push your code to GitHub
1. Initialize git and commit your files (if not already done):
   ```bash
   git init
   git add .
   git commit -m "ERP production ready"
   ```
2. Create a new repository on [GitHub](https://github.com/new) (make it **Private** for your company data security).
3. Link and push your code:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git branch -M main
   git push -u origin main
   ```

---

### Step 2: Deploy on Render.com
1. Sign up / Log in to [Render.com](https://render.com).
2. Click **New +** → **Web Service**.
3. Connect your GitHub repository.
4. Fill in the deployment settings:
   * **Name**: `my-company-erp` (or your preferred name)
   * **Environment**: `Node`
   * **Build Command**: `npm install && npm run build`
   * **Start Command**: `node server.js`
   * **Plan**: Free or Starter
5. Under **Advanced** → **Persistent Disk** (to preserve company data permanently):
   * **Name**: `erp-data`
   * **Mount Path**: `/var/data`
   * **Size**: 1 GB (plenty for JSON data)
6. Under **Environment Variables**, add:
   * `DATA_DIR` = `/var/data`
   * `NODE_ENV` = `production`
7. Click **Create Web Service**.

Render will automatically build the frontend, start the backend, and provide you with a permanent HTTPS link (e.g. `https://my-company-erp.onrender.com`).

---

## 🌟 Alternative: Deploy on Railway.app
1. Go to [Railway.app](https://railway.app).
2. Click **New Project** → **Deploy from GitHub repo**.
3. Select your repository.
4. Add a **Volume** (Mount path: `/var/data`).
5. Add variable `DATA_DIR` = `/var/data`.
6. Click **Deploy**. Railway will give you a public URL.

---

## 💡 Local Production Testing
To test the production build on your local machine anytime:
```bash
npm run build
node server.js
```
Then open `http://localhost:3001` in your browser.
