const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const {
  createAppointment,
  getAppointments,
  getAppointmentById,
  updateAppointment,
  deleteAppointment
} = require('../controllers/appointment.controller');

// All routes require authentication
router.use(authenticateToken);

// Appointment CRUD
router.post('/', authorizeRoles('admin', 'doctor', 'patient'), createAppointment); // Only patient, admin, or doctor can create
router.get('/', getAppointments); // Anyone authenticated
router.get('/:id', getAppointmentById);
router.put('/:id', authorizeRoles('admin', 'doctor', 'patient'), updateAppointment);
router.delete('/:id', authorizeRoles('admin', 'doctor', 'patient'), deleteAppointment);

module.exports = router;
