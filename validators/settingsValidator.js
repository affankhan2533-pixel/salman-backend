const { z } = require('zod');

const updateSettingsSchema = z.object({
  body: z.object({
    businessName: z.string().optional(),
    hindiName: z.string().optional(),
    tagline: z.string().optional(),
    workingHours: z.object({}).passthrough().optional(),
    contactDetails: z.object({}).passthrough().optional(),
    socialLinks: z.object({}).passthrough().optional(),
    salonSettings: z.object({}).passthrough().optional(),
  }),
});

module.exports = {
  updateSettingsSchema,
};
