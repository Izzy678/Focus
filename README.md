# Monorepo Starter Pack

A production-ready monorepo starter with Next.js frontend and NestJS backend.

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, TailwindCSS
- **Backend**: NestJS, TypeORM, PostgreSQL
- **Monorepo**: Turbo + npm workspaces

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   - Copy `apps/web/.env.example` to `apps/web/.env`
   - Copy `apps/api/.env.example` to `apps/api/.env`
   - Update the values as needed

3. **Start development servers:**
   ```bash
   npm run dev
   ```

   This will start:
   - Frontend: http://localhost:6006
   - Backend API: http://localhost:3000

## Project Structure

```
monorepo-starter/
├── apps/
│   ├── web/          # Next.js frontend
│   └── api/          # NestJS backend
├── package.json      # Root workspace config
└── turbo.json        # Turbo build config
```

## Available Scripts

- `npm run dev` - Start all apps in development mode
- `npm run build` - Build all apps
- `npm run lint` - Lint all apps
- `npm run format` - Format code with Prettier

## Development

### Frontend (apps/web)
- Runs on port 6006
- Hot reload enabled
- TypeScript strict mode

### Backend (apps/api)
- Runs on port 3000
- Hot reload enabled
- TypeORM with PostgreSQL (configured but commented out by default)

## License

MIT
