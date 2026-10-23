# Yanga Frontend

Local frontend for the Yanga marketplace app. The app is a Vite + React + TanStack Router project exported from Lovable and wired to the Yanga backend API.

## Requirements

- Node.js 20 or newer
- npm

## Setup

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env
```

The default API is:

```bash
VITE_API_BASE_URL=https://afrab-dev-api-v1.onrender.com
```

Change `VITE_API_BASE_URL` only if you want to point the frontend at another backend.

## Start The App Locally

Run the dev server:

```bash
npm run dev
```

Vite will print the local URL, usually:

```text
http://localhost:8080/
```

If port `8080` is already in use, Vite will automatically use the next available port, such as:

```text
http://localhost:8081/
```

Open the exact URL printed in the terminal.

## Production Build

Build the app:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## Quality Checks

Run lint:

```bash
npm run lint
```

Format files:

```bash
npm run format
```

## Common Issues

If the app does not open on `localhost:8080`, check the terminal output. Vite may have started on another port.

If API requests fail, confirm `.env` has the correct backend URL:

```bash
VITE_API_BASE_URL=https://afrab-dev-api-v1.onrender.com
```

If dependencies are missing or the app fails after pulling new changes, run:

```bash
npm install
```

Then restart:

```bash
npm run dev
```
