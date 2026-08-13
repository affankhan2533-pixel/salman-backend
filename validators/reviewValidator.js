const { z } = require('zod');

const submitReviewSchema = z.object({
  body: z.object({
    clientName: z.string({ required_error: 'Name is required' }).min(2, 'Name must be at least 2 characters'),
    clientAvatar: z.string().optional(),
    rating: z.preprocess((val) => Number(val), z.number().min(1).max(5)),
    comment: z.string({ required_error: 'Comment is required' }).min(5, 'Comment must be at least 5 characters'),
    service: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
    stylist: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  }),
});

const approveReviewSchema = z.object({
  body: z.object({
    status: z.enum(['Approved', 'Rejected', 'Pending']),
    isFeatured: z.boolean().optional(),
  }),
});

const replyReviewSchema = z.object({
  body: z.object({
    replyText: z.string({ required_error: 'Reply text is required' }).min(2, 'Reply text must be at least 2 characters'),
  }),
});

module.exports = {
  submitReviewSchema,
  approveReviewSchema,
  replyReviewSchema,
};
