// backend/config/gridfs.js
const mongoose = require('mongoose');
const multer = require('multer');
const { Readable } = require('stream');
const crypto = require('crypto');
const path = require('path');

let bucket = null;

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
        cb(new Error(`نوع الملف غير مدعوم: ${file.mimetype}`), false);
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 500 * 1024 * 1024, files: 20 },
    fileFilter: fileFilter
});

 // backend/config/gridfs.js

const uploadToGridFS = (file, metadata = {}) => {
    return new Promise((resolve, reject) => {
        try {
            const bucket = initGridFS();
            if (!bucket) {
                return reject(new Error('GridFS غير مهيأ'));
            }

            // ✅ توليد اسم فريد للملف
            const timestamp = Date.now();
            const random = Math.random().toString(36).substring(7);
            const ext = path.extname(file.originalname || 'file');
            const filename = `${timestamp}_${random}${ext}`;

            // ✅ إنشاء stream للرفع
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

            // ✅ كتابة الملف إلى GridFS
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

const getGridFSBucket = () => initGridFS();

const getFileInfo = async (fileId) => {
    try {
        const ObjectId = mongoose.Types.ObjectId;
        
        // ✅ تحقق من صحة المعرف
        if (!ObjectId.isValid(fileId)) {
            console.error('❌ معرف غير صالح:', fileId);
            return null;
        }
        
        // ✅ تأكد من وجود الاتصال بقاعدة البيانات
        if (!mongoose.connection || !mongoose.connection.db) {
            console.error('❌ لا يوجد اتصال بقاعدة البيانات');
            return null;
        }
        
        // ✅ جلب معلومات الملف
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
const deleteFile = async (fileId) => {
    try {
        const ObjectId = mongoose.Types.ObjectId;
        const bucket = initGridFS();
        if (!bucket) return { success: false };
        await bucket.delete(new ObjectId(fileId));
        return { success: true };
    } catch (error) {
        console.error('❌ خطأ في حذف الملف:', error);
        return { success: false };
    }
};

module.exports = {
    initGridFS,
    upload,
    uploadToGridFS,
    getGridFSBucket,
    getFileInfo,
    deleteFile
};