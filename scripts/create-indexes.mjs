/**
 * MongoDB Index Creation Script
 * Run: node scripts/create-indexes.mjs
 *
 * Optimizes query performance for 1M+ records across all collections.
 * Indexes cover: filtering, sorting, lookup joins, text search, geo queries.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config({ path: path.join(__dirname, '..', 'backend', '.env'), override: false });

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not set. Check your .env file.');
  process.exit(1);
}

const INDEX_DEFINITIONS = {
  // ── Users ──────────────────────────────────────────────────────────────────
  users: [
    { key: { email: 1 }, opts: { unique: true, name: 'idx_users_email_unique' } },
    { key: { role: 1, createdAt: -1 }, opts: { name: 'idx_users_role_created' } },
    { key: { role: 1, isActive: 1 }, opts: { name: 'idx_users_role_active' } },
    { key: { phone: 1 }, opts: { sparse: true, name: 'idx_users_phone' } },
    { key: { createdAt: -1 }, opts: { name: 'idx_users_created_desc' } },
  ],

  // ── Trainers ───────────────────────────────────────────────────────────────
  trainers: [
    { key: { userId: 1 }, opts: { unique: true, name: 'idx_trainers_userId_unique' } },
    { key: { status: 1, createdAt: -1 }, opts: { name: 'idx_trainers_status_created' } },
    { key: { status: 1, city: 1 }, opts: { name: 'idx_trainers_status_city' } },
    { key: { 'skills': 1 }, opts: { name: 'idx_trainers_skills' } },
    { key: { 'verificationStatus': 1 }, opts: { name: 'idx_trainers_verification' } },
    { key: { createdAt: -1 }, opts: { name: 'idx_trainers_created_desc' } },
    // Compound for admin trainer list + filter
    { key: { status: 1, 'verificationStatus': 1, createdAt: -1 }, opts: { name: 'idx_trainers_status_verify_created' } },
  ],

  // ── Attendance ─────────────────────────────────────────────────────────────
  attendances: [
    { key: { trainerId: 1, scheduleId: 1 }, opts: { name: 'idx_attendance_trainer_schedule' } },
    { key: { scheduleId: 1, status: 1 }, opts: { name: 'idx_attendance_schedule_status' } },
    { key: { trainerId: 1, date: -1 }, opts: { name: 'idx_attendance_trainer_date' } },
    { key: { collegeId: 1, date: -1 }, opts: { name: 'idx_attendance_college_date' } },
    { key: { status: 1, createdAt: -1 }, opts: { name: 'idx_attendance_status_created' } },
    // For monthly stats aggregation
    { key: { date: 1, status: 1 }, opts: { name: 'idx_attendance_date_status' } },
    // For SPOC verification queue
    { key: { checkInVerified: 1, scheduleId: 1 }, opts: { name: 'idx_attendance_checkin_sched' } },
  ],

  // ── Schedules ──────────────────────────────────────────────────────────────
  schedules: [
    { key: { trainerId: 1, date: -1 }, opts: { name: 'idx_schedules_trainer_date' } },
    { key: { collegeId: 1, date: -1 }, opts: { name: 'idx_schedules_college_date' } },
    { key: { companyId: 1, status: 1 }, opts: { name: 'idx_schedules_company_status' } },
    { key: { status: 1, date: -1 }, opts: { name: 'idx_schedules_status_date' } },
    { key: { date: 1, status: 1 }, opts: { name: 'idx_schedules_date_status' } },
    // TTL index for old completed schedules (auto-archive after 2 years)
    { key: { completedAt: 1 }, opts: { expireAfterSeconds: 63072000, sparse: true, name: 'idx_schedules_ttl_completed' } },
  ],

  // ── Companies ─────────────────────────────────────────────────────────────
  companies: [
    { key: { companyCode: 1 }, opts: { unique: true, sparse: true, name: 'idx_companies_code_unique' } },
    { key: { isActive: 1, createdAt: -1 }, opts: { name: 'idx_companies_active_created' } },
    { key: { 'name': 'text' }, opts: { name: 'idx_companies_text_name' } },
  ],

  // ── Colleges ──────────────────────────────────────────────────────────────
  colleges: [
    { key: { companyId: 1, isActive: 1 }, opts: { name: 'idx_colleges_company_active' } },
    { key: { city: 1, isActive: 1 }, opts: { name: 'idx_colleges_city_active' } },
    { key: { 'name': 'text', 'location': 'text' }, opts: { name: 'idx_colleges_text_search' } },
    // Geospatial for distance calculation
    { key: { location: '2dsphere' }, opts: { sparse: true, name: 'idx_colleges_geo' } },
  ],

  // ── Complaints ─────────────────────────────────────────────────────────────
  complaints: [
    { key: { trainerId: 1, status: 1 }, opts: { name: 'idx_complaints_trainer_status' } },
    { key: { status: 1, createdAt: -1 }, opts: { name: 'idx_complaints_status_created' } },
    { key: { assignedTo: 1, status: 1 }, opts: { name: 'idx_complaints_assigned_status' } },
    { key: { category: 1, status: 1 }, opts: { name: 'idx_complaints_category_status' } },
  ],

  // ── Salaries ──────────────────────────────────────────────────────────────
  salaries: [
    { key: { trainerId: 1, month: 1, year: 1 }, opts: { unique: true, name: 'idx_salaries_trainer_period_unique' } },
    { key: { status: 1, month: 1, year: 1 }, opts: { name: 'idx_salaries_status_period' } },
    { key: { month: 1, year: 1 }, opts: { name: 'idx_salaries_period' } },
  ],

  // ── Payslips ──────────────────────────────────────────────────────────────
  payslips: [
    { key: { trainerId: 1, month: 1, year: 1 }, opts: { name: 'idx_payslips_trainer_period' } },
    { key: { trainerId: 1, createdAt: -1 }, opts: { name: 'idx_payslips_trainer_created' } },
    { key: { status: 1, createdAt: -1 }, opts: { name: 'idx_payslips_status_created' } },
  ],

  // ── Notifications ──────────────────────────────────────────────────────────
  notifications: [
    { key: { userId: 1, isRead: 1, createdAt: -1 }, opts: { name: 'idx_notifications_user_read_created' } },
    { key: { userId: 1, createdAt: -1 }, opts: { name: 'idx_notifications_user_created' } },
    // Auto-delete notifications after 90 days
    { key: { createdAt: 1 }, opts: { expireAfterSeconds: 7776000, name: 'idx_notifications_ttl' } },
  ],

  // ── OTPs ──────────────────────────────────────────────────────────────────
  otps: [
    { key: { email: 1, purpose: 1 }, opts: { name: 'idx_otps_email_purpose' } },
    { key: { phone: 1, purpose: 1 }, opts: { sparse: true, name: 'idx_otps_phone_purpose' } },
    // Auto-delete OTPs after 10 minutes
    { key: { createdAt: 1 }, opts: { expireAfterSeconds: 600, name: 'idx_otps_ttl' } },
  ],

  // ── Activity Logs ──────────────────────────────────────────────────────────
  activitylogs: [
    { key: { userId: 1, createdAt: -1 }, opts: { name: 'idx_activitylogs_user_created' } },
    { key: { action: 1, createdAt: -1 }, opts: { name: 'idx_activitylogs_action_created' } },
    { key: { entityType: 1, entityId: 1 }, opts: { name: 'idx_activitylogs_entity' } },
    // Auto-delete logs after 1 year
    { key: { createdAt: 1 }, opts: { expireAfterSeconds: 31536000, name: 'idx_activitylogs_ttl' } },
  ],

  // ── Financial Records ──────────────────────────────────────────────────────
  financialrecords: [
    { key: { trainerId: 1, type: 1, createdAt: -1 }, opts: { name: 'idx_financial_trainer_type_created' } },
    { key: { status: 1, createdAt: -1 }, opts: { name: 'idx_financial_status_created' } },
    { key: { month: 1, year: 1, status: 1 }, opts: { name: 'idx_financial_period_status' } },
  ],

  // ── Courses ────────────────────────────────────────────────────────────────
  courses: [
    { key: { companyId: 1, isActive: 1 }, opts: { name: 'idx_courses_company_active' } },
    { key: { 'name': 'text', 'description': 'text' }, opts: { name: 'idx_courses_text_search' } },
  ],

  // ── Departments ────────────────────────────────────────────────────────────
  departments: [
    { key: { collegeId: 1, isActive: 1 }, opts: { name: 'idx_departments_college_active' } },
    { key: { courseId: 1 }, opts: { name: 'idx_departments_course' } },
  ],

  // ── Chat Messages ──────────────────────────────────────────────────────────
  chatmessages: [
    { key: { chatId: 1, createdAt: -1 }, opts: { name: 'idx_chatmessages_chat_created' } },
    { key: { senderId: 1, createdAt: -1 }, opts: { name: 'idx_chatmessages_sender_created' } },
    // Auto-delete messages after 2 years
    { key: { createdAt: 1 }, opts: { expireAfterSeconds: 63072000, name: 'idx_chatmessages_ttl' } },
  ],

  // ── Refresh Tokens ─────────────────────────────────────────────────────────
  refreshtokens: [
    { key: { token: 1 }, opts: { unique: true, name: 'idx_refreshtokens_token_unique' } },
    { key: { userId: 1 }, opts: { name: 'idx_refreshtokens_user' } },
    // Auto-delete expired tokens
    { key: { expiresAt: 1 }, opts: { expireAfterSeconds: 0, name: 'idx_refreshtokens_ttl' } },
  ],
};

async function createIndexes() {
  console.log('🔗 Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 10000,
  });
  console.log('✅ Connected.\n');

  const db = mongoose.connection.db;
  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const [collectionName, indexes] of Object.entries(INDEX_DEFINITIONS)) {
    console.log(`📦 Processing: ${collectionName}`);
    const col = db.collection(collectionName);

    for (const { key, opts } of indexes) {
      try {
        const result = await col.createIndex(key, { background: true, ...opts });
        console.log(`  ✅ Created: ${opts.name || result}`);
        created++;
      } catch (err) {
        if (err.code === 85 || err.code === 86) {
          // Index already exists with same or different key
          console.log(`  ⏭  Skipped (exists): ${opts.name}`);
          skipped++;
        } else {
          console.error(`  ❌ Error: ${opts.name} — ${err.message}`);
          errors++;
        }
      }
    }
    console.log('');
  }

  console.log('══════════════════════════════════════');
  console.log(`✅ Created:  ${created}`);
  console.log(`⏭  Skipped:  ${skipped}`);
  console.log(`❌ Errors:   ${errors}`);
  console.log('══════════════════════════════════════');

  await mongoose.disconnect();
  console.log('🔌 Disconnected from MongoDB.');
  process.exit(errors > 0 ? 1 : 0);
}

createIndexes().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
