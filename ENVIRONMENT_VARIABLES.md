# Environment Variables Reference

> Complete reference for every environment variable used by the HRIS Philippine Payroll application.

---

## Required Variables

These **must** be set for the application to start.

| Variable | Example | Where to Set |
|---|---|---|
| `DATABASE_URL` | `postgresql://user:pass@host:5432/db?sslmode=require` | Vercel → Settings → Env Vars |
| `NEXTAUTH_SECRET` | `k8Jd9f…` (32+ chars) | Vercel → Settings → Env Vars |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` | Vercel → Settings → Env Vars |

### `DATABASE_URL`

| | |
|---|---|
| **Purpose** | PostgreSQL connection string used by Prisma ORM for all database operations. |
| **Format** | `postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require` |
| **Required** | ✅ Yes — the app will not build or run without it. |
| **Scopes** | Production, Preview, Development |

**Provider-specific examples:**

```bash
# Neon (recommended — has free tier & Vercel integration)
DATABASE_URL="postgresql://user:pass@ep-cool-rain-123456.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Supabase
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres"

# Railway
DATABASE_URL="postgresql://postgres:[password]@roundhouse.proxy.rlwy.net:12345/railway"
```

> ⚠️ Always include `?sslmode=require` for cloud-hosted databases.

---

### `NEXTAUTH_SECRET`

| | |
|---|---|
| **Purpose** | Secret key used by NextAuth.js to sign/encrypt session tokens and JWTs. |
| **Format** | Any random string, 32+ characters recommended. |
| **Required** | ✅ Yes |
| **Scopes** | Production, Preview, Development |

Generate a strong secret:

```bash
openssl rand -base64 32
```

> 🔒 Never commit this value to Git. Never reuse the same secret across environments.

---

### `NEXTAUTH_URL`

| | |
|---|---|
| **Purpose** | The canonical base URL of the application. NextAuth uses it for callback redirects, CSRF checks, and email links. |
| **Format** | Full URL with protocol, no trailing slash. |
| **Required** | ✅ Yes (Vercel auto-sets `VERCEL_URL`, but NextAuth needs this explicitly for custom domains) |
| **Scopes** | Production, Preview, Development |

```bash
# Local development
NEXTAUTH_URL="http://localhost:3000"

# Vercel default domain
NEXTAUTH_URL="https://your-project.vercel.app"

# Custom domain
NEXTAUTH_URL="https://hris.yourcompany.com"
```

---

## Optional Variables — AWS S3 (Document Storage)

These are needed **only** if you want to enable file uploads (payslips, employee documents, company logos, etc.). If omitted, upload features will be disabled.

| Variable | Example | Description |
|---|---|---|
| `AWS_ACCESS_KEY_ID` | `AKIA3EXAMPLE…` | IAM user access key with S3 permissions |
| `AWS_SECRET_ACCESS_KEY` | `wJal…` | Corresponding IAM secret key |
| `AWS_REGION` | `ap-southeast-1` | AWS region where the S3 bucket is located |
| `AWS_BUCKET_NAME` | `hris-payroll-docs` | Name of the S3 bucket |
| `AWS_FOLDER_PREFIX` | `hris/` | Key prefix to namespace all uploaded objects |
| `NEXT_PUBLIC_AWS_REGION` | `ap-southeast-1` | Client-side region hint (exposed to browser) |

### IAM Policy (minimum permissions)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::YOUR_BUCKET_NAME",
        "arn:aws:s3:::YOUR_BUCKET_NAME/*"
      ]
    }
  ]
}
```

---

## Auto-Set by Vercel (Do Not Override)

| Variable | Description |
|---|---|
| `NODE_ENV` | Set to `production` automatically during builds. |
| `VERCEL` | Set to `1` on Vercel deployments. |
| `VERCEL_URL` | The deployment URL (without protocol). |
| `VERCEL_ENV` | `production`, `preview`, or `development`. |

---

## Environment Scopes in Vercel

When adding variables in the Vercel dashboard, you can choose which environments they apply to:

| Scope | When it applies |
|---|---|
| **Production** | The live deployment on your primary domain. |
| **Preview** | Deployments from non-production branches (PRs). |
| **Development** | Used when running `vercel dev` locally. |

**Recommendation:** Set `DATABASE_URL`, `NEXTAUTH_SECRET`, and `NEXTAUTH_URL` for **all three scopes** (use different database URLs / secrets for Preview if you want isolation).
