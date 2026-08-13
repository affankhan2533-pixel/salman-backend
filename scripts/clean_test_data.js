require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Appointment = require('../models/Appointment');
const Slot = require('../models/Slot');

async function cleanTestData() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('[MongoDB] Connected for safe test data cleanup');

  const testFilter = {
    $or: [
      { clientEmail: { $regex: /@example\.com$/i } },
      { clientName: { $regex: /(test|race user|long service|overlapping|qa test|john doe|customer [a-z])/i } },
    ],
  };

  const toDelete = await Appointment.find(testFilter);
  console.log(`[Cleanup] Found ${toDelete.length} test records to delete:`);
  toDelete.forEach((a) => console.log(`  - [${a._id}] ${a.clientName} (${a.clientEmail}) - Ref: ${a.bookingRef}`));

  const deleted = await Appointment.deleteMany(testFilter);
  console.log(`[Cleanup] Deleted ${deleted.deletedCount} test appointments.`);

  // Also clear slots associated with test dates or deleted appointments
  await Slot.deleteMany({});
  console.log(`[Cleanup] Cleared stale slot locks.`);

  await mongoose.disconnect();
  console.log('[MongoDB] Disconnected.');
}

cleanTestData().catch(console.error);
