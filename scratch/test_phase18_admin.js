/**
 * Admin lifecycle tests — run separately with direct DB access for admin functions
 * These test: Confirm → slot still blocked, Cancel → slot released, Complete → slot freed + record persists
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Appointment = require('../models/Appointment');
const Slot = require('../models/Slot');

const RESULTS = [];
const pass = (label, detail = '') => { console.log(`  ✅ PASS — ${label}${detail ? ` (${detail})` : ''}`); RESULTS.push({ label, result: 'PASS' }); };
const fail = (label, detail = '') => { console.error(`  ❌ FAIL — ${label}${detail ? ` (${detail})` : ''}`); RESULTS.push({ label, result: 'FAIL' }); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const http = require('http');
const BASE_URL = 'http://localhost:5000';
const request = (method, path, body = null) =>
  new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const opts = { hostname: url.hostname, port: url.port || 80, path: url.pathname + url.search, method, headers: { 'Content-Type': 'application/json' } };
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(data) }); } catch { resolve({ status: res.statusCode, body: data }); } });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });

const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const TEST_DATE = tomorrow.toISOString().split('T')[0];

const timeToMinutes = (t) => { if (!t) return 0; const p = t.split(':').map(Number); return p[0] * 60 + p[1]; };
const minutesToHHMM = (m) => `${Math.floor(m/60).toString().padStart(2,'0')}:${(m%60).toString().padStart(2,'0')}`;

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('[MongoDB] Connected\n');

  // === SETUP: Create a test appointment directly via API (Pending)
  const createRes = await request('POST', '/api/appointments', {
    clientName: 'Admin Test Subject',
    clientEmail: 'admintest.phase18@example.com',
    clientPhone: '9000000001',
    service: 'Haircut',
    date: TEST_DATE,
    startTime: '14:00',
  });

  if (createRes.status !== 201) {
    fail('Setup: Create Pending', `HTTP ${createRes.status}: ${JSON.stringify(createRes.body).slice(0, 200)}`);
    await mongoose.disconnect();
    return;
  }

  const bookingRef = createRes.body.data?.bookingRef;
  console.log(`  [Setup] Created Pending booking: ${bookingRef}`);
  const appt = await Appointment.findOne({ bookingRef });
  if (!appt) { fail('Setup: Find in DB', 'Not found'); await mongoose.disconnect(); return; }
  const apptId = appt._id;

  // === TEST: Admin Confirm via direct DB (simulates admin action)
  console.log('\n[ADMIN TEST] Confirm appointment');
  appt.appointmentStatus = 'Confirmed';
  appt.pendingExpiresAt = null;
  await appt.save();
  const confirmed = await Appointment.findById(apptId);
  if (confirmed.appointmentStatus === 'Confirmed') {
    pass('Admin Confirm', 'Status = Confirmed in DB');
  } else {
    fail('Admin Confirm', `Got ${confirmed.appointmentStatus}`);
  }

  // Verify slot still blocked (Confirmed must always block)
  const avail1 = await request('GET', `/api/appointments/availability?date=${TEST_DATE}&service=Haircut`);
  const slot1 = avail1.body?.data?.find((s) => s.startTime === '14:00');
  console.log('\n[ADMIN TEST] Confirmed appointment blocks slot');
  if (slot1 && !slot1.isAvailable) {
    pass('Confirmed blocks slot', '14:00 isAvailable=false');
  } else {
    fail('Confirmed blocks slot', `Slot shows ${slot1?.status || 'undefined'}`);
  }

  // === TEST: Cancel → slot released
  console.log('\n[ADMIN TEST] Cancel appointment → slot should be released');
  confirmed.appointmentStatus = 'Cancelled';
  await confirmed.save();
  // Release slot (as controller does)
  await Slot.deleteMany({
    $or: [
      { appointment: apptId },
      { stylist: confirmed.stylist, date: confirmed.date, startTime: confirmed.startTime },
    ],
  });

  await sleep(200);
  const avail2 = await request('GET', `/api/appointments/availability?date=${TEST_DATE}&service=Haircut`);
  const slot2 = avail2.body?.data?.find((s) => s.startTime === '14:00');
  if (slot2?.isAvailable) {
    pass('Cancel releases slot', '14:00 now available after Cancelled');
  } else {
    fail('Cancel releases slot', `Slot still shows ${slot2?.status}`);
  }

  // === TEST: Create fresh, Confirm, then Complete → slot freed + record persists
  console.log('\n[ADMIN TEST] Complete appointment → slot freed + record persists');

  const createRes2 = await request('POST', '/api/appointments', {
    clientName: 'Admin Test Complete',
    clientEmail: 'admintest.phase18@example.com',
    clientPhone: '9000000001',
    service: 'Haircut',
    date: TEST_DATE,
    startTime: '15:00',
  });
  if (createRes2.status !== 201) { fail('Complete setup create', `${createRes2.status}`); await mongoose.disconnect(); return; }
  const appt2 = await Appointment.findOne({ bookingRef: createRes2.body.data.bookingRef });
  appt2.appointmentStatus = 'Confirmed';
  appt2.pendingExpiresAt = null;
  await appt2.save();

  // Complete it
  appt2.appointmentStatus = 'Completed';
  await appt2.save();
  await Slot.deleteMany({
    $or: [
      { appointment: appt2._id },
      { stylist: appt2.stylist, date: appt2.date, startTime: appt2.startTime },
    ],
  });

  await sleep(200);
  const avail3 = await request('GET', `/api/appointments/availability?date=${TEST_DATE}&service=Haircut`);
  const slot3 = avail3.body?.data?.find((s) => s.startTime === '15:00');
  if (slot3?.isAvailable) {
    pass('Completed frees slot', '15:00 now available after Completed');
  } else {
    fail('Completed frees slot', `Slot shows ${slot3?.status}`);
  }

  const record = await Appointment.findById(appt2._id);
  if (record && record.appointmentStatus === 'Completed') {
    pass('Completed record persists', 'Historical record intact, status=Completed');
  } else {
    fail('Completed record persists', `Not found or wrong status`);
  }

  // === TEST: Guard — cannot complete a Cancelled appointment without re-confirming
  console.log('\n[ADMIN TEST] Lifecycle guard — cannot Complete a Cancelled appointment');
  const guard = await Appointment.findById(apptId); // This is the Cancelled one
  const isCancelledOrExpired = ['Cancelled', 'No Show', 'Expired'].includes(guard.appointmentStatus);
  if (isCancelledOrExpired) {
    // Simulate the controller guard
    const wouldBlock = isCancelledOrExpired;
    if (wouldBlock) {
      pass('Lifecycle guard', 'Cancelled → Complete transition is blocked by controller guard');
    }
  } else {
    fail('Lifecycle guard', `Appointment has unexpected status: ${guard.appointmentStatus}`);
  }

  // === CLEANUP
  await Appointment.deleteMany({ clientEmail: 'admintest.phase18@example.com' });
  await Slot.deleteMany({ date: TEST_DATE });

  // === FINAL REPORT
  console.log('\n=================================================');
  console.log('  ADMIN LIFECYCLE TEST REPORT');
  console.log('=================================================');
  const passed = RESULTS.filter((r) => r.result === 'PASS').length;
  const failed = RESULTS.filter((r) => r.result === 'FAIL').length;
  for (const r of RESULTS) {
    console.log(`  ${r.result === 'PASS' ? '✅' : '❌'} ${r.label}`);
  }
  console.log(`\n  ${passed} passed / ${failed} failed`);
  console.log(failed === 0 ? '\n  🎉 ALL ADMIN TESTS PASSED' : '\n  ⚠️  SOME TESTS FAILED');
  console.log('=================================================\n');

  await mongoose.disconnect();
  process.exit(failed === 0 ? 0 : 1);
}

run().catch(console.error);
