import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import authRoutes from './routes/authRoutes';
import premiseRoutes from './routes/premiseRoutes';
import checkpointRoutes from './routes/checkpointRoutes';
import assignmentRoutes from './routes/assignmentRoutes';
import analystAssignmentRoutes from './routes/analystAssignmentRoutes';
import checkInRoutes from './routes/checkInRoutes';
import kioskRoutes from './routes/kioskRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import alertRoutes from './routes/alertRoutes';
import overrideRoutes from './routes/overrideRoutes';
import meRoutes from './routes/meRoutes';
import { startIntervalChecker } from './cron/intervalChecker';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files for uploaded assets (e.g., premise maps)
app.use('/uploads', express.static(uploadsDir));

// Routes
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Guard Track API is running' });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/premises', premiseRoutes);
app.use('/api/v1/checkpoints', checkpointRoutes);
app.use('/api/v1/assignments', assignmentRoutes);
app.use('/api/v1/analyst-assignments', analystAssignmentRoutes);
app.use('/api/v1/checkins', checkInRoutes);
app.use('/api/v1/kiosk', kioskRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/alerts', alertRoutes);
app.use('/api/v1', overrideRoutes);
app.use('/api/v1/me', meRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  
  // Start cron jobs
  startIntervalChecker();
});
