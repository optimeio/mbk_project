const mongoose = require('mongoose');

const uri = 'mongodb://127.0.0.1:27017/management_system';

async function check() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const user = await db.collection('users').findOne({ email: 'thesmgroups@gmail.com' });
  console.log('User found:', user);
  process.exit(0);
}

check().catch(console.error);
