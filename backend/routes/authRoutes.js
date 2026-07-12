// backend/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ============================================================
// تسجيل الدخول
// ============================================================
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        console.log('📧 محاولة تسجيل الدخول:', email);

        // ✅ التحقق من وجود البريد وكلمة المرور
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'البريد الإلكتروني وكلمة المرور مطلوبان'
            });
        }

        // ✅ البحث عن المستخدم
        const user = await User.findOne({ email });
        if (!user) {
            console.log('❌ المستخدم غير موجود:', email);
            return res.status(401).json({
                success: false,
                message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
            });
        }

        // ✅ التحقق من وجود كلمة المرور
        if (!user.password) {
            console.log('❌ كلمة المرور غير موجودة للمستخدم:', email);
            return res.status(500).json({
                success: false,
                message: 'خطأ في بيانات المستخدم، يرجى التواصل مع الدعم'
            });
        }

        // ✅ مقارنة كلمة المرور
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.log('❌ كلمة المرور غير صحيحة للمستخدم:', email);
            return res.status(401).json({
                success: false,
                message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
            });
        }

        // ✅ إنشاء التوكن
        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET || 'my_super_secret_key_123456',
            { expiresIn: '30d' }
        );

        console.log('✅ تم تسجيل الدخول بنجاح:', email);

        res.status(200).json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                isActive: user.isActive
            }
        });
    } catch (error) {
        console.error('❌ خطأ في تسجيل الدخول:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ في الخادم الداخلي'
        });
    }
});

// ============================================================
// تسجيل مستخدم جديد
// ============================================================
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        console.log('📝 محاولة تسجيل مستخدم جديد:', email);

        // ✅ التحقق من وجود المستخدم
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'البريد الإلكتروني مسجل بالفعل'
            });
        }

        // ✅ تشفير كلمة المرور
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // ✅ إنشاء المستخدم
        const user = new User({
            name,
            email,
            password: hashedPassword,
            role: role || 'user',
            isActive: true
        });

        await user.save();

        console.log('✅ تم إنشاء المستخدم بنجاح:', email);

        res.status(201).json({
            success: true,
            message: 'تم إنشاء الحساب بنجاح',
            data: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('❌ خطأ في التسجيل:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ في الخادم الداخلي'
        });
    }
});

module.exports = router;