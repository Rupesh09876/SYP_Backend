const express = require('express');
const router = express.Router();

const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const {
  getPatients,
  updatePatient,
  deletePatient
} = require('../controllers/patient.controller');

router.use(authenticateToken);

// get all patients
router.get('/', authorizeRoles('admin','doctor'), getPatients);

// update patient
router.put('/:id', authorizeRoles('admin'), updatePatient);

// delete patient
router.delete('/:id', authorizeRoles('admin'), deletePatient);

module.exports = router;