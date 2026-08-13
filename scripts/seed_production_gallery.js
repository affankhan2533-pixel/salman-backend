require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Gallery = require('../models/Gallery');

const PROD_GALLERY = [
  {
    title: 'Architectural Sculpted Waves',
    category: 'Haircuts',
    imageUrl: 'https://images.unsplash.com/photo-1560869713-7d0a29430803?auto=format&fit=crop&q=80&w=1600',
    isVisible: true,
    order: 0,
    description: 'Precision sculpted layers tailored to bone structure.',
  },
  {
    title: 'Champagne Gloss Balayage',
    category: 'Coloring',
    imageUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&q=80&w=1600',
    isVisible: true,
    order: 1,
    description: 'Hand-painted dimensional balayage with organic gloss.',
  },
  {
    title: 'Minimalist Precision Perimeter',
    category: 'Haircuts',
    imageUrl: 'https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&q=80&w=1600',
    isVisible: true,
    order: 2,
    description: 'Sharp architectural lines and mirror finish.',
  },
  {
    title: 'Heritage Bridal Coiffure',
    category: 'Styling',
    imageUrl: 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?auto=format&fit=crop&q=80&w=1600',
    isVisible: true,
    order: 3,
    description: 'Intricate wedding day styling with veil placement.',
  },
  {
    title: 'Botanical Scalp & Hair Ritual',
    category: 'Treatments',
    imageUrl: 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&q=80&w=1600',
    isVisible: true,
    order: 4,
    description: 'Restorative scalp therapy with botanical micro-steam.',
  },
  {
    title: 'Private Atelier Studio',
    category: 'Salon',
    imageUrl: 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&q=80&w=1600',
    isVisible: true,
    order: 5,
    description: 'Our luxury salon interior in Kurla West, Mumbai.',
  },
];

async function seedProductionGallery() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('=== SEEDING PRODUCTION GALLERY ===');

  for (const item of PROD_GALLERY) {
    await Gallery.findOneAndUpdate(
      { title: item.title },
      { ...item },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  const count = await Gallery.countDocuments();
  console.log(`Successfully seeded ${count} production gallery items.`);

  await mongoose.disconnect();
}

seedProductionGallery().catch(console.error);
