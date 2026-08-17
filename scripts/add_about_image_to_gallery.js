require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Gallery = require('../models/Gallery');

async function addAboutImageToGallery() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB.');

    // Check if record already exists by imageUrl or title
    const existing = await Gallery.findOne({
      $or: [
        { imageUrl: '/images/image.png' },
        { title: 'Salman Hair Studio', category: 'Salon' }
      ]
    });

    if (existing) {
      console.log('Gallery record already exists:', existing._id);
      existing.title = 'Salman Hair Studio';
      existing.category = 'Salon';
      existing.imageUrl = '/images/image.png';
      existing.isVisible = true;
      existing.order = 0;
      await existing.save();
      console.log('Updated existing Gallery record to ensure visibility and order=0.');
    } else {
      const newRecord = await Gallery.create({
        title: 'Salman Hair Studio',
        category: 'Salon',
        imageUrl: '/images/image.png',
        isVisible: true,
        order: 0,
        description: 'Kurla West Flagship Atelier & Grooming Sanctuary',
      });
      console.log('Created new Gallery record:', newRecord._id);
    }

    // Shift orders of other items if needed so 0 is unique at start
    const all = await Gallery.find().sort({ order: 1, createdAt: -1 });
    console.log(`Total gallery items in database: ${all.length}`);

    await mongoose.disconnect();
    console.log('Done.');
  } catch (err) {
    console.error('Error adding about image to gallery:', err);
    process.exit(1);
  }
}

addAboutImageToGallery();
