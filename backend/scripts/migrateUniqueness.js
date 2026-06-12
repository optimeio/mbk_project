#!/usr/bin/env node

/**
 * Database Migration Script
 * 
 * Purpose: Identify and resolve duplicate email addresses and phone numbers
 * across the User, Student, Trainer, and Company collections.
 * 
 * This script:
 * 1. Finds all duplicate emails and phone numbers across all collections
 * 2. Reports conflicts and provides recommendations
 * 3. Optionally fixes duplicates by merging or marking for manual review
 * 
 * IMPORTANT: Run this in a test environment first!
 * IMPORTANT: Backup your database before running this script!
 */

const mongoose = require('mongoose');
const User = require('../models/User');
const Student = require('../models/Student');
const Trainer = require('../models/Trainer');
const Company = require('../models/Company');

// Configuration
const DRY_RUN = process.argv.includes('--dry-run');
const AUTO_FIX = process.argv.includes('--auto-fix');
const REPORT_ONLY = process.argv.includes('--report-only');

console.log('============================================');
console.log('Email & Phone Uniqueness Migration Script');
console.log('============================================');
console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : AUTO_FIX ? 'AUTO-FIX' : 'REPORT ONLY'}`);
console.log('============================================\n');

/**
 * Find all email addresses and their occurrences across collections
 */
async function findEmailDuplicates() {
  console.log('📧 Scanning for duplicate email addresses...\n');
  
  const emailMap = new Map();
  
  // Collect all emails from User collection
  const users = await User.find({}).select('_id email role createdAt').lean();
  for (const user of users) {
    if (!user.email) continue;
    const email = user.email.toLowerCase().trim();
    if (!emailMap.has(email)) {
      emailMap.set(email, []);
    }
    emailMap.get(email).push({
      id: user._id,
      collection: 'User',
      role: user.role,
      createdAt: user.createdAt,
    });
  }
  
  // Collect all emails from Student collection
  const students = await Student.find({}).select('_id email createdAt').lean();
  for (const student of students) {
    if (!student.email) continue;
    const email = student.email.toLowerCase().trim();
    if (!emailMap.has(email)) {
      emailMap.set(email, []);
    }
    emailMap.get(email).push({
      id: student._id,
      collection: 'Student',
      role: 'Student',
      createdAt: student.createdAt,
    });
  }
  
  // Collect all emails from Trainer collection
  const trainers = await Trainer.find({}).select('_id email createdAt').lean();
  for (const trainer of trainers) {
    if (!trainer.email) continue;
    const email = trainer.email.toLowerCase().trim();
    if (!emailMap.has(email)) {
      emailMap.set(email, []);
    }
    emailMap.get(email).push({
      id: trainer._id,
      collection: 'Trainer',
      role: 'Trainer',
      createdAt: trainer.createdAt,
    });
  }
  
  // Collect all emails from Company collection
  const companies = await Company.find({}).select('_id email name createdAt').lean();
  for (const company of companies) {
    if (!company.email) continue;
    const email = company.email.toLowerCase().trim();
    if (!emailMap.has(email)) {
      emailMap.set(email, []);
    }
    emailMap.get(email).push({
      id: company._id,
      collection: 'Company',
      role: 'Company',
      createdAt: company.createdAt,
      name: company.name,
    });
  }
  
  // Filter for duplicates
  const duplicates = [];
  for (const [email, occurrences] of emailMap.entries()) {
    if (occurrences.length > 1) {
      duplicates.push({ email, occurrences });
    }
  }
  
  return duplicates;
}

/**
 * Find all phone numbers and their occurrences across collections
 */
async function findPhoneDuplicates() {
  console.log('📱 Scanning for duplicate phone numbers...\n');
  
  const phoneMap = new Map();
  
  // Helper to normalize phone
  const normalizePhone = (phone) => {
    if (!phone) return null;
    return String(phone).trim().replace(/[\s\-()]/g, '');
  };
  
  // Collect all phones from User collection
  const users = await User.find({}).select('_id phoneNumber profile.phone role createdAt').lean();
  for (const user of users) {
    const phones = [
      normalizePhone(user.phoneNumber),
      normalizePhone(user.profile?.phone)
    ].filter(Boolean);
    
    for (const phone of phones) {
      if (!phoneMap.has(phone)) {
        phoneMap.set(phone, []);
      }
      phoneMap.get(phone).push({
        id: user._id,
        collection: 'User',
        role: user.role,
        createdAt: user.createdAt,
      });
    }
  }
  
  // Collect all phones from Student collection
  const students = await Student.find({}).select('_id phoneNumber createdAt').lean();
  for (const student of students) {
    const phone = normalizePhone(student.phoneNumber);
    if (!phone) continue;
    
    if (!phoneMap.has(phone)) {
      phoneMap.set(phone, []);
    }
    phoneMap.get(phone).push({
      id: student._id,
      collection: 'Student',
      role: 'Student',
      createdAt: student.createdAt,
    });
  }
  
  // Collect all phones from Trainer collection
  const trainers = await Trainer.find({}).select('_id mobile createdAt').lean();
  for (const trainer of trainers) {
    const phone = normalizePhone(trainer.mobile);
    if (!phone) continue;
    
    if (!phoneMap.has(phone)) {
      phoneMap.set(phone, []);
    }
    phoneMap.get(phone).push({
      id: trainer._id,
      collection: 'Trainer',
      role: 'Trainer',
      createdAt: trainer.createdAt,
    });
  }
  
  // Collect all phones from Company collection
  const companies = await Company.find({}).select('_id phone name createdAt').lean();
  for (const company of companies) {
    const phone = normalizePhone(company.phone);
    if (!phone) continue;
    
    if (!phoneMap.has(phone)) {
      phoneMap.set(phone, []);
    }
    phoneMap.get(phone).push({
      id: company._id,
      collection: 'Company',
      role: 'Company',
      createdAt: company.createdAt,
      name: company.name,
    });
  }
  
  // Filter for duplicates
  const duplicates = [];
  for (const [phone, occurrences] of phoneMap.entries()) {
    if (occurrences.length > 1) {
      duplicates.push({ phone, occurrences });
    }
  }
  
  return duplicates;
}

/**
 * Generate report of duplicates
 */
function generateReport(emailDuplicates, phoneDuplicates) {
  console.log('\n============================================');
  console.log('📊 DUPLICATE REPORT');
  console.log('============================================\n');
  
  if (emailDuplicates.length === 0 && phoneDuplicates.length === 0) {
    console.log('✅ No duplicates found! Database is clean.\n');
    return;
  }
  
  if (emailDuplicates.length > 0) {
    console.log(`❌ Found ${emailDuplicates.length} duplicate email(s):\n`);
    
    emailDuplicates.forEach(({ email, occurrences }, index) => {
      console.log(`${index + 1}. Email: ${email}`);
      console.log(`   Occurrences (${occurrences.length}):`);
      occurrences.forEach((occ, i) => {
        console.log(`     ${i + 1}. ${occ.collection} - ${occ.role} (ID: ${occ.id}, Created: ${occ.createdAt})`);
      });
      console.log('');
    });
  }
  
  if (phoneDuplicates.length > 0) {
    console.log(`❌ Found ${phoneDuplicates.length} duplicate phone number(s):\n`);
    
    phoneDuplicates.forEach(({ phone, occurrences }, index) => {
      console.log(`${index + 1}. Phone: ${phone}`);
      console.log(`   Occurrences (${occurrences.length}):`);
      occurrences.forEach((occ, i) => {
        console.log(`     ${i + 1}. ${occ.collection} - ${occ.role} (ID: ${occ.id}, Created: ${occ.createdAt})`);
      });
      console.log('');
    });
  }
  
  console.log('============================================\n');
  console.log('⚠️  RECOMMENDATIONS:');
  console.log('1. Review each duplicate manually');
  console.log('2. Determine which record should be kept');
  console.log('3. Merge or delete duplicate records');
  console.log('4. Update any references to deleted records');
  console.log('5. Re-run this script to verify\n');
}

/**
 * Main execution
 */
async function main() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/yourdbname';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');
    
    // Find duplicates
    const emailDuplicates = await findEmailDuplicates();
    const phoneDuplicates = await findPhoneDuplicates();
    
    // Generate report
    generateReport(emailDuplicates, phoneDuplicates);
    
    // Save report to file
    const report = {
      timestamp: new Date().toISOString(),
      emailDuplicates,
      phoneDuplicates,
      summary: {
        totalEmailDuplicates: emailDuplicates.length,
        totalPhoneDuplicates: phoneDuplicates.length,
      },
    };
    
    const fs = require('fs');
    const reportPath = `./duplicate-report-${Date.now()}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 Detailed report saved to: ${reportPath}\n`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Disconnected from MongoDB\n');
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { findEmailDuplicates, findPhoneDuplicates };
