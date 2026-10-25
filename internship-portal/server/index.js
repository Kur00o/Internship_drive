import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import multer from 'multer';
import { fileURLToPath } from 'node:url';
import {
  initDatabase,
  findUserByIdentifier,
  createUserCredential,
  getAllJobs,
  createJob,
  deleteJob,
  getAllUserData,
  createUserData,
} from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize SQL database
initDatabase();

const app = express();
const PORT = process.env.PORT || 5000;

// Upload directory for physical resume files
const uploadsDir = path.join(__dirname, '..', 'database', 'uploads', 'resumes');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer storage for uploaded resumes
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safeBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const unique = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    cb(null, `${safeBase}-${unique}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (_req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and DOCX files are permitted'));
    }
  },
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    database: 'SQLite (node:sqlite)',
    tables: ['user_credentials', 'job_data', 'user_data'],
  });
});

// ============================================
// 1. User Credentials Endpoints
// ============================================

// Register student credentials
app.post('/api/auth/register', (req, res) => {
  try {
    const { rollNumber, name, email, password } = req.body;

    if (!rollNumber || !name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    if (rollNumber.trim().toLowerCase() === 'admin' || email.trim().toLowerCase() === 'admin') {
      return res.status(400).json({ error: 'This identifier is reserved.' });
    }

    const existing = findUserByIdentifier(rollNumber) || findUserByIdentifier(email);
    if (existing) {
      return res.status(400).json({
        error: 'An account with this Roll Number or Email already exists. Please log in.',
      });
    }

    const id = 'user-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const created = createUserCredential({
      id,
      rollNumber,
      name,
      email,
      password,
      role: 'student',
    });

    return res.json({
      success: true,
      user: {
        role: created.role,
        name: created.name,
        email: created.email,
        rollNumber: created.roll_number,
      },
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Server error during registration.' });
  }
});

// Login credentials check (authenticates both students and secret admin)
app.post('/api/auth/login', (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Identifier and password are required.' });
    }

    const user = findUserByIdentifier(identifier);
    if (!user) {
      return res.status(401).json({
        error: 'No account found with this Roll Number/Email. Please register first.',
      });
    }

    if (user.password !== password) {
      return res.status(401).json({ error: 'Incorrect password. Please try again.' });
    }

    return res.json({
      success: true,
      user: {
        role: user.role,
        name: user.name,
        email: user.email,
        rollNumber: user.roll_number,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Server error during login.' });
  }
});

// ============================================
// 2. Job Data Endpoints
// ============================================

// Get all jobs
app.get('/api/jobs', (_req, res) => {
  try {
    const jobs = getAllJobs();
    res.json(jobs);
  } catch (err) {
    console.error('Fetch jobs error:', err);
    res.status(500).json({ error: 'Failed to fetch jobs from database.' });
  }
});

// Create new job (admin)
app.post('/api/jobs', (req, res) => {
  try {
    const {
      title,
      departmentOrCompany,
      description,
      skills,
      stipend,
      duration,
      workMode,
      domain,
      eligibility,
    } = req.body;

    if (!title || !departmentOrCompany || !description || !eligibility) {
      return res.status(400).json({ error: 'Missing required internship details.' });
    }

    const id = 'job-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const newJob = createJob({
      id,
      title,
      departmentOrCompany,
      description,
      skills: Array.isArray(skills) ? skills : (skills ? skills.split(',').map((s) => s.trim()) : []),
      stipend: stipend || '₹10,000/month',
      duration: duration || '3 months',
      workMode: workMode || 'On-Campus',
      domain: domain || 'Web Development',
      eligibility,
    });

    res.json(newJob);
  } catch (err) {
    console.error('Create job error:', err);
    res.status(500).json({ error: 'Failed to save job to database.' });
  }
});

// Delete job (admin)
app.delete('/api/jobs/:id', (req, res) => {
  try {
    const { id } = req.params;
    deleteJob(id);
    res.json({ success: true, id });
  } catch (err) {
    console.error('Delete job error:', err);
    res.status(500).json({ error: 'Failed to delete job from database.' });
  }
});

// ============================================
// 3. User Data Endpoints (Applications & Resumes)
// ============================================

// Submit student application and save user data + uploaded resume file
app.post('/api/applications', upload.single('resume'), (req, res) => {
  try {
    let candidateData = req.body.candidate;
    if (typeof candidateData === 'string') {
      candidateData = JSON.parse(candidateData);
    }

    if (!candidateData || !candidateData.rollNumber || !candidateData.name || !candidateData.email) {
      return res.status(400).json({ error: 'Candidate profile information is incomplete.' });
    }

    const resumeFileName = req.file ? req.file.filename : candidateData.resumeFileName;
    const resumeFilePath = req.file ? req.file.path : undefined;

    const id = 'app-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const saved = createUserData({
      id,
      candidate: candidateData,
      internshipId: req.body.internshipId,
      internshipTitle: req.body.internshipTitle,
      resumeFileName,
      resumeFilePath,
    });

    res.json({ success: true, application: saved });
  } catch (err) {
    console.error('Save application error:', err);
    res.status(500).json({ error: 'Failed to save application to database.' });
  }
});

// Get all student application user data (admin review)
app.get('/api/applications', (_req, res) => {
  try {
    const applications = getAllUserData();
    res.json(applications);
  } catch (err) {
    console.error('Fetch applications error:', err);
    res.status(500).json({ error: 'Failed to fetch applications from database.' });
  }
});

// Download / View uploaded student resume file
app.get('/api/resumes/:filename', (req, res) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(uploadsDir, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('Resume file not found on server.');
  }

  res.sendFile(filePath);
});

app.listen(PORT, () => {
  console.log(`[SQL Backend Server] Listening at http://localhost:${PORT}`);
});
