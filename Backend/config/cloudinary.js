const cloudinary = require("cloudinary").v2;
const multer = require("multer");

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "demo_cloud",
    api_key: process.env.CLOUDINARY_API_KEY || "demo_api_key",
    api_secret: process.env.CLOUDINARY_API_SECRET || "demo_api_secret",
});

// Memory storage for Multer so files can be uploaded to Cloudinary or converted to data URLs in dev mode
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Invalid file type. Only JPEG, PNG, and WEBP images are allowed."), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
});

/**
 * Uploads buffer to Cloudinary if real credentials are configured,
 * otherwise returns a clean base64 data URI or fallback image URL for seamless dev usage.
 */
const uploadImageBuffer = async (fileBuffer, mimetype, folder = "zingbite") => {
    if (
        process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_CLOUD_NAME !== "demo_cloud" &&
        process.env.CLOUDINARY_API_KEY !== "demo_api_key"
    ) {
        return new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                { folder, resource_type: "image" },
                (error, result) => {
                    if (error) return reject(error);
                    resolve(result.secure_url);
                }
            );
            stream.end(fileBuffer);
        });
    }

    // Fallback for local development when Cloudinary keys are placeholders
    const base64 = fileBuffer.toString("base64");
    return `data:${mimetype};base64,${base64}`;
};

module.exports = {
    cloudinary,
    upload,
    uploadImageBuffer,
};

