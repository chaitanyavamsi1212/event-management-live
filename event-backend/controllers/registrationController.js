const pool = require('../db/pool');

// POST /api/events/:id/register  (student only)
async function registerForEvent(req, res) {
  try {
    const { id } = req.params; // event id
    const studentId = req.user.id;

    const eventResult = await pool.query('SELECT * FROM events WHERE id = $1', [id]);
    if (eventResult.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }
    const event = eventResult.rows[0];

    if (new Date() > new Date(event.last_date_to_register)) {
      return res.status(400).json({ message: 'Registration deadline has passed' });
    }

    const existing = await pool.query(
      'SELECT id FROM registrations WHERE event_id = $1 AND student_id = $2',
      [id, studentId]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: 'You are already registered for this event' });
    }

    const requiresPayment = Number(event.amount) > 0;
    const paymentStatus = requiresPayment ? 'pending' : 'not_required';

    const result = await pool.query(
      `INSERT INTO registrations (event_id, student_id, payment_status, amount_paid)
       VALUES ($1, $2, $3, 0)
       RETURNING *`,
      [id, studentId, paymentStatus]
    );

    return res.status(201).json({
      message: requiresPayment
        ? 'Registered. Payment is required to confirm your spot.'
        : 'Registered successfully',
      registration: result.rows[0],
      payment_required: requiresPayment,
      amount_due: requiresPayment ? event.amount : 0,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error while registering' });
  }
}

// POST /api/registrations/:registrationId/pay  (student only)
// This is a MOCK payment confirmation endpoint for testing in Postman.
// Plug in a real gateway (Razorpay/Stripe/etc.) here later - this endpoint
// is where you'd verify the payment gateway's webhook/signature before
// marking payment_status = 'paid'.
async function confirmPayment(req, res) {
  try {
    const { registrationId } = req.params;
    const studentId = req.user.id;

    const regResult = await pool.query(
      `SELECT r.*, e.amount AS event_amount
       FROM registrations r
       JOIN events e ON e.id = r.event_id
       WHERE r.id = $1`,
      [registrationId]
    );

    if (regResult.rows.length === 0) {
      return res.status(404).json({ message: 'Registration not found' });
    }
    const registration = regResult.rows[0];

    if (registration.student_id !== studentId) {
      return res.status(403).json({ message: 'This is not your registration' });
    }

    if (registration.payment_status === 'not_required') {
      return res.status(400).json({ message: 'This event does not require payment' });
    }

    if (registration.payment_status === 'paid') {
      return res.status(400).json({ message: 'Payment already completed' });
    }

    const result = await pool.query(
      `UPDATE registrations
       SET payment_status = 'paid', amount_paid = $1
       WHERE id = $2
       RETURNING *`,
      [registration.event_amount, registrationId]
    );

    return res.status(200).json({ message: 'Payment confirmed', registration: result.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error while confirming payment' });
  }
}

// GET /api/registrations/my  (student only)
async function getMyRegistrations(req, res) {
  try {
    const result = await pool.query(
      `SELECT r.id AS registration_id, r.payment_status, r.amount_paid, r.registered_at,
              e.id AS event_id, e.title, e.venue, e.event_time, e.amount
       FROM registrations r
       JOIN events e ON e.id = r.event_id
       WHERE r.student_id = $1
       ORDER BY e.event_time ASC`,
      [req.user.id]
    );
    return res.status(200).json({ registrations: result.rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
}

module.exports = { registerForEvent, confirmPayment, getMyRegistrations };
