# PhotoMap - GPS Photo Gallery

A modern, dark-themed photo management web application built with Next.js 14, TypeScript, and Prisma. Upload photos, automatically extract GPS coordinates and EXIF data, view them on an interactive map, and manage your photo collection with an elegant interface.

## Features

- **🔐 Authentication**: Secure user registration and login with NextAuth.js
- **📸 Photo Upload**: Drag-and-drop interface for easy photo uploads
- **🗺️ GPS Extraction**: Automatically extract GPS coordinates from photo EXIF data
- **📅 Timeline**: Extract and display photo capture dates and times
- **🗺️ Interactive Map**: View all photos with GPS data on an interactive Leaflet map
- **🔍 Date Range Filter**: Filter photos by date range on the map view
- **📊 EXIF Data Display**: View detailed camera settings (ISO, aperture, shutter speed, focal length)
- **✏️ Photo Management**: Edit titles and descriptions, delete photos
- **🎨 Modern Dark UI**: Beautiful dark theme with Tailwind CSS
- **📱 Responsive Design**: Works seamlessly on desktop and mobile devices

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS v4
- **Authentication**: NextAuth.js v5
- **Database**: SQLite with Prisma ORM
- **Maps**: Leaflet with react-leaflet
- **EXIF Extraction**: exifr
- **File Upload**: react-dropzone
- **UI Components**: Headless UI

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. **Install dependencies**

```bash
npm install
```

2. **Set up environment variables**

The `.env` file already exists with default values:

```env
# Database
DATABASE_URL="file:./dev.db"

# NextAuth
NEXTAUTH_SECRET="your-secret-key-change-this-in-production"
NEXTAUTH_URL="http://localhost:3000"
```

**Important**: Change `NEXTAUTH_SECRET` to a random string in production. You can generate one with:

```bash
openssl rand -base64 32
```

3. **Set up the database**

```bash
# Generate Prisma Client
npx prisma generate

# Create the database and tables
npx prisma db push
```

4. **Run the development server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### First Time Setup

1. Navigate to `http://localhost:3000`
2. Click "Sign up" to create an account
3. Enter your email, password, and optional name
4. You'll be automatically logged in and redirected to the gallery

### Uploading Photos

1. Go to the **Gallery** page
2. Drag and drop photos into the upload area, or click to select files
3. Photos will be automatically uploaded and processed
4. EXIF data (GPS, date/time, camera settings) will be extracted automatically

### Viewing Photos

**Gallery View:**
- Browse all your photos in a responsive grid
- Click any photo to view details
- See GPS indicator on photos with location data

**Map View:**
- Switch to the "Map View" tab in navigation
- See all photos with GPS coordinates on an interactive map
- Use the date range filter to narrow down photos
- Click markers to see photo previews
- Click "View Details" in the popup to see full photo information

### Managing Photos

1. Click on any photo to open the details modal
2. **Edit**: Add or modify title and description
3. **Delete**: Remove photos from your collection
4. View comprehensive EXIF data including camera settings

## Database Management

```bash
# Open Prisma Studio (database GUI)
npx prisma studio

# Reset database
npx prisma db push --force-reset

# Generate Prisma Client after schema changes
npx prisma generate
```

## Build for Production

```bash
npm run build
npm start
```

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new).

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
