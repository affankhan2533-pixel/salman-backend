require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Service = require('../models/Service');
const Category = require('../models/Category');
const Appointment = require('../models/Appointment');

async function inspectServices() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('=== CURRENT SERVICES IN MONGODB ===');

  const services = await Service.find().sort({ title: 1 });
  for (const s of services) {
    let catName = s.category;
    if (s.category && mongoose.Types.ObjectId.isValid(s.category)) {
      const catDoc = await Category.findById(s.category);
      catName = catDoc ? catDoc.name : s.category;
    }

    const apptCount = await Appointment.countDocuments({ service: s._id });
    console.log(`ID: ${s._id}`);
    console.log(`  Title: ${s.title}`);
    console.log(`  Category Raw: ${s.category} => Resolved: ${catName}`);
    console.log(`  Price: ₹${s.price} | Duration: ${s.duration} min | Active: ${s.isActive}`);
    console.log(`  Referenced Appointments Count: ${apptCount}`);
    console.log('-----------------------------------');
  }

  await mongoose.disconnect();
}

inspectServices().catch(console.error);
