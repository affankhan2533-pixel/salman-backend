const cloudinary = require('cloudinary').v2;

const configureCloudinary = () => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (cloudName && apiKey && apiSecret) {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });
    console.log('[Cloudinary] Successfully initialized Cloudinary v2 SDK');
    return true;
  } else {
    console.log('[Cloudinary] Missing Cloudinary credentials in .env - falling back to local disk storage');
    return false;
  }
};

module.exports = {
  cloudinary,
  configureCloudinary,
};
