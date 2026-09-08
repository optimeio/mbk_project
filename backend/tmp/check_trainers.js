const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const User = require('../models/User');

async function run() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/mbktech');
  const users = await User.find({}, 'email role name');
  console.log('ALL USERS:', JSON.stringify(users, null, 2));
  process.exit(0);
}
run();
