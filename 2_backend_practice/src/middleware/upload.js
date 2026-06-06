import multer from 'multer';
import path from 'path';
import fs from 'fs';

//Ensure the "uploads" folder actually exists, otherwise Multer will crash
const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

//Configure Storage Engine
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir); // Save files in the 'uploads' folder
    },
    filename: function (req, file, cb) {
        // Create a unique filename: timestamp + original extension
        // e.g., 1678901234-avatar.jpg
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

//Configure File Filter (Security!)
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true); // Accept the file
    } else {
        //Reject the file and throw an error to our global errorHandler
        const error = new Error('Invalid file type. Only JPG, PNG, and WEBP are allowed.');
        error.statusCode = 400;
        cb(error, false);
    }
};

//Build the final Multer object
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5 Megabytes max
    }
});

export default upload;