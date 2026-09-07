const http = require('http');

const BASE_URL = 'http://localhost:5000';
let passCount = 0;
let failCount = 0;

const request = (method, path, body = null, headers = {}) =>
  new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const opts = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });

const assert = (condition, title, details = '') => {
  if (condition) {
    console.log(`  ✅ PASS: ${title}${details ? ' — ' + details : ''}`);
    passCount++;
  } else {
    console.error(`  ❌ FAIL: ${title}${details ? ' — ' + details : ''}`);
    failCount++;
  }
};

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Appointment = require('../models/Appointment');
const Slot = require('../models/Slot');

async function runTests() {
  console.log('\n======================================================');
  console.log(' SALMAN HAIR STUDIO — REAL SLOT BOOKING SYSTEM AUDIT');
  console.log('======================================================\n');

  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB for test isolation.');

  // Test future date (5 days from now)
  const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  console.log(`Testing target date: ${futureDate}\n`);

  // Clean test date before starting
  await Appointment.deleteMany({ date: futureDate });
  await Slot.deleteMany({ date: futureDate });

  // 1. AVAILABILITY CHECK
  console.log('1. Checking Availability Endpoint...');
  const availRes = await request('GET', `/api/appointments/availability?date=${futureDate}&service=male-haircut`);
  assert(availRes.status === 200, 'Availability status 200');
  const slots = Array.isArray(availRes.body.data) ? availRes.body.data : availRes.body.data?.slots || [];
  assert(slots.length > 0, 'Generates time slots', `Count: ${slots.length}`);
  assert(slots[0].time === '10:00 AM', 'First slot is 10:00 AM', `Got: ${slots[0]?.time}`);
  assert(slots[slots.length - 1].time === '10:00 PM', 'Last slot is 10:00 PM', `Got: ${slots[slots.length - 1]?.time}`);
  assert(slots.every((s) => typeof s.available === 'boolean'), 'Each slot contains boolean available flag');

  // 2. PAST DATE REJECTION
  console.log('\n2. Testing Past Date Validation...');
  const pastRes = await request('POST', '/api/appointments', {
    customerName: 'Test User',
    phone: '9870810734',
    service: 'Hair Cut',
    date: '2020-01-01',
    time: '10:00 AM',
  });
  assert(pastRes.status === 400, 'Rejects past date with HTTP 400', `Got: ${pastRes.status}`);

  // 3. BOOK AN AVAILABLE SLOT
  console.log('\n3. Booking a Specific Slot (e.g. 11:00 AM)...');
  const bookRes = await request('POST', '/api/appointments', {
    customerName: 'Farhan Merchant',
    phone: '9870810734',
    email: 'farhan@example.com',
    serviceId: 'male-haircut',
    date: futureDate,
    time: '11:00 AM',
  });

  assert(bookRes.status === 201, 'Booking created with HTTP 201', `Status: ${bookRes.status}`);
  const apptId = bookRes.body.data?.id;
  const bookingRef = bookRes.body.data?.bookingRef;
  assert(Boolean(bookingRef), 'Returns bookingRef', `Ref: ${bookingRef}`);
  assert(bookRes.body.data?.status === 'Pending', 'Initial status is Pending');
  assert(bookRes.body.data?.price === 500, 'Resolved price from centralized Service (₹500)');

  // 4. CHECK THAT SLOT IS NOW UNAVAILABLE
  console.log('\n4. Verifying Slot Became Unavailable in Real-Time...');
  const availRes2 = await request('GET', `/api/appointments/availability?date=${futureDate}`);
  const slots2 = Array.isArray(availRes2.body.data) ? availRes2.body.data : availRes2.body.data?.slots || [];
  const slot11 = slots2.find((s) => s.time === '11:00 AM');
  assert(slot11 && slot11.available === false, 'Booked slot is now available: false');
  assert(slot11 && slot11.status === 'booked', 'Booked slot status is "booked"');

  // 5. DIRECT DUPLICATE ATTEMPT FOR SAME SLOT
  console.log('\n5. Direct Duplicate Booking Attempt for 11:00 AM...');
  const dupRes = await request('POST', '/api/appointments', {
    customerName: 'Another Customer',
    phone: '9123456780',
    service: 'Hair Cut',
    date: futureDate,
    time: '11:00 AM',
  });
  assert(dupRes.status === 409, 'Duplicate rejected with HTTP 409 Conflict', `Got: ${dupRes.status}`);
  assert(dupRes.body.code === 'SLOT_ALREADY_BOOKED', 'Code is SLOT_ALREADY_BOOKED', `Got: ${dupRes.body.code}`);

  // 6. SIMULTANEOUS CONCURRENT RACE CONDITION TEST
  console.log('\n6. Testing Simultaneous Concurrent Race Condition (1:00 PM)...');
  const [resA, resB] = await Promise.all([
    request('POST', '/api/appointments', {
      customerName: 'Client Alpha',
      phone: '9870810734',
      serviceId: 'male-beard',
      date: futureDate,
      time: '01:00 PM',
    }),
    request('POST', '/api/appointments', {
      customerName: 'Client Beta',
      phone: '9988776655',
      serviceId: 'male-beard',
      date: futureDate,
      time: '01:00 PM',
    }),
  ]);

  const statuses = [resA.status, resB.status].sort();
  assert(
    statuses[0] === 201 && statuses[1] === 409,
    'Race condition prevented: Exactly 1 Succeeded (201) and 1 Rejected (409)',
    `Client A: ${resA.status}, Client B: ${resB.status}`
  );

  // 7. ADMIN CANCELLATION & INSTANT SLOT RELEASE
  console.log('\n7. Testing Admin Cancellation & Instant Slot Release...');
  let adminToken = null;
  for (const cred of [
    { email: 'admin@salmanhairstudio.com', password: 'admin123password' },
    { email: 'admin@salmanhairstudio.com', password: 'Admin@123' },
  ]) {
    const authRes = await request('POST', '/api/auth/login', cred);
    if (authRes.status === 200 && (authRes.body?.token || authRes.body?.data?.token)) {
      adminToken = authRes.body.token || authRes.body.data.token;
      break;
    }
  }

  if (adminToken) {
    const cancelRes = await request(
      'PATCH',
      `/api/appointments/${apptId}/status`,
      { appointmentStatus: 'Cancelled' },
      { Authorization: `Bearer ${adminToken}` }
    );
    assert(cancelRes.status === 200, 'Admin cancelled appointment successfully', `Status: ${cancelRes.status}`);

    // Verify 11:00 AM is now available again!
    const availRes3 = await request('GET', `/api/appointments/availability?date=${futureDate}`);
    const slots3 = Array.isArray(availRes3.body.data) ? availRes3.body.data : availRes3.body.data?.slots || [];
    const slot11After = slots3.find((s) => s.time === '11:00 AM');
    assert(slot11After && slot11After.available === true, 'Cancelled slot became AVAILABLE again!', `Status: ${slot11After?.status}`);

    // 8. TEST RE-BOOKING THE FREED SLOT
    console.log('\n8. Re-booking the freed 11:00 AM slot...');
    const rebookRes = await request('POST', '/api/appointments', {
      customerName: 'Rohit Sharma',
      phone: '9870810734',
      serviceId: 'male-haircut',
      date: futureDate,
      time: '11:00 AM',
    });
    assert(rebookRes.status === 201, 'Freed slot re-booked successfully (201)', `Ref: ${rebookRes.body.data?.bookingRef}`);
    const rebookedId = rebookRes.body.data?.id;

    // 9. TEST ADMIN COMPLETION
    console.log('\n9. Testing Admin Completion & Freeing Slot for History...');
    const completeRes = await request(
      'PATCH',
      `/api/appointments/${rebookedId}/status`,
      { appointmentStatus: 'Completed' },
      { Authorization: `Bearer ${adminToken}` }
    );
    assert(completeRes.status === 200, 'Appointment marked Completed (200)');
  } else {
    console.log('  ⚠️ Skipping admin cancellation test (admin credentials not matching)');
  }

  // 10. SERVICE SELECTION TEST ACROSS ALL GENDERS & CATEGORIES
  console.log('\n10. Testing Service Catalog Integration (Men & Women services)...');
  const femaleBooking = await request('POST', '/api/appointments', {
    customerName: 'Pooja Hegde',
    phone: '9870810734',
    serviceId: 'female-balayage',
    date: futureDate,
    time: '03:00 PM',
  });
  assert(femaleBooking.status === 201, 'Female Balayage booked successfully (201)');
  assert(femaleBooking.body.data?.price === 10000, 'Price correctly resolved to ₹10,000 for Balayage');

  console.log('\n======================================================');
  console.log(` AUDIT COMPLETE — Passed: ${passCount} | Failed: ${failCount}`);
  console.log('======================================================\n');

  await mongoose.disconnect();

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
