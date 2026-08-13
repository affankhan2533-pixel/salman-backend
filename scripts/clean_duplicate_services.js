require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Service = require('../models/Service');
const Appointment = require('../models/Appointment');

const PROD_SERVICES = [
  {
    title: 'Bespoke Precision Haircut & Styling',
    slug: 'haircut',
    category: 'Haircuts',
    price: 3500,
    duration: 60,
    description: 'Architectural precision sculpting tailored to facial bone structure.',
    isFeatured: true,
    isActive: true,
  },
  {
    title: 'Couture Balayage & Tone Formulation',
    slug: 'color',
    category: 'Coloring',
    price: 8500,
    duration: 150,
    description: 'Hand-painted dimensional balayage with high-shine organic gloss.',
    isFeatured: true,
    isActive: true,
  },
  {
    title: 'European Botanical Scalp Therapy',
    slug: 'spa',
    category: 'Treatments',
    price: 4000,
    duration: 75,
    description: 'Deep restorative scalp therapy with botanical oil micro-steam.',
    isFeatured: false,
    isActive: true,
  },
  {
    title: 'Silk Keratin Glass-Smoothing Infusion',
    slug: 'keratin',
    category: 'Treatments',
    price: 9000,
    duration: 180,
    description: 'Formaldehyde-free silk keratin for weightless shine & frizz defense.',
    isFeatured: true,
    isActive: true,
  },
  {
    title: 'Private Atelier Bridal Coiffure',
    slug: 'bridal',
    category: 'Styling',
    price: 15000,
    duration: 120,
    description: 'Private suite trial session, veil placement & extension architecture.',
    isFeatured: false,
    isActive: true,
  },
  {
    title: 'Collagen & Amino Acid Hair Restructuring',
    slug: 'botox',
    category: 'Treatments',
    price: 10500,
    duration: 120,
    description: 'Intensive molecular hair botox treatment restoring mass & mirror shine.',
    isFeatured: false,
    isActive: true,
  },
];

async function cleanDuplicateServices() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('=== SERVICE DUPLICATE CLEANUP & PRODUCTION SEED ===');

  // Keep track of titles seen to eliminate exact duplicates
  const allServices = await Service.find().sort({ createdAt: 1 });
  const seenTitles = new Set();
  const removed = [];

  for (const s of allServices) {
    const normTitle = s.title.trim();
    const apptCount = await Appointment.countDocuments({ service: s._id });

    const isProdMatch = PROD_SERVICES.some((p) => p.title === normTitle || p.slug === s.slug);

    if (seenTitles.has(normTitle) && apptCount === 0) {
      await Service.findByIdAndDelete(s._id);
      removed.push(`${s.title} (${s._id})`);
    } else if (!isProdMatch && apptCount === 0) {
      await Service.findByIdAndDelete(s._id);
      removed.push(`Unmatched: ${s.title} (${s._id})`);
    } else {
      seenTitles.add(normTitle);
    }
  }

  // Ensure exact 6 production services exist cleanly
  for (const prod of PROD_SERVICES) {
    await Service.findOneAndUpdate(
      { title: prod.title },
      { ...prod },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  const finalServices = await Service.find();
  console.log(`\nCleanup completed. ${finalServices.length} unique services retained in database:`);
  finalServices.forEach((s) => console.log(`  - ${s.title} [${s.category}] ₹${s.price}`));

  await mongoose.disconnect();
}

cleanDuplicateServices().catch(console.error);
