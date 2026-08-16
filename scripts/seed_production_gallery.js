require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Gallery = require('../models/Gallery');

const PROD_GALLERY = [
  {
    title: 'Signature Precision Fade & Sculpt',
    category: 'Haircuts',
    imageUrl: '/images/gallery/WhatsApp Image 2026-08-14 at 3.19.34 AM.jpeg',
    isVisible: true,
    order: 0,
    description: 'Bespoke precision fade and beard sculpt.',
  },
  {
    title: 'Architectural Sculpted Layers',
    category: 'Haircuts',
    imageUrl: '/images/gallery/image.png',
    isVisible: true,
    order: 1,
    description: 'Precision sculpted layers tailored to facial structure.',
  },
  {
    title: 'Champagne Gloss Balayage',
    category: 'Coloring',
    imageUrl: '/images/gallery/image copy.png',
    isVisible: true,
    order: 2,
    description: 'Hand-painted dimensional balayage with organic gloss.',
  },
  {
    title: 'Luxury Editorial Waves & Texture',
    category: 'Styling',
    imageUrl: '/images/gallery/image copy 2.png',
    isVisible: true,
    order: 3,
    description: 'High-fashion editorial waves with silk finish.',
  },
  {
    title: 'Modern Perimeter Crop & Taper',
    category: 'Haircuts',
    imageUrl: '/images/gallery/image copy 3.png',
    isVisible: true,
    order: 4,
    description: 'Clean architectural perimeter cut and subtle taper.',
  },
  {
    title: 'Heritage Royal Bridal Coiffure',
    category: 'Styling',
    imageUrl: '/images/gallery/image copy 4.png',
    isVisible: true,
    order: 5,
    description: 'Intricate wedding day styling and veil anchoring.',
  },
  {
    title: 'Botanical Scalp & Restorative Ritual',
    category: 'Treatments',
    imageUrl: '/images/gallery/image copy 5.png',
    isVisible: true,
    order: 6,
    description: 'Restorative scalp therapy with organic botanical steam.',
  },
  {
    title: 'Dimensional Caramel & Honey Melt',
    category: 'Coloring',
    imageUrl: '/images/gallery/image copy 6.png',
    isVisible: true,
    order: 7,
    description: 'Rich multi-tonal caramel and honey balayage melt.',
  },
  {
    title: 'Sleek High-Gloss Precision Finish',
    category: 'Styling',
    imageUrl: '/images/gallery/image copy 7.png',
    isVisible: true,
    order: 8,
    description: 'Mirror-shine glass hair styling finish.',
  },
  {
    title: 'Classic Sculpted Pompadour & Fade',
    category: 'Haircuts',
    imageUrl: '/images/gallery/image copy 8.png',
    isVisible: true,
    order: 9,
    description: 'Timeless pompadour silhouette with skin fade.',
  },
  {
    title: 'Silk Amino Keratin Restructuring',
    category: 'Treatments',
    imageUrl: '/images/gallery/image copy 9.png',
    isVisible: true,
    order: 10,
    description: 'Formaldehyde-free protein smoothing and restructuring.',
  },
  {
    title: 'Platinum & Nordic Frost Tonal Glaze',
    category: 'Coloring',
    imageUrl: '/images/gallery/image copy 11.png',
    isVisible: true,
    order: 11,
    description: 'Cool tone platinum glaze with mirror gloss.',
  },
  {
    title: 'Red Carpet Glamour & Volume',
    category: 'Styling',
    imageUrl: '/images/gallery/image copy 12.png',
    isVisible: true,
    order: 12,
    description: 'Voluminous red carpet blow-dry styling.',
  },
  {
    title: 'Couture Bridal Crown & Pinning',
    category: 'Styling',
    imageUrl: '/images/gallery/image copy 13.png',
    isVisible: true,
    order: 13,
    description: 'Custom bridal crown pinning and headpiece setting.',
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
