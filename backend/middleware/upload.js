const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ============================================================
// تحديد المسار المطلق لمجلد uploads
// ============================================================
const uploadDir = path.join(__dirname, '..', 'uploads');

// ============================================================
// إنشاء المجلد إذا لم يكن موجوداً
// ============================================================
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log('✅ تم إنشاء مجلد uploads في:', uploadDir);
}

// ============================================================
// إعداد تخزين الملفات
// ============================================================
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, uniqueSuffix + ext);
    }
});

// ============================================================
// أنواع الملفات المسموحة
// ============================================================
const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/zip',
        'application/x-rar-compressed'
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('نوع الملف غير مدعوم'), false);
    }
};

// ============================================================
// إعداد Multer
// ============================================================
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50 ميجابايت
    },
    fileFilter: fileFilter
});

module.exports = upload;