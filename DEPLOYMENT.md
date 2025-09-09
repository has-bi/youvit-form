# 🚀 Vercel Deployment Guide

## Prerequisites
- GitHub account
- Vercel account
- PostgreSQL database (Supabase/Neon/Railway recommended)
- Google Cloud Platform account
- Google OAuth app configured

## Step 1: Database Setup

### Option A: Supabase (Recommended)
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Get your database URL from Settings > Database > Connection string
3. Run migrations:
   ```bash
   npx prisma db push
   npx prisma generate
   ```

### Option B: Neon
1. Go to [neon.tech](https://neon.tech) and create a new database
2. Copy the connection string
3. Run migrations as above

## Step 2: Google Cloud Setup

### Create Service Account
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or use existing one
3. Enable these APIs:
   - Google Sheets API
   - Google Drive API
   - Cloud Storage API
4. Create a service account:
   - IAM & Admin > Service Accounts > Create
   - Download the JSON key file
   - Grant necessary permissions

### Setup Google Cloud Storage
1. Create a new bucket for file uploads
2. Make sure the service account has Storage Admin role

### Setup Google Sheets
1. Create a new Google Sheet
2. Share the sheet with your service account email (from JSON key)
3. Give "Editor" permissions
4. Copy the spreadsheet ID from the URL

## Step 3: Vercel Deployment

### Push to GitHub
```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

### Deploy to Vercel
1. Go to [vercel.com](https://vercel.com) and connect your GitHub account
2. Import your repository
3. Configure build settings:
   - Framework Preset: Next.js
   - Build Command: Leave empty (uses vercel.json configuration)
   - Output Directory: `.next` (default)

### Environment Variables
Add these environment variables in Vercel Dashboard:

#### Required Variables
```
NEXT_PUBLIC_APP_URL=https://your-app-name.vercel.app
NEXTAUTH_URL=https://your-app-name.vercel.app
NEXTAUTH_SECRET=your-secure-secret-here-32-chars
AUTH_SECRET=same-as-nextauth-secret
DATABASE_URL=your-database-connection-string
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-secret
GCS_PROJECT_ID=your-gcp-project-id
GCS_BUCKET_NAME=your-storage-bucket-name
GOOGLE_SHEETS_PRIVATE_KEY=your-service-account-private-key
GOOGLE_SHEETS_CLIENT_EMAIL=your-service-account-email
GOOGLE_SPREADSHEET_ID=your-spreadsheet-id
GOOGLE_SHEETS_ID=your-spreadsheet-id
```

#### Important Notes:
- **NEXTAUTH_SECRET**: Generate with: `openssl rand -base64 32`
- **GOOGLE_SHEETS_PRIVATE_KEY**: Include the full private key with \\n for newlines
- **URLs**: Replace with your actual Vercel app URL

## Step 4: Google OAuth Configuration

### Update OAuth Redirect URIs
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. APIs & Services > Credentials
3. Edit your OAuth 2.0 Client
4. Add authorized redirect URIs:
   ```
   https://your-app-name.vercel.app/api/auth/callback/google
   ```

## Step 5: Post-Deployment Setup

### Database Migration
After first deployment, run:
```bash
npx prisma db push
```

### Verify Services
1. Test form submission
2. Check Google Sheets integration
3. Verify file uploads
4. Test authentication

## Troubleshooting

### Common Issues
1. **Build Failures**: Check package.json dependencies
2. **Database Connection**: Verify DATABASE_URL format
3. **Google Sheets API**: Check service account permissions
4. **File Uploads**: Verify GCS bucket permissions

### Environment Variable Format
```bash
# Correct format for private key
GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgk...\n-----END PRIVATE KEY-----\n"

# Database URL format
DATABASE_URL="postgresql://username:password@host:port/database?sslmode=require"
```

## Security Checklist
- [ ] Database connection uses SSL
- [ ] Environment variables are secure
- [ ] Service account has minimal permissions
- [ ] OAuth redirect URIs are configured
- [ ] Private keys are not in source code

## 🎯 Your App URLs
- **Production**: `https://your-app-name.vercel.app`
- **Public Form**: `https://your-app-name.vercel.app/f/your-form-id`
- **Admin Dashboard**: `https://your-app-name.vercel.app` (requires login)

## Support
If you encounter issues, check:
1. Vercel deployment logs
2. Browser console for client-side errors
3. Environment variables configuration
4. Database connectivity