const pool = require('../db/pool');

// POST /api/events  (organizer only, must be approved)
async function createEvent(req, res) {
  try {
    const { title, description, venue, event_time, last_date_to_register, amount } = req.body;

    if (!title || !venue || !event_time || !last_date_to_register) {
      return res.status(400).json({
        message: 'title, venue, event_time and last_date_to_register are required',
      });
    }

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const result = await pool.query(
      `INSERT INTO events (organizer_id, title, description, venue, event_time, last_date_to_register, amount, image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [req.user.id, title, description || null, venue, event_time, last_date_to_register, amount || 0, imageUrl]
    );

    return res.status(201).json({ message: 'Event created', event: result.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error while creating event' });
  }
}

// GET /api/events  (student/anyone logged in - browse all events)
async function getAllEvents(req, res) {
  try {
    const result = await pool.query(
      `SELECT e.*, u.name AS organizer_name
       FROM events e
       JOIN users u ON u.id = e.organizer_id
       ORDER BY e.event_time ASC`
    );
    return res.status(200).json({ events: result.rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error while fetching events' });
  }
}

// GET /api/events/:id
async function getEventById(req, res) {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT e.*, u.name AS organizer_name
       FROM events e
       JOIN users u ON u.id = e.organizer_id
       WHERE e.id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }
    return res.status(200).json({ event: result.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
}

// GET /api/events/my  (organizer - events they created)
async function getMyEvents(req, res) {
  try {
    const result = await pool.query(
      `SELECT * FROM events WHERE organizer_id = $1 ORDER BY event_time ASC`,
      [req.user.id]
    );
    return res.status(200).json({ events: result.rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
}

// GET /api/events/:id/stats  (organizer who owns the event, or admin)
// Returns number of registered students and total money credited
async function getEventStats(req, res) {
  try {
    const { id } = req.params;

    const eventResult = await pool.query('SELECT * FROM events WHERE id = $1', [id]);
    if (eventResult.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }
    const event = eventResult.rows[0];

    if (req.user.role === 'organizer' && event.organizer_id !== req.user.id) {
      return res.status(403).json({ message: 'You do not own this event' });
    }

    const statsResult = await pool.query(
      `SELECT
         COUNT(*)::int AS total_registrations,
         COALESCE(SUM(amount_paid), 0) AS total_revenue,
         COUNT(*) FILTER (WHERE payment_status = 'paid')::int AS paid_count,
         COUNT(*) FILTER (WHERE payment_status = 'pending')::int AS pending_count
       FROM registrations
       WHERE event_id = $1`,
      [id]
    );

    return res.status(200).json({ event, stats: statsResult.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
}

// GET /api/events/:id/registrations (organizer who owns it, or admin) - list of registered students
async function getEventRegistrations(req, res) {
  try {
    const { id } = req.params;

    const eventResult = await pool.query('SELECT * FROM events WHERE id = $1', [id]);
    if (eventResult.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }
    const event = eventResult.rows[0];

    if (req.user.role === 'organizer' && event.organizer_id !== req.user.id) {
      return res.status(403).json({ message: 'You do not own this event' });
    }

    const result = await pool.query(
      `SELECT r.id AS registration_id, r.payment_status, r.amount_paid, r.registered_at,
              u.id AS student_id, u.name AS student_name, u.email AS student_email
       FROM registrations r
       JOIN users u ON u.id = r.student_id
       WHERE r.event_id = $1
       ORDER BY r.registered_at ASC`,
      [id]
    );

    return res.status(200).json({ registrations: result.rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
}

// POST /api/events/:id/notify  (organizer who owns the event) - manually send a notification now
// The automatic "1 hour before" notification is handled by jobs/notifyCron.js
async function sendManualNotification(req, res) {
  try {
    const { id } = req.params;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ message: 'message is required' });
    }

    const eventResult = await pool.query('SELECT * FROM events WHERE id = $1', [id]);
    if (eventResult.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }
    const event = eventResult.rows[0];

    if (req.user.role === 'organizer' && event.organizer_id !== req.user.id) {
      return res.status(403).json({ message: 'You do not own this event' });
    }

    const result = await pool.query(
      `INSERT INTO notifications (event_id, message) VALUES ($1, $2) RETURNING *`,
      [id, message]
    );

    // NOTE: actual email/SMS/push delivery to each registered student would be
    // wired in here (e.g. via nodemailer). For now the notification is stored
    // and can be polled/fetched by the frontend.

    return res.status(201).json({ message: 'Notification sent', notification: result.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
}

module.exports = {
  createEvent,
  getAllEvents,
  getEventById,
  getMyEvents,
  getEventStats,
  getEventRegistrations,
  sendManualNotification,
};
