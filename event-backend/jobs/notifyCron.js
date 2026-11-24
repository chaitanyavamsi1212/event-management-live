const cron = require('node-cron');
const pool = require('../db/pool');

// Runs every minute and looks for events starting in the next 60 minutes
// (specifically in the 60-61 minute window, since the job runs every minute)
// that haven't had their automatic reminder sent yet.
function startReminderJob() {
  cron.schedule('* * * * *', async () => {
    try {
      const result = await pool.query(
        `SELECT id, title FROM events
         WHERE reminder_sent = FALSE
           AND event_time <= NOW() + INTERVAL '61 minutes'
           AND event_time >  NOW() + INTERVAL '60 minutes'`
      );

      for (const event of result.rows) {
        await pool.query(
          `INSERT INTO notifications (event_id, message)
           VALUES ($1, $2)`,
          [event.id, `Reminder: "${event.title}" starts in 1 hour.`]
        );

        await pool.query(`UPDATE events SET reminder_sent = TRUE WHERE id = $1`, [event.id]);

        // NOTE: this is where you'd actually push the notification to each
        // registered student - e.g. loop over registrations for event.id and
        // send an email (nodemailer), SMS, or push notification.
        console.log(`Reminder sent for event #${event.id} - ${event.title}`);
      }
    } catch (err) {
      console.error('Reminder cron job error:', err);
    }
  });

  console.log('Event reminder cron job started (runs every minute)');
}

module.exports = startReminderJob;
