const bcrypt = require('bcryptjs');
const pool = require('../db/pool');

// GET /api/admin/organizers?status=pending|approved|all
async function getOrganizers(req, res) {
  try {
    const { status = 'all' } = req.query;
    let query = `SELECT id, name, email, is_approved, created_at FROM users WHERE role = 'organizer'`;

    if (status === 'pending') query += ' AND is_approved = FALSE';
    if (status === 'approved') query += ' AND is_approved = TRUE';
    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query);
    return res.status(200).json({ organizers: result.rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
}

// PUT /api/admin/organizers/:id/approve
async function approveOrganizer(req, res) {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE users SET is_approved = TRUE WHERE id = $1 AND role = 'organizer'
       RETURNING id, name, email, is_approved`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Organizer not found' });
    }
    return res.status(200).json({ message: 'Organizer approved', organizer: result.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
}

// PUT /api/admin/organizers/:id/revoke  (remove organizer's approval/access)
async function revokeOrganizer(req, res) {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE users SET is_approved = FALSE WHERE id = $1 AND role = 'organizer'
       RETURNING id, name, email, is_approved`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Organizer not found' });
    }
    return res.status(200).json({ message: 'Organizer access revoked', organizer: result.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
}

// GET /api/admin/students
async function getStudents(req, res) {
  try {
    const result = await pool.query(
      `SELECT id, name, email, created_at FROM users WHERE role = 'student' ORDER BY created_at DESC`
    );
    return res.status(200).json({ students: result.rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
}

// GET /api/admin/events  - all events with registration counts
async function getAllEventsAdmin(req, res) {
  try {
    const result = await pool.query(
      `SELECT e.*, u.name AS organizer_name,
              COUNT(r.id)::int AS total_registrations,
              COALESCE(SUM(r.amount_paid), 0) AS total_revenue
       FROM events e
       JOIN users u ON u.id = e.organizer_id
       LEFT JOIN registrations r ON r.event_id = e.id
       GROUP BY e.id, u.name
       ORDER BY e.event_time DESC`
    );
    return res.status(200).json({ events: result.rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
}

// GET /api/admin/dashboard  - overall site stats
async function getDashboardStats(req, res) {
  try {
    const [studentsCount, organizersCount, eventsCount, regStats] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS count FROM users WHERE role = 'student'`),
      pool.query(`SELECT COUNT(*)::int AS count FROM users WHERE role = 'organizer' AND is_approved = TRUE`),
      pool.query(`SELECT COUNT(*)::int AS count FROM events`),
      pool.query(`SELECT COUNT(*)::int AS total_registrations, COALESCE(SUM(amount_paid), 0) AS total_revenue FROM registrations`),
    ]);

    return res.status(200).json({
      total_students: studentsCount.rows[0].count,
      total_approved_organizers: organizersCount.rows[0].count,
      total_events: eventsCount.rows[0].count,
      total_registrations: regStats.rows[0].total_registrations,
      total_revenue: regStats.rows[0].total_revenue,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
}

// POST /api/admin/create-admin  (admin only - to add another admin/faculty account)
async function createAdmin(req, res) {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'name, email and password are required' });
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, is_approved)
       VALUES ($1, $2, $3, 'admin', TRUE)
       RETURNING id, name, email, role, created_at`,
      [name, email, passwordHash]
    );

    return res.status(201).json({ message: 'Admin account created', admin: result.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
}

// PUT /api/admin/events/:id/image  (admin only - replace/moderate an event's image)
async function updateEventImage(req, res) {
  try {
    const { id } = req.params;
    if (!req.file) {
      return res.status(400).json({ message: 'No image file uploaded' });
    }
    const imageUrl = `/uploads/${req.file.filename}`;

    const result = await pool.query(
      `UPDATE events SET image_url = $1 WHERE id = $2 RETURNING *`,
      [imageUrl, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }
    return res.status(200).json({ message: 'Event image updated', event: result.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
}

module.exports = {
  getOrganizers,
  approveOrganizer,
  revokeOrganizer,
  getStudents,
  getAllEventsAdmin,
  getDashboardStats,
  createAdmin,
  updateEventImage,
};
