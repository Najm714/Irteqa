const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'غير مصرح لك، يرجى تسجيل الدخول'
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'my_super_secret_key_123456');
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
                message: 'الحساب غير نشط'
            });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('❌ خطأ في المصادقة:', error);
        return res.status(401).json({
            success: false,
            message: 'جلسة غير صالحة، يرجى تسجيل الدخول مرة أخرى'
        });
    }
};

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول إلى هذا المورد'
            });
        }
        next();
    };
};

module.exports = { protect, authorize };