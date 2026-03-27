# Deploying HRIS Philippine Payroll to Vercel

A step-by-step, beginner-friendly guide to deploy this HRIS system on Vercel's **free tier** (Hobby plan).

---

## Prerequisites

Before you begin, make sure you have:

- A **GitHub** account (free) — [Sign up here](https://github.com/join)
- A **Vercel** account (free) — [Sign up here](https://vercel.com/signup) (use your GitHub account)
- Your HRIS project code pushed to a GitHub repository

---

## Step 1: Push Your Code to GitHub

If you haven't already, create a GitHub repository and push your code:

```bash
# Initialize git (if not already done)
cd /path/to/hris_ph_payroll
git init
git add .
git commit -m "Initial commit - HRIS Philippine Payroll"

# Create a new repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/hris-ph-payroll.git
git branch -M main
git push -u origin main
```

> ⚠️ **Important:** Make sure `.env` is listed in `.gitignore` so your secrets are never pushed to GitHub.

---

## Step 2: Create a Vercel Account

1. Go to [vercel.com/signup](https://vercel.com/signup)
2. Click **"Continue with GitHub"**
3. Authorize Vercel to access your GitHub account
4. You're now on the **Hobby (Free)** plan

---

## Step 3: Set Up a PostgreSQL Database

You need a PostgreSQL database accessible from the internet. Here are your options:

### Option A: Vercel Postgres (Recommended for Beginners)

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Storage"** in the top navigation
3. Click **"Create Database"** → Select **"Postgres"**
4. Choose a name (e.g., `hris-db`) and region (choose one close to you, e.g., **Singapore** `sin1` for Philippines)
5. Click **"Create"**
6. Go to the **".env.local"** tab — copy the `POSTGRES_PRISMA_URL` value
7. This will be your `DATABASE_URL`

### Option B: Neon (Free Tier — Recommended)

1. Go to [neon.tech](https://neon.tech) and sign up (free)
2. Create a new project
3. Copy the connection string from the dashboard
4. It looks like: `postgres://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require`

### Option C: Supabase (Free Tier)

1. Go to [supabase.com](https://supabase.com) and sign up (free)
2. Create a new project
3. Go to **Settings** → **Database** → Copy the **Connection string (URI)**

### Option D: Railway (Free Trial)

1. Go to [railway.app](https://railway.app) and sign up
2. Create a new project → Add **PostgreSQL**
3. Copy the connection string from the **Connect** tab

---

## Step 4: Deploy to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **"Import"** next to your `hris-ph-payroll` repository
3. Vercel will auto-detect it as a **Next.js** project
4. **Before clicking Deploy**, configure the environment variables (next step)

---

## Step 5: Configure Environment Variables

In the Vercel deployment screen (or later in **Project Settings** → **Environment Variables**), add the following:

| Variable | Value | Notes |
|----------|-------|-------|
| `DATABASE_URL` | `postgres://user:pass@host/db?sslmode=require` | Your PostgreSQL connection string from Step 3 |
| `NEXTAUTH_SECRET` | (random string) | Generate with: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `https://your-project.vercel.app` | Your Vercel deployment URL (update after first deploy) |

### How to Generate NEXTAUTH_SECRET

Run this in your terminal:

```bash
openssl rand -base64 32
```

Copy the output and paste it as the value for `NEXTAUTH_SECRET`.

> 💡 **Tip:** After your first deployment, Vercel will give you a URL like `https://hris-ph-payroll.vercel.app`. Update `NEXTAUTH_URL` to match this URL.

### Optional Variables (for document storage)

| Variable | Value | Notes |
|----------|-------|-------|
| `AWS_ACCESS_KEY_ID` | Your AWS access key | Only if using S3 for document storage |
| `AWS_SECRET_ACCESS_KEY` | Your AWS secret key | Only if using S3 for document storage |
| `AWS_REGION` | `ap-southeast-1` | AWS region |
| `AWS_BUCKET_NAME` | `your-bucket-name` | S3 bucket name |

---

## Step 6: Deploy

1. Click **"Deploy"** in the Vercel dashboard
2. Wait for the build to complete (usually 2-5 minutes)
3. Vercel will show you your deployment URL (e.g., `https://hris-ph-payroll.vercel.app`)

---

## Step 7: Set Up the Database Schema

After the first deployment, you need to create the database tables and seed initial data. You have two options:

### Option A: Using Vercel CLI (Recommended)

Install the Vercel CLI and run commands locally:

```bash
# Install Vercel CLI globally
npm install -g vercel

# Link your local project to the Vercel project
vercel link

# Pull environment variables from Vercel to your local .env
vercel env pull .env.local

# Now run Prisma commands using the production database URL
# Push the schema to create tables
npx prisma db push

# Seed the database with initial data (departments, roles, default users)
npx prisma db seed
```

### Option B: Using Local Terminal with Production Database URL

1. Copy your `DATABASE_URL` from Vercel
2. Set it temporarily in your terminal:

```bash
# On macOS/Linux:
export DATABASE_URL="postgres://user:pass@host/db?sslmode=require"

# On Windows (PowerShell):
$env:DATABASE_URL="postgres://user:pass@host/db?sslmode=require"
```

3. Run the database commands:

```bash
# Create tables
npx prisma db push

# Seed initial data
npx prisma db seed
```

> ⚠️ **What does seeding do?** It creates:
> - Default departments (Engineering, HR, Finance, Operations)
> - Standard job roles
> - Default user accounts (Admin, HR, Finance)
> - Loan types, allowance types, leave types
> - System settings

---

## Step 8: Access Your Deployed Application

1. Open your Vercel deployment URL (e.g., `https://hris-ph-payroll.vercel.app`)
2. Log in with the default credentials:

| Role | Email | Password |
|------|-------|----------|
| **Admin** | `admin@hris.local` | `admin123` |
| **HR Manager** | `hr@hris.local` | `hr123456` |
| **Finance** | `finance@hris.local` | `finance123` |

3. **⚠️ IMPORTANT:** Change these default passwords immediately after your first login!

---

## Step 9: Update NEXTAUTH_URL

After your first deploy, update the `NEXTAUTH_URL` environment variable:

1. Go to your Vercel project → **Settings** → **Environment Variables**
2. Edit `NEXTAUTH_URL` to your actual deployment URL (e.g., `https://hris-ph-payroll.vercel.app`)
3. Click **Save**
4. Go to **Deployments** → Click the three dots on the latest deployment → **Redeploy**

---

## Custom Domain (Optional)

To use your own domain (e.g., `hris.yourcompany.com`):

1. Go to your Vercel project → **Settings** → **Domains**
2. Add your domain
3. Update the DNS records as shown by Vercel
4. Update `NEXTAUTH_URL` to your custom domain
5. Redeploy

---

## Troubleshooting

### Build Fails with Prisma Error

**Problem:** `Error: @prisma/client did not initialize yet`

**Solution:** The `postinstall` script should run `prisma generate` automatically. If it doesn't:
1. Go to Vercel project → **Settings** → **General**
2. Set **Build Command** to: `prisma generate && next build`

---

### "Invalid DATABASE_URL" Error

**Problem:** The database connection string is incorrect.

**Solution:**
- Make sure the connection string includes `?sslmode=require` for cloud databases
- Verify there are no extra spaces or quotes in the Vercel environment variable
- Test the connection locally first: `npx prisma db pull`

---

### Login Doesn't Work / Session Issues

**Problem:** After login, you're redirected back to the login page.

**Solution:**
- Make sure `NEXTAUTH_SECRET` is set in Vercel environment variables
- Make sure `NEXTAUTH_URL` matches your deployment URL exactly (including `https://`)
- Redeploy after updating environment variables

---

### "NEXTAUTH_URL" Warning

**Problem:** You see a warning about `NEXTAUTH_URL` not being set.

**Solution:**
- Vercel automatically sets `VERCEL_URL`, but NextAuth needs `NEXTAUTH_URL`
- Explicitly set `NEXTAUTH_URL` to your full deployment URL with `https://`

---

### Database Seed Fails

**Problem:** `npx prisma db seed` fails with connection errors.

**Solution:**
- Make sure you're using the correct `DATABASE_URL` with the production connection string
- For Neon: Use the connection string from the Neon dashboard (not the pooled one for seeding)
- Try: `npx prisma db push` first, then `npx prisma db seed`

---

### Slow API Responses / Timeout

**Problem:** Some API routes are slow or timing out.

**Solution:**
- This is common on the free tier due to cold starts
- Vercel Hobby plan has a 10-second function timeout (60s on Pro)
- Consider upgrading to Pro if you need faster responses
- Use a database in the same region as your Vercel deployment

---

## Vercel Free Tier Limits

The Hobby (free) plan includes:
- **Bandwidth:** 100 GB/month
- **Serverless Function Execution:** 100 GB-hours/month
- **Build Time:** 6,000 minutes/month
- **Function Duration:** 10 seconds max (60s on Pro)
- **1 Team Member**

For a small-to-medium company HRIS, the free tier is usually sufficient. Monitor your usage in the Vercel dashboard under **Usage**.

---

## Deployment Checklist

- [ ] Code pushed to GitHub
- [ ] Vercel account created
- [ ] PostgreSQL database provisioned
- [ ] Environment variables configured in Vercel:
  - [ ] `DATABASE_URL`
  - [ ] `NEXTAUTH_SECRET`
  - [ ] `NEXTAUTH_URL`
- [ ] Deployed successfully on Vercel
- [ ] Database schema pushed (`npx prisma db push`)
- [ ] Database seeded (`npx prisma db seed`)
- [ ] Can log in with default credentials
- [ ] Default passwords changed
- [ ] `NEXTAUTH_URL` updated to actual deployment URL
- [ ] Redeployed after URL update

---

## Getting Help

- **Vercel Documentation:** [vercel.com/docs](https://vercel.com/docs)
- **Prisma Documentation:** [prisma.io/docs](https://www.prisma.io/docs)
- **NextAuth.js Documentation:** [next-auth.js.org](https://next-auth.js.org)
- **Neon Documentation:** [neon.tech/docs](https://neon.tech/docs)
