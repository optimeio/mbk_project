// One-off migration: fix E11000 on students.collegeId_1_registerNo_1
// 1. Give existing self-registered students ('N/A' placeholder) a unique registerNo
// 2. Drop the old plain unique index
// 3. Recreate it as a partial unique index (only enforced when collegeId is an ObjectId)
import 'dotenv/config';
import mongoose from 'mongoose';

const uri = process.env.MONGO_URI?.trim() || process.env.MONGO_URI_LOCAL?.trim();
if (!uri) {
  console.error('MONGO_URI not set');
  process.exit(1);
}

await mongoose.connect(uri);
const col = mongoose.connection.db.collection('students');

const stale = await col.find({ registerNo: 'N/A' }).project({ _id: 1 }).toArray();
for (const doc of stale) {
  await col.updateOne({ _id: doc._id }, { $set: { registerNo: `SELF-${doc._id}` } });
}
console.log(`Updated ${stale.length} placeholder registerNo values`);

const indexes = await col.indexes();
const old = indexes.find((i) => i.name === 'collegeId_1_registerNo_1');
if (old) {
  await col.dropIndex('collegeId_1_registerNo_1');
  console.log('Dropped old collegeId_1_registerNo_1 index');
}

await col.createIndex(
  { collegeId: 1, registerNo: 1 },
  { unique: true, partialFilterExpression: { collegeId: { $type: 'objectId' } } }
);
console.log('Created partial unique index collegeId_1_registerNo_1');

await mongoose.disconnect();
console.log('Done');
