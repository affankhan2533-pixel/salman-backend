require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

const Appointment = require('../models/Appointment');
const Slot = require('../models/Slot');

async function clean() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('[MongoDB] Connected');

  // Remove test appointments
  const deleted = await Appointment.deleteMany({
    clientEmail: { $in: ['test.phase18@example.com', 'complete.test@example.com'] },
  });
  console.log('[Cleanup] Deleted', deleted.deletedCount, 'test appointments');

  // Remove all Slot locks (safe to clear — availability is always recalculated from Appointment docs)
  const slots = await Slot.deleteMany({});
  console.log('[Cleanup] Deleted', slots.deletedCount, 'slot locks');

  await mongoose.disconnect();
  console.log('[MongoDB] Disconnected. Done.');
}

clean().catch(console.error);
