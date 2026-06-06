import fs from 'fs'
import path from 'path'

const uploadDir = 'uploads/'
let cachedUpload = null

// Ensure the uploads folder exists before saving profile photos.
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir)
}

async function getMulterUpload() {
  if (cachedUpload) return cachedUpload

  let multer
  try {
    multer = (await import('multer')).default
  } catch (error) {
    const missingDependencyError = new Error('Photo upload needs multer. Run npm install inside 2_backend_practice.')
    missingDependencyError.statusCode = 424
    throw missingDependencyError
  }

  const storage = multer.diskStorage({
    destination(request, file, callback) {
      callback(null, uploadDir)
    },
    filename(request, file, callback) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
      callback(null, uniqueSuffix + path.extname(file.originalname))
    },
  })

  const fileFilter = (request, file, callback) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

    if (allowedTypes.includes(file.mimetype)) {
      callback(null, true)
      return
    }

    const error = new Error('Invalid file type. Only JPG, PNG, and WEBP are allowed.')
    error.statusCode = 400
    callback(error, false)
  }

  cachedUpload = multer({
    storage,
    fileFilter,
    limits: {
      fileSize: 5 * 1024 * 1024,
    },
  })

  return cachedUpload
}

const upload = {
  single(fieldName) {
    return async (request, response, next) => {
      try {
        const multerUpload = await getMulterUpload()
        multerUpload.single(fieldName)(request, response, next)
      } catch (error) {
        next(error)
      }
    }
  },
}

export default upload
