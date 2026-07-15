// backend/config/gridfs.js
const mongoose = require('mongoose');
const multer = require('multer');
const { Readable } = require('stream');
const crypto = require('crypto');
const path = require('path');

let bucket = null;

// ============================================================
// تهيئة GridFS
// ============================================================
const initGridFS = () => {
    try {
        if (!mongoose.connection || !mongoose.connection.db) {
            console.error('❌ لا يوجد اتصال بقاعدة البيانات');
            return null;
        }
        if (!bucket) {
            bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
                bucketName: 'uploads'
            });
            console.log('✅ تم تهيئة GridFS');
        }
        return bucket;
    } catch (error) {
        console.error('❌ خطأ في تهيئة GridFS:', error);
        return null;
    }
};

// ============================================================
// تحديد نوع الملف من الامتداد
// ============================================================
const getMimeType = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    const mimeTypes = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'svg': 'image/svg+xml',
        'pdf': 'application/pdf',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xls': 'application/vnd.ms-excel',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'ppt': 'application/vnd.ms-powerpoint',
        'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'mp4': 'video/mp4',
        'mov': 'video/quicktime',
        'avi': 'video/x-msvideo',
        'webm': 'video/webm',
        'mkv': 'video/x-matroska',
        'zip': 'application/zip',
        'rar': 'application/x-rar-compressed',
        'tar': 'application/x-tar',
        'gz': 'application/gzip',
        '7z': 'application/x-7z-compressed',
        'txt': 'text/plain',
        'csv': 'text/csv',
        'html': 'text/html',
        'css': 'text/css',
        'js': 'text/javascript',
        'json': 'application/json',
        'xml': 'application/xml',
        'mp3': 'audio/mpeg',
        'wav': 'audio/wav',
        'ogg': 'audio/ogg',
        'flac': 'audio/flac'
    };
    return mimeTypes[ext] || 'application/octet-stream';
};

// ============================================================
// تكوين Multer
// ============================================================
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'video/mp4', 'video/mov', 'video/avi', 'video/webm',
        'application/pdf', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/zip', 'text/plain'
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        // ✅ محاولة استنتاج النوع من الامتداد
        const ext = file.originalname.split('.').pop().toLowerCase();
        const mimeType = getMimeType(file.originalname);
        if (mimeType !== 'application/octet-stream') {
            file.mimetype = mimeType;
            cb(null, true);
        } else {
            cb(new Error(`نوع الملف غير مدعوم: ${file.mimetype}`), false);
        }
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 500 * 1024 * 1024, files: 20 },
    fileFilter: fileFilter
});

// ============================================================
// رفع ملف إلى GridFS
// ============================================================
const uploadToGridFS = (file, metadata = {}) => {
    return new Promise((resolve, reject) => {
        try {
            const bucket = initGridFS();
            if (!bucket) {
                return reject(new Error('GridFS غير مهيأ'));
            }

            const timestamp = Date.now();
            const random = Math.random().toString(36).substring(7);
            const ext = path.extname(file.originalname || 'file');
            const filename = `${timestamp}_${random}${ext}`;

            const uploadStream = bucket.openUploadStream(filename, {
                contentType: file.mimetype || 'application/octet-stream',
                metadata: {
                    originalName: file.originalname || 'file',
                    mimetype: file.mimetype || 'application/octet-stream',
                    size: file.size || 0,
                    uploadedAt: new Date(),
                    ...metadata
                }
            });

            let errorOccurred = false;

            uploadStream.on('error', (error) => {
                errorOccurred = true;
                console.error('❌ خطأ في رفع الملف إلى GridFS:', error);
                reject(error);
            });

            uploadStream.on('finish', () => {
                if (!errorOccurred) {
                    resolve({
                        id: uploadStream.id,
                        fileId: uploadStream.id.toString(),
                        filename: filename,
                        originalName: file.originalname || 'file',
                        contentType: file.mimetype || 'application/octet-stream',
                        size: file.size || 0,
                        metadata: metadata
                    });
                }
            });

            const readableStream = new Readable();
            readableStream.push(file.buffer);
            readableStream.push(null);
            readableStream.pipe(uploadStream);

        } catch (error) {
            console.error('❌ خطأ في رفع الملف:', error);
            reject(error);
        }
    });
};

