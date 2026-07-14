// backend/config/gridfs.js
const mongoose = require('mongoose');
const multer = require('multer');
const { Readable } = require('stream');
const crypto = require('crypto');
const path = require('path');

let bucket = null;

// تهيئة GridFS
const initGridFS = () => {
    if (!bucket && mongoose.connection.db) {
        bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
            bucketName: 'uploads'
        });
        console.log('✅ تم تهيئة GridFS');
    }
    return bucket;
};

// تخزين الملفات في الذاكرة أولاً
const storage = multer.memoryStorage();

// فلتر الملفات
const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        // فيديوهات
        'video/mp4', 'video/mov', 'video/avi', 'video/webm', 'video/mkv',
        // صور
        'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
        // مستندات
        'application/pdf', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        // ملفات مضغوطة
        'application/zip', 'application/x-rar-compressed', 'application/x-tar',
        'application/gzip',
        // نصوص
        'text/plain', 'text/csv'
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`❌ نوع الملف غير مدعوم: ${file.mimetype}`), false);
    }
};

// إعدادات Multer
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 500 * 1024 * 1024, // 500MB
        files: 20
    },
    fileFilter: fileFilter
});

// دالة لرفع ملف إلى GridFS من Buffer
const uploadToGridFS = (file, metadata = {}) => {
    return new Promise((resolve, reject) => {
        try {
            const bucket = initGridFS();
            if (!bucket) {
                return reject(new Error('GridFS غير مهيأ'));
            }

            // توليد اسم فريد للملف
            const timestamp = Date.now();
            const random = crypto.randomBytes(8).toString('hex');
            const ext = path.extname(file.originalname);
            const filename = `${timestamp}_${random}${ext}`;
            
            // تحديد المجلد
            let folder = 'general';
            if (file.mimetype.startsWith('video/')) {
                folder = 'videos';
            } else if (file.mimetype.startsWith('image/')) {
                folder = 'images';
            } else if (file.mimetype === 'application/pdf') {
                folder = 'pdfs';
            }

            // إنشاء stream للرفع
            const uploadStream = bucket.openUploadStream(filename, {
                contentType: file.mimetype || 'application/octet-stream',
                metadata: {
                    originalName: file.originalname,
                    folder: folder,
                    mimetype: file.mimetype,
                    size: file.size,
                    uploadedAt: new Date(),
                    ...metadata
                }
            });

            let fileId = null;
            let errorOccurred = false;

            uploadStream.on('error', (error) => {
                errorOccurred = true;
                reject(error);
            });

            uploadStream.on('finish', () => {
                if (!errorOccurred) {
                    resolve({
                        id: uploadStream.id,
                        fileId: uploadStream.id.toString(),
                        filename: filename,
                        originalName: file.originalname,
                        contentType: file.mimetype,
                        size: file.size,
                        folder: folder,
                        metadata: metadata
                    });
                }
            });

            // كتابة الملف إلى GridFS
            const readableStream = new Readable();
            readableStream.push(file.buffer);
            readableStream.push(null);
            readableStream.pipe(uploadStream);

        } catch (error) {
            reject(error);
        }
    });
};

// دالة لرفع ملفات متعددة
const uploadMultipleToGridFS = async (files, metadata = {}) => {
    if (!files || files.length === 0) return [];
    const results = [];
    for (const file of files) {
        try {
            const result = await uploadToGridFS(file, metadata);
            results.push(result);
        } catch (error) {
            console.error('❌ خطأ في رفع ملف:', error);
        }
    }
    return results;
};

// دالة للحصول على GridFS Bucket
const getGridFSBucket = () => {
    return initGridFS();
};

// دالة للحصول على معلومات الملف
const getFileInfo = async (fileId) => {
    try {
        const ObjectId = mongoose.Types.ObjectId;
        const bucket = initGridFS();
        if (!bucket) return null;
        
        // التحقق من صحة ObjectId
        if (!ObjectId.isValid(fileId)) {
            console.error('❌ معرف ملف غير صالح:', fileId);
            return null;
        }
        
        const cursor = bucket.find({ _id: new ObjectId(fileId) });
        const files = await cursor.toArray();
        return files[0] || null;
    } catch (error) {
        console.error('❌ خطأ في جلب معلومات الملف:', error);
        return null;
    }
};

// دالة لحذف ملف
const deleteFile = async (fileId) => {
    try {
        const ObjectId = mongoose.Types.ObjectId;
        const bucket = initGridFS();
        if (!bucket) return { success: false, error: 'GridFS غير مهيأ' };
        
        if (!ObjectId.isValid(fileId)) {
            return { success: false, error: 'معرف ملف غير صالح' };
        }
        
        await bucket.delete(new ObjectId(fileId));
        return { success: true };
    } catch (error) {
        console.error('❌ خطأ في حذف الملف:', error);
        return { success: false, error: error.message };
    }
};

// دالة للحصول على رابط البث
const getStreamUrl = (fileId) => {
    return `/api/files/stream/${fileId}`;
};

module.exports = {
    initGridFS,
    upload,
    uploadToGridFS,
    uploadMultipleToGridFS,
    getGridFSBucket,
    getFileInfo,
    deleteFile,
    getStreamUrl
};