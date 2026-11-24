const express = require('express');
const router = express.Router();
const {
  createEvent,
  getAllEvents,
  getEventById,
  getMyEvents,
  getEventStats,
  getEventRegistrations,
  sendManualNotification,
} = require('../controllers/eventController');
const { registerForEvent } = require('../controllers/registrationController');
const { authenticate, authorize } = require('../middleware/auth');

const upload = require('../middleware/upload');

// Organizer-specific (put before /:id routes so "my" isn't parsed as an id)
router.get('/my', authenticate, authorize('organizer'), getMyEvents);
router.post('/', authenticate, authorize('organizer'), upload.single('image'), createEvent);

// Browse events - any authenticated user (student/organizer/admin)
router.get('/', authenticate, getAllEvents);
router.get('/:id', authenticate, getEventById);

// Organizer (own event) or admin
router.get('/:id/stats', authenticate, authorize('organizer', 'admin'), getEventStats);
router.get('/:id/registrations', authenticate, authorize('organizer', 'admin'), getEventRegistrations);
router.post('/:id/notify', authenticate, authorize('organizer'), sendManualNotification);

// Student registers for an event
router.post('/:id/register', authenticate, authorize('student'), registerForEvent);

module.exports = router;
