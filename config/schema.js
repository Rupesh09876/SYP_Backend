// backend/config/schema.js
const { pgTable, serial, integer, text, timestamp, boolean, varchar, numeric, jsonb } = require('drizzle-orm/pg-core');

const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password_hash: text('password_hash').notNull(),
  role: varchar('role', { length: 20 }).notNull().default('patient'),
  first_name: varchar('first_name', { length: 100 }).notNull(),
  last_name: varchar('last_name', { length: 100 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  subscription_tier: varchar('subscription_tier', { length: 20 }).default('free'),
  subscription_expiry: timestamp('subscription_expiry'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

const doctorsTable = pgTable('doctors', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password_hash: text('password_hash').notNull(),
  first_name: varchar('first_name', { length: 100 }).notNull(),
  last_name: varchar('last_name', { length: 100 }).notNull(),
  category: varchar('category', { length: 100 }),
  phone: varchar('phone', { length: 20 }),
  address: text('address'),
  availability: jsonb('availability').default({ days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], startTime: '09:00', endTime: '17:00' }),
  created_at: timestamp('created_at').defaultNow(),
});

const appointmentsTable = pgTable('appointments', {
  id: serial('id').primaryKey(),
  patient_id: integer('patient_id').notNull(),
  doctor_id: integer('doctor_id').notNull(),
  appointment_date: timestamp('appointment_date').notNull(),
  fee: integer('fee').default(500), // Default consultation fee
  status: varchar('status', { length: 50 }).default('Pending'),
  notes: text('notes'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

const notificationsTable = pgTable('notifications', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id'),
  user_role: varchar('user_role', { length: 20 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  is_read: boolean('is_read').default(false),
  related_id: integer('related_id'),
  created_at: timestamp('created_at').defaultNow(),
});

const medicalReportsTable = pgTable('medical_reports', {
  id: serial('id').primaryKey(),
  appointment_id: integer('appointment_id').notNull(),
  doctor_id: integer('doctor_id').notNull(),
  patient_id: integer('patient_id').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  diagnosis: text('diagnosis').notNull(),
  prescription: text('prescription'),
  notes: text('notes'),
  secure_token: varchar('secure_token', { length: 255 }), // For QR sharing
  token_expires_at: timestamp('token_expires_at'),
  view_count: integer('view_count').default(0),
  max_views: integer('max_views').default(8),
  follow_up_date: timestamp('follow_up_date'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

const billsTable = pgTable('bills', {
  id: serial('id').primaryKey(),
  appointment_id: integer('appointment_id').notNull(),
  patient_id: integer('patient_id').notNull(),
  amount: integer('amount').notNull(),
  services: text('services'), // New: List of services provided
  status: varchar('status', { length: 20 }).default('Pending'), // Pending, Paid
  payment_method: varchar('payment_method', { length: 50 }), // Khalti, Cash
  transaction_id: varchar('transaction_id', { length: 255 }),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

const messagesTable = pgTable('messages', {
  id: serial('id').primaryKey(),
  sender_id: integer('sender_id').notNull(),
  sender_role: varchar('sender_role', { length: 20 }).notNull(),
  receiver_id: integer('receiver_id').notNull(),
  receiver_role: varchar('receiver_role', { length: 20 }).notNull(),
  content: text('content').notNull(),
  is_read: boolean('is_read').default(false),
  created_at: timestamp('created_at').defaultNow(),
});

module.exports = { usersTable, doctorsTable, appointmentsTable, notificationsTable, medicalReportsTable, billsTable, messagesTable };
