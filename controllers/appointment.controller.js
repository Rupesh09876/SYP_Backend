const { db } = require('../config/db');
const { appointmentsTable, usersTable, notificationsTable, billsTable } = require('../config/schema');
const { eq } = require('drizzle-orm');
const { sendSMS, sendEmail } = require('../services/notification.service');

// Helper to handle external notifications
const handleExternalNotifications = async (user, message, subject) => {
  if (!user) return;
  if (user.phone) await sendSMS(user.phone, message);
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
      <h2 style="color: #2563eb;">MediCare Hospital - Notification</h2>
      <p>${message}</p>
      <hr style="border: none; border-top: 1px solid #eee;" />
      <p style="font-size: 12px; color: #666;">This is an automated message. Please do not reply directly to this email.</p>
    </div>
  `;
  if (user.email) await sendEmail(user.email, subject, message, emailHtml);
};

// Create Appointment
const createAppointment = async (req, res) => {
  try {
    const { patient_id, doctor_id, appointment_date, notes } = req.body;

    if (!patient_id || !doctor_id || !appointment_date) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const appointmentDateObj = new Date(appointment_date);
    if (isNaN(appointmentDateObj)) {
      return res.status(400).json({ success: false, message: 'Invalid appointment date' });
    }

    const { doctorsTable } = require('../config/schema');
    const { and, ne } = require('drizzle-orm');
    
    // Check doctor availability
    const [doctor] = await db.select().from(doctorsTable).where(eq(doctorsTable.id, parseInt(doctor_id)));
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found' });

    if (doctor.availability) {
      const daysStr = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const apptDayStr = daysStr[appointmentDateObj.getDay()];
      
      const allowedDays = doctor.availability.days || [];
      if (allowedDays.length > 0 && !allowedDays.includes(apptDayStr)) {
        return res.status(400).json({ success: false, message: `Doctor is not available on ${apptDayStr}s` });
      }

      const hrs = appointmentDateObj.getHours().toString().padStart(2, '0');
      const mins = appointmentDateObj.getMinutes().toString().padStart(2, '0');
      const apptTime = `${hrs}:${mins}`;
      
      const startT = doctor.availability.startTime || '00:00';
      const endT = doctor.availability.endTime || '23:59';
      
      if (apptTime < startT || apptTime > endT) {
        return res.status(400).json({ success: false, message: `Doctor is only available between ${startT} and ${endT}` });
      }
    }

    // Check for duplicate/overlapping booking exactly at this time
    const existingAppointments = await db.select().from(appointmentsTable)
      .where(and(
         eq(appointmentsTable.doctor_id, doctor_id),
         eq(appointmentsTable.appointment_date, appointmentDateObj),
         ne(appointmentsTable.status, 'Cancelled') // Assumes Cancelled is not blocking
      ));

    if (existingAppointments.length > 0) {
      return res.status(409).json({ success: false, message: 'This time slot is already booked.' });
    }

    const [newAppointment] = await db.insert(appointmentsTable)
      .values({
        patient_id,
        doctor_id,
        appointment_date: appointmentDateObj,
        notes
      })
      .returning();

    // Fetch details for notifications
    const [patient] = await db.select().from(usersTable).where(eq(usersTable.id, parseInt(patient_id)));

    const patientName = patient ? `${patient.first_name} ${patient.last_name}` : 'Patient';
    const doctorName = doctor ? `Dr. ${doctor.last_name}` : 'Medical Specialist';
    const dateStr = appointmentDateObj.toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' });

    try {
      // 1. Notify Doctor
      await db.insert(notificationsTable).values({
        user_id: doctor_id,
        user_role: 'doctor',
        title: 'New Appointment Scheduled',
        message: `New appointment with ${patientName} on ${dateStr}.`,
        type: 'appointment',
        related_id: newAppointment.id
      });
      const doctorSms = `MediCare: New appointment with ${patientName} on ${dateStr}. Ref: #${newAppointment.id}`;
      await handleExternalNotifications(doctor, doctorSms, 'New Appointment Scheduled - MediCare');

      // 2. Notify Patient
      await db.insert(notificationsTable).values({
        user_id: patient_id,
        user_role: 'patient',
        title: 'Appointment Scheduled',
        message: `Your appointment with ${doctorName} is confirmed for ${dateStr}.`,
        type: 'appointment',
        related_id: newAppointment.id
      });
      const patientSms = `MediCare: Your appointment with ${doctorName} is confirmed for ${dateStr}. Ref: #${newAppointment.id}`;
      await handleExternalNotifications(patient, patientSms, 'Appointment Confirmation - MediCare');

    } catch (notifierErr) {
      console.error('Failed to send appointment notifications:', notifierErr);
    }

    res.status(201).json({ success: true, data: newAppointment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Update Appointment
const updateAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { appointment_date, status, notes } = req.body;

    let updateData = {};
    if (appointment_date) {
      const appointmentDateObj = new Date(appointment_date);
      if (isNaN(appointmentDateObj)) {
        return res.status(400).json({ success: false, message: 'Invalid appointment date' });
      }
      updateData.appointment_date = appointmentDateObj;
    }
    if (status) updateData.status = status;
    if (notes) updateData.notes = notes;
    updateData.updated_at = new Date();

    const [updatedAppointment] = await db.update(appointmentsTable)
      .set(updateData)
      .where(eq(appointmentsTable.id, parseInt(id)))
      .returning();

    if (!updatedAppointment) return res.status(404).json({ success: false, message: 'Appointment not found' });

    // Fetch participants for updates
    const { doctorsTable } = require('../config/schema');
    const [patient] = await db.select().from(usersTable).where(eq(usersTable.id, updatedAppointment.patient_id));
    const [doctor] = await db.select().from(doctorsTable).where(eq(doctorsTable.id, updatedAppointment.doctor_id));
    const doctorName = doctor ? `Dr. ${doctor.last_name}` : 'Medical Specialist';
    const dateStr = new Date(updatedAppointment.appointment_date).toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' });

    // Notify of changes (Simplified for focus)
    if (status || appointment_date) {
      const title = status ? `Appointment ${status}` : 'Appointment Rescheduled';
      const msg = status
        ? `Your appointment with ${doctorName} has been marked as ${status}.`
        : `Your appointment with ${doctorName} has been rescheduled to ${dateStr}.`;

      await db.insert(notificationsTable).values({
        user_id: updatedAppointment.patient_id,
        user_role: 'patient',
        title,
        message: msg,
        type: 'update',
        related_id: updatedAppointment.id
      });

      await handleExternalNotifications(patient, `MediCare: ${msg}`, `MediCare: ${title}`);
    }

    // Handle Billing if marked as Completed
    if (status === 'Completed') {
      try {
        const existingBills = await db.select().from(billsTable).where(eq(billsTable.appointment_id, parseInt(id)));
        if (existingBills.length === 0) {
          const fee = updatedAppointment.fee || 500;
          await db.insert(billsTable).values({
            appointment_id: parseInt(id),
            patient_id: updatedAppointment.patient_id,
            amount: fee,
            services: `Consultation: ${updatedAppointment.notes || 'General Visit'}`,
            status: 'Pending'
          });
          console.log(`[Auto-Billing] Bill generated for completed appointment #${id}`);
        }
      } catch (billErr) {
        console.error('Auto-billing error:', billErr);
      }
    }

    res.json({ success: true, data: updatedAppointment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Get All Appointments
const getAppointments = async (req, res) => {
  try {
    const appointments = await db.select().from(appointmentsTable);
    res.json({ success: true, data: appointments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Get Appointment by ID
const getAppointmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const [appointment] = await db.select().from(appointmentsTable).where(eq(appointmentsTable.id, parseInt(id)));
    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });
    res.json({ success: true, data: appointment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Delete Appointment
const deleteAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const [appointment] = await db.select().from(appointmentsTable).where(eq(appointmentsTable.id, parseInt(id)));

    if (appointment) {
      const { doctorsTable } = require('../config/schema');
      const [patient] = await db.select().from(usersTable).where(eq(usersTable.id, appointment.patient_id));
      const [doctor] = await db.select().from(doctorsTable).where(eq(doctorsTable.id, appointment.doctor_id));

      const dateStr = new Date(appointment.appointment_date).toLocaleDateString();
      const cancelMsg = `MediCare: Your appointment on ${dateStr} has been cancelled.`;

      // Notify Patient
      await db.insert(notificationsTable).values({
        user_id: appointment.patient_id,
        user_role: 'patient',
        title: 'Appointment Cancelled',
        message: cancelMsg,
        type: 'cancelled',
        related_id: appointment.id
      });
      await handleExternalNotifications(patient, cancelMsg, 'Appointment Cancellation - MediCare');

      // Notify Doctor
      await db.insert(notificationsTable).values({
        user_id: appointment.doctor_id,
        user_role: 'doctor',
        title: 'Appointment Cancelled',
        message: `Appointment with ${patient?.first_name || 'Patient'} on ${dateStr} has been cancelled.`,
        type: 'cancelled',
        related_id: appointment.id
      });
      await handleExternalNotifications(doctor, `MediCare: Appointment with ${patient?.first_name || 'Patient'} on ${dateStr} cancelled.`, 'Appointment Cancellation - MediCare');
    }

    await db.delete(appointmentsTable).where(eq(appointmentsTable.id, parseInt(id)));
    res.json({ success: true, message: 'Appointment deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = {
  createAppointment,
  getAppointments,
  getAppointmentById,
  updateAppointment,
  deleteAppointment
};
