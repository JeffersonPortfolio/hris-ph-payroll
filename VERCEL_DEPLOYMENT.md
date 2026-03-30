# Deploying HRIS Philippine Payroll to Vercel

> Step-by-step guide to deploy this **Philippine-based** HRIS and payroll system to your own Vercel account with a cloud-hosted PostgreSQL database.

> **🇵🇭 Region Note:** This application is designed for Philippine-based companies and employees. Vercel does not have a data center in the Philippines. The closest available Vercel regions are:
> - **Singapore (`sin1`)** — ~2,400 km from Manila, lowest latency for most PH users
> - **Hong Kong (`hkg1`)** — ~1,100 km from Manila, also a good option
>
> The default configuration uses Singapore (`sin1`). You can change this in `vercel.json`, or remove the `"regions"` key entirely to let Vercel auto-select the best region based on incoming traffic.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Set Up a PostgreSQL Database](#2-set-up-a-postgresql-database)
3. [Prepare Your Git Repository](#3-prepare-your-git-repository)
4. [Deploy to Vercel](#4-deploy-to-vercel)
5. [Configure Environment Variables](#5-configure-environment-variables)
6. [Post-Deployment: Migrations & Seeding](#6-post-deployment-migrations--seeding)
7. [Custom Domain (Optional)](#7-custom-domain-optional)
8. [Optional: AWS S3 for File Uploads](#8-optional-aws-s3-for-file-uploads)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Prerequisites

Before you begin, make sure you have:

| Requirement | Notes |
|---|---|
| **Vercel account** | Free tier works. Sign up at [vercel.com](https://vercel.com). |
| **GitHub / GitLab / Bitbucket account** | To host your repository. GitHub is the easiest with Vercel. |
| **PostgreSQL database** | Cloud-hosted. See [Section 2](#2-set-up-a-postgresql-database) for provider options. |
| **Node.js 18+** installed locally | For running migrations. Download from [nodejs.org](https://nodejs.org). |
| **Git** installed locally | To push code to your repository. |

---

## 2. Set Up a PostgreSQL Database

Your database must be accessible from the internet (Vercel's serverless functions will connect to it). Choose **one** of the providers below.

### Option A — Neon (Recommended)

Neon offers a generous free tier and has a native Vercel integration.

1. Go to [neon.tech](https://neon.tech) and create a free account.
2. Click **New Project** → choose a name and region. For Philippine users, pick **Singapore (`ap-southeast-1`)** or **Southeast Asia** as the closest available region.
3. Once created, copy the **connection string** from the dashboard. It looks like:
   ```
   postgresql://neondb_owner:abc123@ep-cool-rain-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
4. Save this — you'll use it as `DATABASE_URL`.

### Option B — Supabase

1. Go to [supabase.com](https://supabase.com) and create a project.
2. Navigate to **Settings → Database → Connection string → URI**.
3. Copy the connection string (use the **Session mode / pooler** URL for best Vercel compatibility):
   ```
   postgresql://postgres.[ref]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
   ```

### Option C — Railway

1. Go to [railway.app](https://railway.app) and create a new project.
2. Click **+ New** → **Database** → **PostgreSQL**.
3. Go to the PostgreSQL service → **Variables** tab → copy `DATABASE_URL`.

> 💡 **Tip:** Whichever provider you choose, make sure the connection string includes `?sslmode=require` at the end.

---

## 3. Prepare Your Git Repository

### 3a. Create a new GitHub repository

1. Go to [github.com/new](https://github.com/new).
2. Name it (e.g., `hris-ph-payroll`), set it to **Private**, and click **Create repository**.

### 3b. Push the code

From your local machine, in the project directory:

```bash
# If git is not yet initialized (it already is in this project)
# git init

# Add the remote
git remote add origin https://github.com/YOUR_USERNAME/hris-ph-payroll.git

# Stage all files
git add .

# Commit
git commit -m "Initial commit — HRIS Philippine Payroll"

# Push
git push -u origin main
```

### 3c. Verify sensitive files are excluded

The `.gitignore` already excludes:
- `.env` and `.env.local` (your secrets)
- `node_modules/`
- `.next/` (build output)
- `.vercel/`

Double-check that your `.env` file **is not** in the commit by running:
```bash
git ls-files .env
# Should return nothing
```

---

## 4. Deploy to Vercel

### 4a. Import your repository

1. Log in to [vercel.com/dashboard](https://vercel.com/dashboard).
2. Click **Add New…** → **Project**.
3. Under **Import Git Repository**, find your `hris-ph-payroll` repo and click **Import**.

### 4b. Configure the project

Vercel will auto-detect the Next.js framework. Verify these settings:

| Setting | Value |
|---|---|
| **Framework Preset** | Next.js |
| **Root Directory** | `./` (default) |
| **Build Command** | `prisma generate && next build` (auto-detected from `vercel.json`) |
| **Install Command** | `npm install` |
| **Output Directory** | Leave blank (Next.js default) |

### 4c. Add Environment Variables (before first deploy)

Before clicking **Deploy**, expand the **Environment Variables** section and add:

| Key | Value |
|---|---|
| `DATABASE_URL` | Your PostgreSQL connection string from Step 2 |
| `NEXTAUTH_SECRET` | Run `openssl rand -base64 32` and paste the output |
| `NEXTAUTH_URL` | `https://your-project-name.vercel.app` (you'll see the URL after first deploy — you can update this) |

> Set all three to apply to **Production**, **Preview**, and **Development** scopes.

### 4d. Click Deploy

Vercel will install dependencies, run `prisma generate`, and build the Next.js app. The first deploy typically takes 2-3 minutes.

If the build succeeds, you'll see a **Congratulations** page with your deployment URL.

---

## 5. Configure Environment Variables

If you need to add or change environment variables after the first deploy:

1. Go to your project on [vercel.com](https://vercel.com).
2. Click **Settings** → **Environment Variables**.
3. Add/edit variables as needed.
4. **Important:** After changing environment variables, you must **redeploy** for changes to take effect.
   - Go to **Deployments** → click the three-dot menu on the latest deployment → **Redeploy**.

See [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md) for the complete reference of all variables.

---

## 6. Post-Deployment: Migrations & Seeding

After your first successful Vercel deploy, the database tables don't exist yet. You need to run Prisma migrations and optionally seed the database.

### 6a. Run migrations from your local machine

Make sure your local `.env` file has the **same** `DATABASE_URL` as your Vercel production environment (pointing to your cloud database).

```bash
# Install dependencies if you haven't
npm install

# Run Prisma migrations against the cloud database
npx prisma migrate deploy
```

This applies all migrations in `prisma/migrations/` to your cloud database.

### 6b. Seed the database (initial data)

The seed script creates the default Super Admin account, demo company, Philippine holidays, and sample data.

```bash
npm run db:seed
```

### 6c. Alternative: Use `prisma db push` (quick setup without migration history)

If you just want to sync the schema without tracking migration history:

```bash
npx prisma db push
```

> ⚠️ `db push` is simpler but doesn't create migration records. Use `migrate deploy` for production.

### 6d. Verify the deployment

1. Open your Vercel deployment URL.
2. You should see the login page.
3. Log in with the default Super Admin credentials created by the seed script.
4. Navigate through the dashboard to verify everything works.

---

## 7. Custom Domain (Optional)

1. In your Vercel project, go to **Settings** → **Domains**.
2. Enter your domain (e.g., `hris.yourcompany.com`) and click **Add**.
3. Vercel will show DNS records to add at your domain registrar:
   - For apex domain: Add an **A record** pointing to `76.76.21.21`
   - For subdomain: Add a **CNAME record** pointing to `cname.vercel-dns.com`
4. After DNS propagates, update your `NEXTAUTH_URL` environment variable to match:
   ```
   NEXTAUTH_URL=https://hris.yourcompany.com
   ```
5. Redeploy for the change to take effect.

---

## 8. Optional: AWS S3 for File Uploads

If you need document upload functionality (payslips, employee files):

1. Create an S3 bucket in your preferred AWS region.
2. Create an IAM user with S3 access (see [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md) for the minimum IAM policy).
3. Add these environment variables in Vercel:

| Key | Value |
|---|---|
| `AWS_ACCESS_KEY_ID` | Your IAM access key |
| `AWS_SECRET_ACCESS_KEY` | Your IAM secret key |
| `AWS_REGION` | e.g., `ap-southeast-1` |
| `AWS_BUCKET_NAME` | Your bucket name |
| `AWS_FOLDER_PREFIX` | e.g., `hris/` |
| `NEXT_PUBLIC_AWS_REGION` | Same as `AWS_REGION` |

4. Configure CORS on your S3 bucket to allow uploads from your Vercel domain:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["https://your-project.vercel.app"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

5. Redeploy.

---

## 9. Troubleshooting

### Build fails with Prisma error

**Symptom:** `Error: @prisma/client did not initialize yet`

**Fix:** The `vercel.json` build command already includes `prisma generate`. If you still see this error, ensure the `postinstall` script is in `package.json`:
```json
"postinstall": "prisma generate"
```

---

### Build fails with "Can't find the binary target"

**Symptom:** `PrismaClientInitializationError: Unable to require ... for debian-openssl-3.0.x`

**Fix:** The Prisma schema already includes the required binary target:
```prisma
binaryTargets = ["native", "rhel-openssl-3.0.x", "debian-openssl-3.0.x"]
```

If you still get errors, check that `prisma/schema.prisma` has the above line.

---

### "NEXTAUTH_URL" mismatch / redirect errors

**Symptom:** Login redirects to wrong URL, or you get CSRF errors.

**Fix:** Make sure `NEXTAUTH_URL` exactly matches your deployment URL:
- Include the protocol (`https://`)
- No trailing slash
- If using a custom domain, use that domain, not the `.vercel.app` URL

---

### Database connection timeouts

**Symptom:** `Error: Can't reach database server at ...`

**Fixes:**
1. Verify `DATABASE_URL` is correct in Vercel environment variables.
2. Ensure `?sslmode=require` is in the connection string.
3. Check that your database provider allows connections from external IPs (Vercel does not have a fixed IP range).
4. If using Supabase, make sure you're using the **pooler** connection URL.

---

### Function timeout on API routes

**Symptom:** `FUNCTION_INVOCATION_TIMEOUT` on API calls.

**Fix:** The `vercel.json` sets a 30-second timeout for API routes. For long-running operations like payroll calculations, consider:
- Upgrading to Vercel Pro (allows up to 300s).
- Breaking large operations into smaller chunks.

---

### Seed script fails

**Symptom:** Errors when running `npm run db:seed`.

**Fixes:**
1. Ensure migrations have been applied first (`npx prisma migrate deploy`).
2. Ensure your local `.env` has the correct `DATABASE_URL` pointing to the cloud database.
3. Check that the `tsx` package is installed: `npm install`.

---

## Quick Reference — Deployment Checklist

```
☐  Cloud PostgreSQL database created (Neon / Supabase / Railway)
☐  Git repository created and code pushed
☐  Vercel project imported from repository
☐  DATABASE_URL set in Vercel environment variables
☐  NEXTAUTH_SECRET set in Vercel environment variables
☐  NEXTAUTH_URL set in Vercel environment variables
☐  First deploy successful (build passes)
☐  Prisma migrations applied: npx prisma migrate deploy
☐  Database seeded: npm run db:seed
☐  Login tested on deployed URL
☐  (Optional) Custom domain configured
☐  (Optional) AWS S3 variables added for file uploads
```
