const { z } = require('zod');

const createServiceSchema = z.object({
  body: z.object({
    title: z.string({ required_error: 'Service title is required' }).min(2, 'Title must be at least 2 characters'),
    category: z.string({ required_error: 'Category is required' }).min(1, 'Category is required'),
    description: z.string().optional(),
    price: z.preprocess((val) => Number(val), z.number().min(0, 'Price cannot be negative')),
    duration: z.preprocess((val) => Number(val), z.number().min(1, 'Duration must be at least 1 minute')),
    image: z.string().optional(),
    isFeatured: z.preprocess((val) => String(val) === 'true' || val === true, z.boolean()).optional(),
    features: z.array(z.string()).optional(),
    isActive: z.preprocess((val) => String(val) === 'true' || val === true, z.boolean()).optional(),
  }),
});

const updateServiceSchema = z.object({
  body: z.object({
    title: z.string().min(2).optional(),
    category: z.string().min(1).optional(),
    description: z.string().optional(),
    price: z.preprocess((val) => Number(val), z.number().min(0)).optional(),
    duration: z.preprocess((val) => Number(val), z.number().min(1)).optional(),
    image: z.string().optional(),
    isFeatured: z.preprocess((val) => String(val) === 'true' || val === true, z.boolean()).optional(),
    features: z.array(z.string()).optional(),
    isActive: z.preprocess((val) => String(val) === 'true' || val === true, z.boolean()).optional(),
  }),
});

module.exports = {
  createServiceSchema,
  updateServiceSchema,
};