// ============================================================
// رفع ملف من Base64 إلى GridFS
// ============================================================
const uploadBase64ToGridFS = async (base64Data, filename, metadata = {}) => {
    try {
        let mimeType = 'application/octet-stream';
        let cleanBase64 = base64Data;
        
        if (base64Data.includes(';base64,')) {
            const parts = base64Data.split(';base64,');
            if (parts[0].includes('data:')) {
                mimeType = parts[0].replace('data:', '');
            }
            cleanBase64 = parts[1];
        }
        
        const buffer = Buffer.from(cleanBase64, 'base64');
        
        const tempFile = {
            buffer: buffer,
            originalname: filename || 'file',
            mimetype: mimeType,
            size: buffer.length
        };
        
        return await uploadToGridFS(tempFile, metadata);
        
    } catch (error) {
        console.error('❌ خطأ في رفع الملف من Base64:', error);
        throw error;
    }
};

// ============================================================
// الحصول على GridFS Bucket
// ============================================================
const getGridFSBucket = () => initGridFS();

// ============================================================
// جلب معلومات الملف
// ============================================================
const getFileInfo = async (fileId) => {
    try {
        const ObjectId = mongoose.Types.ObjectId;
        
        if (!ObjectId.isValid(fileId)) {
            console.error('❌ معرف غير صالح:', fileId);
            return null;
        }
        
        if (!mongoose.connection || !mongoose.connection.db) {
            console.error('❌ لا يوجد اتصال بقاعدة البيانات');
            return null;
        }
        
        const bucket = initGridFS();
        if (!bucket) {
            console.error('❌ GridFS غير مهيأ');
            return null;
        }
        
        const cursor = bucket.find({ _id: new ObjectId(fileId) });
        const files = await cursor.toArray();
        
        if (files.length === 0) {
            console.error('❌ الملف غير موجود:', fileId);
            return null;
        }
        
        console.log('✅ تم العثور على الملف:', files[0].filename);
        return files[0];
        
    } catch (error) {
        console.error('❌ خطأ في جلب معلومات الملف:', error);
        return null;
    }
};

// ============================================================
// الحصول على Stream الملف
// ============================================================
const getFileStream = (fileId) => {
    try {
        const ObjectId = mongoose.Types.ObjectId;
        if (!ObjectId.isValid(fileId)) {
            throw new Error('معرف ملف غير صالح');
        }
        
        const bucket = initGridFS();
        if (!bucket) {
            throw new Error('GridFS غير مهيأ');
        }
        
        return bucket.openDownloadStream(new ObjectId(fileId));
        
    } catch (error) {
        console.error('❌ خطأ في الحصول على Stream الملف:', error);
        throw error;
    }
};

// ============================================================
// حذف ملف من GridFS
// ============================================================
const deleteFile = async (fileId) => {
    try {
        const ObjectId = mongoose.Types.ObjectId;
        if (!ObjectId.isValid(fileId)) {
            return { success: false, error: 'معرف ملف غير صالح' };
        }
        
        const bucket = initGridFS();
        if (!bucket) {
            return { success: false, error: 'GridFS غير مهيأ' };
        }
        
        await bucket.delete(new ObjectId(fileId));
        console.log('✅ تم حذف الملف من GridFS:', fileId);
        return { success: true };
        
    } catch (error) {
        console.error('❌ خطأ في حذف الملف:', error);
        return { success: false, error: error.message };
    }
};

// ============================================================
// الحصول على رابط البث
// ============================================================
const getStreamUrl = (fileId) => {
    return `/api/chat/files/${fileId}`;
};

// ============================================================
// تصدير الدوال
// ============================================================
module.exports = {
    initGridFS,
    upload,
    uploadToGridFS,
    uploadBase64ToGridFS,
    getGridFSBucket,
    getFileInfo,
    getFileStream,
    deleteFile,
    getStreamUrl,
    getMimeType
};