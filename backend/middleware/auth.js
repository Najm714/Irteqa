// backend/middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ============================================================
// الحصول على مفتاح JWT السري من البيئة أو استخدام قيمة افتراضية
// ============================================================
const getJWTSecret = () => {
    // استخدام المفتاح من متغيرات البيئة أو المفتاح الافتراضي
    return process.env.JWT_SECRET || 'my_super_secret_key_123456';
};

// ============================================================
// التحقق من المصادقة (Protect Middleware)
// ============================================================
const protect = async (req, res, next) => {
    let token;

    // التحقق من وجود التوكن في رأس الطلب
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    // إذا لم يكن هناك توكن
    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'غير مصرح لك، يرجى تسجيل الدخول'
        });
    }

    try {
        // ✅ استخدام مفتاح ثابت للتحقق
        const JWT_SECRET = getJWTSecret();
        
        // التحقق من صحة التوكن
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // جلب المستخدم من قاعدة البيانات
        const user = await User.findById(decoded.id).select('-password');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'المستخدم غير موجود'
            });
        }

        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'الحساب غير نشط، يرجى التواصل مع الإدارة'
            });
        }

        // إضافة المستخدم إلى الطلب
        req.user = user;
        next();
    } catch (error) {
        console.error('❌ خطأ في المصادقة:', error);
        
        // رسائل خطأ محددة
        let message = 'جلسة غير صالحة، يرجى تسجيل الدخول مرة أخرى';
        
        if (error.name === 'JsonWebTokenError') {
            if (error.message === 'invalid signature') {
                message = 'التوقيع غير صالح، يرجى تسجيل الدخول مرة أخرى';
            } else if (error.message === 'jwt malformed') {
                message = 'التوكن غير صحيح، يرجى تسجيل الدخول مرة أخرى';
            } else {
                message = 'توكن غير صالح: ' + error.message;
            }
        } else if (error.name === 'TokenExpiredError') {
            message = 'انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى';
        }
        
        return res.status(401).json({
            success: false,
            message: message,
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// ============================================================
// التحقق من الصلاحيات (Authorize Middleware)
// ============================================================
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'غير مصرح لك، يرجى تسجيل الدخول'
            });
        }
        
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `ليس لديك صلاحية للوصول إلى هذا المورد. الصلاحيات المطلوبة: ${roles.join(', ')}`
            });
        }
        next();
    };
};

// ============================================================
// دالة إنشاء توكن JWT (للاستخدام في auth routes)
// ============================================================
const generateToken = (user) => {
    const JWT_SECRET = getJWTSecret();
    return jwt.sign(
        { id: user._id, role: user.role },
        JWT_SECRET,
        { expiresIn: '30d' }
    );
};

// ============================================================
// دالة التحقق من التوكن (للاستخدام في WebSocket)
// ============================================================
const verifyToken = (token) => {
    try {
        const JWT_SECRET = getJWTSecret();
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        console.error('❌ خطأ في التحقق من التوكن:', error);
        return null;
    }
};

module.exports = { 
    protect, 
    authorize, 
    generateToken,
    verifyToken,
    getJWTSecret
};