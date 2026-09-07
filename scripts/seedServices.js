require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Service = require('../models/Service');
const Category = require('../models/Category');

const SERVICES_DATA = [
  // MALE · HAIR
  { id: 'male-haircut', title: 'Hair Cut', slug: 'male-haircut', category: 'Hair', price: 500, duration: 45, description: 'Precision bespoke haircut crafted for facial bone structure.' },
  { id: 'male-beard', title: 'Beard Set Up', slug: 'male-beard', category: 'Hair', price: 200, duration: 30, description: 'Master beard sculpting, trimming and edge definition.' },
  { id: 'male-colour', title: 'Hair Colour for Men', slug: 'male-colour', category: 'Hair', price: 1500, duration: 60, description: 'Natural grey blending and dimensional tone coverage.' },
  { id: 'male-nanoplastia', title: 'Nano Plastia Hair Botox', slug: 'male-nanoplastia', category: 'Hair', price: 4000, duration: 120, description: 'Intensive hair smoothing, mass restoration and frizz defense.' },
  { id: 'male-spa', title: 'Hair Spa', slug: 'male-spa', category: 'Hair', price: 1000, duration: 60, description: 'Restorative scalp massage and botanical conditioning steam.' },

  // MALE · FACE
  { id: 'male-oxy-facial', title: 'Oxy Facial', slug: 'male-oxy-facial', category: 'Face', price: 2000, duration: 60, description: 'Oxygen-infused dermis hydration and deep pore cleansing.' },
  { id: 'male-lotus-facial', title: 'Lotus Facial', slug: 'male-lotus-facial', category: 'Face', price: 2000, duration: 60, description: 'Botanical lotus extracts soothing sun stress and pollution.' },
  { id: 'male-o3-facial', title: 'O3+ Facial', slug: 'male-o3-facial', category: 'Face', price: 3000, duration: 75, description: 'High-performance whitening, glow and clarifying facial.' },
  { id: 'male-detan', title: 'Face De-Tan', slug: 'male-detan', category: 'Face', price: 1000, duration: 45, description: 'Rapid tan reversal and skin brightening treatment.' },

  // FEMALE · HAIR
  { id: 'female-haircut', title: 'Female Hair Cut', slug: 'female-haircut', category: 'Hair', price: 1000, duration: 60, description: 'Precision architectural hair sculpting and couture finish.' },
  { id: 'female-global-colour', title: 'Global Hair Colour', slug: 'female-global-colour', category: 'Hair', price: 5000, duration: 120, description: 'Seamless full coverage rich multidimensional pigmentation.' },
  { id: 'female-balayage', title: 'Balayage Hair Colour', slug: 'female-balayage', category: 'Hair', price: 10000, duration: 180, description: 'Hand-painted sun-kissed balayage with high-gloss finish.' },
  { id: 'female-highlight', title: 'Hair Colour Highlight', slug: 'female-highlight', category: 'Hair', price: 5000, duration: 120, description: 'Foil placement accents adding contrast and depth.' },
  { id: 'female-spa', title: 'Hair Spa', slug: 'female-spa', category: 'Hair', price: 1500, duration: 60, description: 'Deep fiber hydration and revitalizing micro-mist.' },
  { id: 'female-nanoplastia', title: 'Nano Plastia Hair Treatment', slug: 'female-nanoplastia', category: 'Hair', price: 5000, duration: 180, description: 'Formaldehyde-free hair realignment and mirror shine.' },
  { id: 'female-botox', title: 'Hair Botox Treatment', slug: 'female-botox', category: 'Hair', price: 5000, duration: 120, description: 'Collagen & amino acid infusion restoring hair elasticity.' },

  // FEMALE · FACE
  { id: 'female-oxy-facial', title: 'Oxy Facial', slug: 'female-oxy-facial', category: 'Face', price: 2000, duration: 60, description: 'Pure oxygen infusion revitalizing tired skin and enhancing radiance.' },
  { id: 'female-lotus-facial', title: 'Lotus Facial', slug: 'female-lotus-facial', category: 'Face', price: 2000, duration: 60, description: 'Luxury botanical facial restoring suppleness and calm.' },
  { id: 'female-o3-facial', title: 'O3+ Facial', slug: 'female-o3-facial', category: 'Face', price: 3000, duration: 75, description: 'Advanced bridal glow and complexion rejuvenation therapy.' },
  { id: 'female-detan', title: 'Face De-Tan', slug: 'female-detan', category: 'Face', price: 1000, duration: 45, description: 'Instant melanin clearing and luminous complexion renewal.' },
];

async function seedServices() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB.');

  for (const s of SERVICES_DATA) {
    await Service.findOneAndUpdate(
      { slug: s.slug },
      {
        title: s.title,
        slug: s.slug,
        category: s.category,
        price: s.price,
        duration: s.duration,
        description: s.description,
        isActive: true,
      },
      { upsert: true, new: true }
    );
    console.log(`Synced service: ${s.title} (${s.slug}) — ₹${s.price}`);
  }

  console.log(`Successfully synced ${SERVICES_DATA.length} salon services.`);
  await mongoose.disconnect();
}

seedServices().catch(console.error);
