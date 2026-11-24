const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/notifications/my  (student) - notifications for events they registered for
router.get('/my', authenticate, authorize('student'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT n.id, n.message, n.sent_at, e.id AS event_id, e.title AS event_title
       FROM notifications n
       JOIN events e ON e.id = n.event_id
       JOIN registrations r ON r.event_id = e.id
       WHERE r.student_id = $1
       ORDER BY n.sent_at DESC`,
      [req.user.id]
    );
    return res.status(200).json({ notifications: result.rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
