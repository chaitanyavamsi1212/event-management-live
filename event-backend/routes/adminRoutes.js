const express = require('express');
const router = express.Router();
const {
  getOrganizers,
  approveOrganizer,
  revokeOrganizer,
  getStudents,
  getAllEventsAdmin,
  getDashboardStats,
  createAdmin,
  updateEventImage,
} = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.use(authenticate, authorize('admin')); // everything below is admin-only

router.get('/organizers', getOrganizers);
router.put('/organizers/:id/approve', approveOrganizer);
router.put('/organizers/:id/revoke', revokeOrganizer);
router.get('/students', getStudents);
router.get('/events', getAllEventsAdmin);
router.put('/events/:id/image', upload.single('image'), updateEventImage);
router.get('/dashboard', getDashboardStats);
router.post('/create-admin', createAdmin);

module.exports = router;
