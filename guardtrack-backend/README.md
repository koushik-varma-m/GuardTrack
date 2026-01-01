# Guard Track Backend

Backend API for the Guard Monitoring System built with Node.js, TypeScript, Express, Prisma, and PostgreSQL.

## Prerequisites

- Node.js (LTS version)
- PostgreSQL
- npm or yarn

## Setup Instructions

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   - Copy `.env.example` to `.env`
   - Update the `DATABASE_URL` with your PostgreSQL credentials
   - Update `JWT_SECRET` with a secure random string
   - Adjust `PORT` if needed (default: 4000)

3. **Set up the database:**
   ```bash
   npx prisma migrate dev
   ```

4. **Generate Prisma Client:**
   ```bash
   npx prisma generate
   ```

5. **Run the development server:**
   ```bash
   npm run dev
   ```

The server will start on `http://localhost:4000` (or the port specified in your `.env` file).

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build the project for production
- `npm run start` - Start the production server
- `npm run prisma:generate` - Generate Prisma Client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio to view/edit database

## Project Structure

```
/src
  /routes       - API route definitions
  /controllers  - Request handlers
  /services     - Business logic
  /middleware   - Express middleware
  /utils        - Utility functions
  /config       - Configuration files
  /cron         - Scheduled tasks
  server.ts     - Application entry point
```

## Health Check

Once the server is running, you can check if it's working by visiting:
```
GET http://localhost:4000/health
```

