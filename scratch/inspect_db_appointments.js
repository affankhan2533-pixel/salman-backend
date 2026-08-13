require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Appointment = require('../models/Appointment');

async function inspect() {
  await mongoose.connect(process.env.MONGO_URI);
  const appts = await Appointment.find({}).select('clientName clientEmail clientPhone date startTime bookingRef appointmentStatus');
  console.log(`Total DB Appointments: ${appts.length}`);
  appts.forEach((a, i) => {
    console.log(`${i + 1}. [${a._id}] Name: "${a.clientName}" | Phone: "${a.clientPhone}" | Email: "${a.clientEmail}" | Date: ${a.date} ${a.startTime} | Ref: ${a.bookingRef} | Status: ${a.appointmentStatus}`);
  });
  await mongoose.disconnect();
}

inspect().catch(console.error);
