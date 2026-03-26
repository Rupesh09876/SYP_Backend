const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { createDoctor, getDoctors, updateDoctor, deleteDoctor } = require('../controllers/doctor.controller');
const { getPatients, updatePatient, deletePatient } = require('../controllers/patient.controller');

// Only admin can manage doctors
router.use(authenticateToken, authorizeRoles('admin'));

// Doctor CRUD
router.post('/doctors', createDoctor);
router.get('/doctors', getDoctors);
router.put('/doctors/:id', updateDoctor);
router.delete('/doctors/:id', deleteDoctor);

// Patient CRUD
router.get('/patients', getPatients);
router.put('/patients/:id', updatePatient);
router.delete('/patients/:id', deletePatient);

module.exports = router;
