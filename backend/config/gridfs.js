const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');
const multer = require('multer');
const { Readable } = require('stream');

let gridFSBucket = null;
let gridFSBucketInstance = null;

// ============================================================
// تهيئة GridFS
// ============================================================
function initGridFS() {
    if (mongoose.connection.readyState === 1) {
        const db = mongoose.connection.db;
        gridFSBucket = new GridFSBucket(db, { bucketName: 'uploads' });
        gridFSBucketInstance = gridFSBucket;
        console.log('✅ GridFS جاهز للعمل');
        return gridFSBucket;
    } else {
        console.error('❌ اتصال قاعدة البيانات غير جاهز');
        return null;
    }
}

function getGridFSBucket() {
    if (!gridFSBucketInstance) {
        return initGridFS();
    }
    return gridFSBucketInstance;
}

// ============================================================
// Multer middleware لرفع الملفات إلى GridFS
// ============================================================
const storage = multer.memoryStorage();

const gridfsUpload = multer({
    storage: storage,
    limits: {
        fileSize: 500 * 1024 * 1024 // 500MB
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'video/mp4', 'video/mpeg', 'video/quicktime', 
            'video/x-msvideo', 'video/webm', 'video/ogg',
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'application/zip', 'application/x-zip-compressed',
            'text/plain'
        ];
        
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`نوع الملف غير مدعوم: ${file.mimetype}`));
        }
    }
});

// ============================================================
// رفع ملف إلى GridFS من multer
// ============================================================
async function uploadFileToGridFS(file, metadata = {}) {
    try {
        const bucket = getGridFSBucket();
        if (!bucket) {
            throw new Error('GridFS غير مهيأ');
        }

        const uploadStream = bucket.openUploadStream(file.originalname, {
            contentType: file.mimetype || 'application/octet-stream',
            metadata: metadata
        });

        return new Promise((resolve, reject) => {
            const buffer = file.buffer;
            uploadStream.write(buffer);
            uploadStream.end();

            uploadStream.on('error', (error) => {
                reject(error);
            });

            uploadStream.on('finish', () => {
                resolve({
                    id: uploadStream.id,
                    fileId: uploadStream.id.toString(),
                    filename: file.originalname,
                    contentType: file.mimetype,
                    size: file.size
                });
            });
        });
    } catch (error) {
        console.error('❌ خطأ في رفع الملف إلى GridFS:', error);
        return null;
    }
}

// ============================================================
// رفع ملف إلى GridFS من Buffer
// ============================================================
async function uploadToGridFS(file, metadata = {}) {
    try {
        const bucket = getGridFSBucket();
        if (!bucket) {
            throw new Error('GridFS غير مهيأ');
        }

        const filename = file.originalname || file.name || 'file';
        const contentType = file.mimetype || file.type || 'application/octet-stream';
        const buffer = file.buffer || file;

        const uploadStream = bucket.openUploadStream(filename, {
            contentType: contentType,
            metadata: metadata
        });

        return new Promise((resolve, reject) => {
            uploadStream.write(buffer);
            uploadStream.end();

            uploadStream.on('error', (error) => {
                reject(error);
            });

            uploadStream.on('finish', () => {
                resolve({
                    id: uploadStream.id,
                    fileId: uploadStream.id.toString(),
                    filename: filename,
                    contentType: contentType,
                    size: buffer.length || file.size || 0
                });
            });
        });
    } catch (error) {
        console.error('❌ خطأ في رفع الملف إلى GridFS:', error);
        return null;
    }
}

// ============================================================
// جلب معلومات ملف
// ============================================================
async function getFileInfo(fileId) {
    try {
        const bucket = getGridFSBucket();
        if (!bucket) return null;

        const ObjectId = require('mongodb').ObjectId;
        const files = await mongoose.connection.db
            .collection('uploads.files')
            .find({ _id: new ObjectId(fileId) })
            .toArray();

        return files.length > 0 ? files[0] : null;
    } catch (error) {
        console.error('❌ خطأ في جلب معلومات الملف:', error);
        return null;
    }
}

// ============================================================
// حذف ملف
// ============================================================
async function deleteFile(fileId) {
    try {
        const bucket = getGridFSBucket();
        if (!bucket) {
            return { success: false, error: 'GridFS غير مهيأ' };
        }

        const ObjectId = require('mongodb').ObjectId;
        await bucket.delete(new ObjectId(fileId));
        return { success: true };
    } catch (error) {
        console.error('❌ خطأ في حذف الملف:', error);
        return { success: false, error: error.message };
    }
}

// ============================================================
// الحصول على رابط البث
// ============================================================
function getStreamUrl(fileId) {
    const baseUrl = process.env.BASE_URL || 'https://irteqa.onrender.com';
    return `${baseUrl}/api/files/stream/${fileId}`;
}

// ============================================================
// تحديد نوع الملف من الامتداد
// ============================================================
function getMimeType(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const mimeTypes = {
        'pdf': 'application/pdf',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'svg': 'image/svg+xml',
        'mp4': 'video/mp4',
        'mov': 'video/quicktime',
        'avi': 'video/x-msvideo',
        'webm': 'video/webm',
        'ogg': 'video/ogg',
        'mp3': 'audio/mpeg',
        'wav': 'audio/wav',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xls': 'application/vnd.ms-excel',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'ppt': 'application/vnd.ms-powerpoint',
        'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'zip': 'application/zip',
        'rar': 'application/x-rar-compressed',
        '7z': 'application/x-7z-compressed',
        'txt': 'text/plain',
        'csv': 'text/csv',
        'json': 'application/json',
        'xml': 'application/xml'
    };
    return mimeTypes[ext] || 'application/octet-stream';
}

module.exports = {
    initGridFS,
    getGridFSBucket,
    gridfsUpload,
    uploadFileToGridFS,
    uploadToGridFS,
    getFileInfo,
    deleteFile,
    getStreamUrl,
    getMimeType
};