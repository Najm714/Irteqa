// backend/middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'يرجى تسجيل الدخول أولاً'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'my_super_secret_key_123456');
        const user = await User.findById(decoded.id).select('-password');
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'المستخدم غير موجود'
            });
        }

        req.user = user;
        req.token = token;
        next();
    } catch (error) {
        console.error('❌ خطأ في المصادقة:', error);
        res.status(401).json({
            success: false,
            message: 'يرجى تسجيل الدخول أولاً'
        });
    }
};

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول إلى هذه البيانات'
            });
        }
        next();
    };
};

module.exports = { protect, authorize };