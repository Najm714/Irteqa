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
        // ✅ التأكد من وجود اتصال بقاعدة البيانات
        if (!mongoose.connection || !mongoose.connection.db) {
            console.error('❌ لا يوجد اتصال بقاعدة البيانات');
            return null;
        }
        
        // ✅ إنشاء bucket إذا لم يكن موجوداً
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
// تكوين Multer للتخزين في الذاكرة
// ============================================================
const storage = multer.memoryStorage();

// ============================================================
// فلتر الملفات المسموح بها
// ============================================================
const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        // فيديوهات
        'video/mp4', 'video/mov', 'video/avi', 'video/webm', 'video/mkv',
        'video/quicktime',
        // صور
        'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
        'image/bmp', 'image/tiff',
        // مستندات
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        // ملفات مضغوطة
        'application/zip', 'application/x-rar-compressed', 'application/x-tar',
        'application/gzip', 'application/x-7z-compressed',
        // نصوص
        'text/plain', 'text/csv', 'text/html', 'text/css', 'text/javascript',
        'application/json', 'application/xml',
        // ملفات أخرى
        'application/octet-stream'
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        // ✅ محاولة استنتاج النوع من الامتداد
        const ext = file.originalname.split('.').pop().toLowerCase();
        const extMap = {
            'mp4': 'video/mp4',
            'mov': 'video/quicktime',
            'avi': 'video/x-msvideo',
            'webm': 'video/webm',
            'mkv': 'video/x-matroska',
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
            'zip': 'application/zip',
            'rar': 'application/x-rar-compressed',
            'tar': 'application/x-tar',
            'gz': 'application/gzip',
            'txt': 'text/plain',
            'csv': 'text/csv',
            'html': 'text/html',
            'css': 'text/css',
            'js': 'text/javascript',
            'json': 'application/json',
            'xml': 'application/xml'
        };
        
        if (extMap[ext]) {
            file.mimetype = extMap[ext];
            cb(null, true);
        } else {
            cb(new Error(`❌ نوع الملف غير مدعوم: ${file.mimetype} (${ext})`), false);
        }
    }
};

// ============================================================
// إعدادات Multer
// ============================================================
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 500 * 1024 * 1024, // 500MB
        files: 20
    },
    fileFilter: fileFilter
});

// ============================================================
// رفع ملف إلى GridFS من Buffer
// ============================================================
const uploadToGridFS = (file, metadata = {}) => {
    return new Promise((resolve, reject) => {
        try {
            const bucket = initGridFS();
            if (!bucket) {
                return reject(new Error('GridFS غير مهيأ'));
            }

            // ✅ توليد اسم فريد للملف
            const timestamp = Date.now();
            const random = crypto.randomBytes(8).toString('hex');
            const ext = path.extname(file.originalname || 'file');
            const filename = `${timestamp}_${random}${ext}`;

            // ✅ تحديد المجلد بناءً على نوع الملف
            let folder = 'general';
            if (file.mimetype && file.mimetype.startsWith('video/')) {
                folder = 'videos';
            } else if (file.mimetype && file.mimetype.startsWith('image/')) {
                folder = 'images';
            } else if (file.mimetype === 'application/pdf') {
                folder = 'pdfs';
            } else if (file.mimetype && (file.mimetype.includes('word') || file.mimetype.includes('document'))) {
                folder = 'documents';
            } else if (file.mimetype && (file.mimetype.includes('excel') || file.mimetype.includes('sheet'))) {
                folder = 'spreadsheets';
            } else if (file.mimetype && (file.mimetype.includes('powerpoint') || file.mimetype.includes('presentation'))) {
                folder = 'presentations';
            } else if (file.mimetype && (file.mimetype.includes('zip') || file.mimetype.includes('compressed'))) {
                folder = 'archives';
            }

            // ✅ إنشاء stream للرفع
            const uploadStream = bucket.openUploadStream(filename, {
                contentType: file.mimetype || 'application/octet-stream',
                metadata: {
                    originalName: file.originalname || 'file',
                    folder: folder,
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
                        folder: folder,
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

// ============================================================
// رفع ملفات متعددة إلى GridFS
// ============================================================
const uploadMultipleToGridFS = async (files, metadata = {}) => {
    if (!files || files.length === 0) return [];
    const results = [];
    for (const file of files) {
        try {
            const result = await uploadToGridFS(file, metadata);
            results.push(result);
        } catch (error) {
            console.error('❌ خطأ في رفع ملف:', error);
            results.push(null);
        }
    }
    return results.filter(r => r !== null);
};

// ============================================================
// الحصول على GridFS Bucket
// ============================================================
const getGridFSBucket = () => {
    return initGridFS();
};

// ============================================================
// الحصول على معلومات الملف
// ============================================================
const getFileInfo = async (fileId) => {
    try {
        const ObjectId = mongoose.Types.ObjectId;
        
        // ✅ التحقق من صحة المعرف
        if (!ObjectId.isValid(fileId)) {
            console.error('❌ معرف ملف غير صالح:', fileId);
            return null;
        }
        
        // ✅ التأكد من وجود الاتصال بقاعدة البيانات
        if (!mongoose.connection || !mongoose.connection.db) {
            console.error('❌ لا يوجد اتصال بقاعدة البيانات');
            return null;
        }
        
        // ✅ الحصول على bucket
        const bucket = initGridFS();
        if (!bucket) {
            console.error('❌ GridFS غير مهيأ');
            return null;
        }
        
        // ✅ البحث عن الملف
        const cursor = bucket.find({ _id: new ObjectId(fileId) });
        const files = await cursor.toArray();
        
        if (files.length === 0) {
            console.error('❌ الملف غير موجود:', fileId);
            return null;
        }
        
        console.log('✅ تم العثور على الملف في GridFS:', files[0].filename);
        return files[0];
        
    } catch (error) {
        console.error('❌ خطأ في جلب معلومات الملف:', error);
        return null;
    }
};

// ============================================================
// حذف ملف من GridFS
// ============================================================
const deleteFile = async (fileId) => {
    try {
        const ObjectId = mongoose.Types.ObjectId;
        
        // ✅ التحقق من صحة المعرف
        if (!ObjectId.isValid(fileId)) {
            return { success: false, error: 'معرف ملف غير صالح' };
        }
        
        // ✅ الحصول على bucket
        const bucket = initGridFS();
        if (!bucket) {
            return { success: false, error: 'GridFS غير مهيأ' };
        }
        
        // ✅ حذف الملف
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
        'bmp': 'image/bmp',
        'tiff': 'image/tiff',
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
// تصدير الدوال
// ============================================================
module.exports = {
    initGridFS,
    upload,
    uploadToGridFS,
    uploadMultipleToGridFS,
    getGridFSBucket,
    getFileInfo,
    deleteFile,
    getStreamUrl,
    getMimeType
};