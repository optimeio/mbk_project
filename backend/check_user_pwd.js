const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const email = 'mbktechnologies8@gmail.com';
  const user = await User.findOne({ email }).select('+password');
  console.log(user);
  
  process.exit(0);
}
run();
