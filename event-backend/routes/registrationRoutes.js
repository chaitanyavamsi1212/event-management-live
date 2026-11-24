const express = require('express');
const router = express.Router();
const { confirmPayment, getMyRegistrations } = require('../controllers/registrationController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/my', authenticate, authorize('student'), getMyRegistrations);
router.post('/:registrationId/pay', authenticate, authorize('student'), confirmPayment);

module.exports = router;
