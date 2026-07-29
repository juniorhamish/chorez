# Chorez - Household Chore Tracker

A clean, professional, and friendly mobile-first dashboard for managing household chores.

## Features

- **Weekly Calendar Slider**: Easily switch between days of the week.
- **Room Categories**: Filter tasks by room (Kitchen, Bathroom, etc.) and favorite your most-used categories.
- **Task List**: High-fidelity task cards with duration, assignment, and favorite toggling.
- **Task Completion Flow**: Interactive slide-up drawer for reporting actual time taken and rating the effort.
- **Modern Tech Stack**: Built with Next.js, Tailwind CSS, Framer Motion, and Lucide Icons.

## Getting Started

First, install the dependencies:

```bash
npm install
```

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the dashboard.

## Authentication (Auth0)

The "Log In" button is wired up using the [Auth0 Next.js SDK](https://github.com/auth0/nextjs-auth0) (`@auth0/nextjs-auth0`).

### 1. Create an Auth0 Application

In the [Auth0 Dashboard](https://manage.auth0.com), create a new Application of type **Regular Web Application** (not Single Page App / SPA or Native — the SDK performs the OAuth code exchange on the server, so it needs a confidential client with a client secret).

In that Application's **Settings**, configure:

- **Allowed Callback URLs**: `http://localhost:3000/auth/callback`
- **Allowed Logout URLs**: `http://localhost:3000`
- **Allowed Web Origins**: `http://localhost:3000`

(Add your production URL equivalents too once deployed, e.g. `https://your-domain.com/auth/callback`.)

### 2. Configure environment variables

Copy `.env.local.example` to `.env.local` and fill in the values from your Auth0 Application's settings page:

```bash
cp .env.local.example .env.local
```

```env
AUTH0_DOMAIN=your-tenant.us.auth0.com
AUTH0_CLIENT_ID=<from Auth0 Application settings>
AUTH0_CLIENT_SECRET=<from Auth0 Application settings>
AUTH0_SECRET=<generate with `openssl rand -hex 32`>
APP_BASE_URL=http://localhost:3000
```

`.env.local` is already git-ignored, so secrets never get committed.

### 3. Run it

Start the dev server (`npm run dev`) and click **Log In** — you'll be redirected to Auth0's Universal Login page, then back to the app once authenticated. The button automatically switches to **Log Out** when a session is active.
