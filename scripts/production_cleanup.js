require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Service = require('../models/Service');
const Gallery = require('../models/Gallery');
const Appointment = require('../models/Appointment');
const Slot = require('../models/Slot');

async function runProductionCleanup() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('=================================================');
  console.log('  PHASE 20 PRODUCTION HARDENING & DATA CLEANUP');
  console.log('=================================================\n');

  // 1. Inspect & Clean Test/Audit Appointments
  const testEmails = [
    'test@example.com',
    'aarav19a3@example.com',
    'neha19a3@example.com',
    'rohan19a3@example.com',
    'safety@example.com',
    'deletesafety@example.com',
  ];

  const testAppts = await Appointment.find({
    $or: [
      { clientEmail: { $in: testEmails } },
      { clientName: { $regex: /19A3|19B|Audit|Test/i } },
    ],
  });

  console.log(`Found ${testAppts.length} test appointment records to remove.`);
  if (testAppts.length > 0) {
    const ids = testAppts.map((a) => a._id);
    await Appointment.deleteMany({ _id: { $in: ids } });
    console.log('  ✅ Cleaned test appointments.');
  }

  // 2. Inspect Services
  const allServices = await Service.find();
  console.log(`\nInspecting Services catalog: ${allServices.length} total services.`);
  for (const s of allServices) {
    console.log(`  - Service: ${s.title} [${s.category}] Price: ₹${s.price} (Active: ${s.isActive})`);
  }

  // 3. Inspect Gallery
  const allGallery = await Gallery.find();
  console.log(`\nInspecting Gallery catalog: ${allGallery.length} total images.`);
  for (const g of allGallery) {
    console.log(`  - Image: ${g.title || 'Untitled'} [${g.category}] Visible: ${g.isVisible} Order: ${g.order}`);
  }

  // 4. Clean stale temporary test slots
  const testSlots = await Slot.deleteMany({
    date: { $regex: /2026-12-3/ },
  });
  console.log(`\nCleaned ${testSlots.deletedCount} temporary test slots.`);

  const remainingAppts = await Appointment.countDocuments();
  const remainingServices = await Service.countDocuments();
  const remainingGallery = await Gallery.countDocuments();

  console.log('\n--- PRODUCTION DATA STATUS ---');
  console.log(`Genuine Customer Appointments: ${remainingAppts}`);
  console.log(`Active Production Services: ${remainingServices}`);
  console.log(`Published Gallery Items: ${remainingGallery}`);

  await mongoose.disconnect();
}

runProductionCleanup().catch(console.error);
