const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const User = require('../models/User');
const bcrypt = require('bcryptjs');

async function run() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/mbktech');
  const hashedPassword = await bcrypt.hash('Trainer@123', 10);
  
  const result = await User.updateOne(
    { email: 'mohammedsukhel@gmail.com' },
    { $set: { password: hashedPassword } }
  );
  
  console.log('Password reset result:', result);
  process.exit(0);
}
run();
