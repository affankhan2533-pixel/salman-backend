const { z } = require('zod');

const createGallerySchema = z.object({
  body: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    imageUrl: z.string().optional(),
    beforeImage: z.string().optional(),
    afterImage: z.string().optional(),
    thumbnail: z.string().optional(),
    category: z.string().optional(),
    isVisible: z.preprocess((val) => String(val) === 'true' || val === true, z.boolean()).optional(),
    order: z.preprocess((val) => Number(val), z.number()).optional(),
    sortOrder: z.preprocess((val) => Number(val), z.number()).optional(),
    featured: z.preprocess((val) => String(val) === 'true' || val === true, z.boolean()).optional(),
  }),
});

const updateGallerySchema = z.object({
  body: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    imageUrl: z.string().optional(),
    beforeImage: z.string().optional(),
    afterImage: z.string().optional(),
    thumbnail: z.string().optional(),
    category: z.string().optional(),
    isVisible: z.preprocess((val) => String(val) === 'true' || val === true, z.boolean()).optional(),
    order: z.preprocess((val) => Number(val), z.number()).optional(),
    sortOrder: z.preprocess((val) => Number(val), z.number()).optional(),
    featured: z.preprocess((val) => String(val) === 'true' || val === true, z.boolean()).optional(),
  }),
});

module.exports = {
  createGallerySchema,
  updateGallerySchema,
};
