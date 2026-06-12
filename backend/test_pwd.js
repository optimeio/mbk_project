const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');
const bcrypt = require('bcryptjs');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const email = 'mbktechnologies8@gmail.com';
  const admin = await User.findOne({ email }).select('+password');
  
  if (admin) {
    const isMatch = await bcrypt.compare('admin123', admin.password);
    console.log("Does 'admin123' match the DB password? " + isMatch);
  } else {
    console.log("Admin not found!");
  }
  
  process.exit(0);
}
run();