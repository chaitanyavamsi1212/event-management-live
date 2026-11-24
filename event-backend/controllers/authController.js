const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');

function generateToken(user) {
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
  expiresIn,
});
}

// POST /api/auth/register
// Public self-registration for STUDENT and ORGANIZER only.
// Students are auto-approved. Organizers require admin approval before they can log in.
// Admin accounts are not created through this public route (see /api/admin/create-admin).
async function register(req, res) {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'name, email, password and role are required' });
    }

    if (!['student', 'organizer'].includes(role)) {
      return res.status(400).json({ message: 'role must be either student or organizer' });
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const isApproved = role === 'student'; // organizers need admin approval

    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, is_approved)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, role, is_approved, created_at`,
      [name, email, passwordHash, role, isApproved]
    );

    const user = result.rows[0];

    if (role === 'organizer') {
      return res.status(201).json({
        message: 'Organizer account created. Waiting for admin approval before you can log in.',
        user,
      });
    }

    const token = generateToken(user);
    return res.status(201).json({ message: 'Registered successfully', user, token });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error during registration' });
  }
}

// POST /api/auth/login
// Single login endpoint used by all three roles - the frontend's
// student/organizer/admin login forms can all hit this same endpoint.
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'email and password are required' });
    }

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (user.role === 'organizer' && !user.is_approved) {
      return res.status(403).json({ message: 'Your organizer account is pending admin approval' });
    }

    const token = generateToken(user);
    const { password_hash, ...safeUser } = user;

    return res.status(200).json({ message: 'Login successful', user: safeUser, token });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error during login' });
  }
}

// GET /api/auth/me
async function getProfile(req, res) {
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, is_approved, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.status(200).json({ user: result.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
}

module.exports = { register, login, getProfile };
