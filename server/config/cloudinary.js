/**
 * Cloudinary Configuration
 *
 * Configures the Cloudinary SDK v2 instance using environment variables
 * for society logo and user avatar cloud storage uploads.
 */

const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

module.exports = cloudinary;
