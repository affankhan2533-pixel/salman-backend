const { z } = require('zod');

const createStylistSchema = z.object({
  body: z.object({
    name: z.string({ required_error: 'Stylist name is required' }).min(2, 'Name must be at least 2 characters'),
    user: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
    title: z.string().optional(),
    bio: z.string().optional(),
    avatar: z.string().optional(),
    specialties: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/)).optional(),
    experienceYears: z.preprocess((val) => Number(val), z.number().min(0)).optional(),
    rating: z.preprocess((val) => Number(val), z.number().min(1).max(5)).optional(),
    workingDays: z.array(z.string()).optional(),
    instagram: z.string().optional(),
    isActive: z.preprocess((val) => String(val) === 'true' || val === true, z.boolean()).optional(),
  }),
});

const updateStylistSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    user: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
    title: z.string().optional(),
    bio: z.string().optional(),
    avatar: z.string().optional(),
    specialties: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/)).optional(),
    experienceYears: z.preprocess((val) => Number(val), z.number().min(0)).optional(),
    rating: z.preprocess((val) => Number(val), z.number().min(1).max(5)).optional(),
    workingDays: z.array(z.string()).optional(),
    instagram: z.string().optional(),
    isActive: z.preprocess((val) => String(val) === 'true' || val === true, z.boolean()).optional(),
  }),
});

module.exports = {
  createStylistSchema,
  updateStylistSchema,
};
