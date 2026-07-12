// ============================================================
// controllers/authController.js
// ============================================================
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

// ============================================================
// دالة توليد التوكن
// ============================================================
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE
    });
};

// ============================================================
// 1. تسجيل مستخدم جديد (للمدير فقط)
// ============================================================
exports.register = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false, 
                errors: errors.array() 
            });
        }

        const { 
            name, 
            email, 
            password, 
            phone, 
            university, 
            role, 
            expertise, 
            bio 
        } = req.body;

        // التحقق من وجود المستخدم
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                message: 'البريد الإلكتروني مستخدم بالفعل' 
            });
        }

        // ============================================================
        // تحديد دور المستخدم (المدير فقط يمكنه إنشاء خبراء)
        // ============================================================
        let userRole = 'client';
        
        // ✅ req.user موجود لأن المسار محمي بـ protect و authorize('admin')
        if (req.user && req.user.role === 'admin') {
            // المدير يمكنه إنشاء أي دور
            if (role === 'admin') {
                userRole = 'admin';
            } else if (role === 'expert') {
                userRole = 'expert';
            } else {
                userRole = 'client';
            }
        } else {
            // هذا لن يحدث لأن المسار محمي
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية لإنشاء حساب بهذا الدور'
            });
        }

        // ============================================================
        // بناء بيانات المستخدم
        // ============================================================
        const userData = {
            name,
            email,
            password,
            phone: phone || '',
            university: university || '',
            role: userRole
        };

        // إذا كان خبيراً، أضف الحقول الإضافية
        if (userRole === 'expert') {
            userData.expertise = expertise || [];
            userData.bio = bio || '';
        }

        // إنشاء المستخدم
        const user = await User.create(userData);

        // ============================================================
        // إرجاع الرد (بدون توكن لأن المدير هو الذي يسجل)
        // ============================================================
        return res.status(201).json({
            success: true,
            message: `تم إنشاء حساب ${userRole === 'expert' ? 'الخبير' : 'المستخدم'} بنجاح`,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                expertise: user.expertise || [],
                bio: user.bio || ''
            }
        });

    } catch (error) {
        console.error('❌ خطأ في التسجيل:', error);
        res.status(500).json({ 
            success: false, 
            message: 'حدث خطأ في الخادم' 
        });
    }
};

// ============================================================
// 2. تسجيل الدخول
// ============================================================
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'يرجى إدخال البريد الإلكتروني وكلمة المرور' 
            });
        }

        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: 'بيانات الدخول غير صحيحة' 
            });
        }

        // التحقق من أن المستخدم نشط (للمديرين والخبراء)
        if ((user.role === 'admin' || user.role === 'expert') && user.isActive === false) {
            return res.status(403).json({
                success: false,
                message: 'هذا الحساب معطل، يرجى التواصل مع الإدارة'
            });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ 
                success: false, 
                message: 'بيانات الدخول غير صحيحة' 
            });
        }

        const token = generateToken(user._id);

        const userResponse = {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            phone: user.phone || '',
            university: user.university || '',
            isActive: user.isActive !== undefined ? user.isActive : true
        };

        if (user.role === 'expert') {
            userResponse.expertise = user.expertise || [];
            userResponse.bio = user.bio || '';
            userResponse.rating = user.rating || 0;
            userResponse.totalOrders = user.totalOrders || 0;
        }

        res.status(200).json({
            success: true,
            token,
            user: userResponse
        });

    } catch (error) {
        console.error('❌ خطأ في تسجيل الدخول:', error);
        res.status(500).json({ 
            success: false, 
            message: 'حدث خطأ في الخادم' 
        });
    }
};

// ============================================================
// 3. الحصول على بيانات المستخدم الحالي
// ============================================================
exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'المستخدم غير موجود'
            });
        }

        const userResponse = {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            phone: user.phone || '',
            university: user.university || '',
            isActive: user.isActive !== undefined ? user.isActive : true,
            createdAt: user.createdAt
        };

        if (user.role === 'expert') {
            userResponse.expertise = user.expertise || [];
            userResponse.bio = user.bio || '';
            userResponse.rating = user.rating || 0;
            userResponse.totalOrders = user.totalOrders || 0;
        }

        res.status(200).json({
            success: true,
            user: userResponse
        });

    } catch (error) {
        console.error('❌ خطأ في جلب بيانات المستخدم:', error);
        res.status(500).json({ 
            success: false, 
            message: 'حدث خطأ في الخادم' 
        });
    }
};

// ============================================================
// 4. تحديث مستخدم (للمدير فقط)
// ============================================================
exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { isActive, expertise, bio, phone, university } = req.body;

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'المستخدم غير موجود'
            });
        }

        const updateData = {};
        if (isActive !== undefined) updateData.isActive = isActive;
        if (expertise !== undefined) updateData.expertise = expertise;
        if (bio !== undefined) updateData.bio = bio;
        if (phone !== undefined) updateData.phone = phone;
        if (university !== undefined) updateData.university = university;

        const updatedUser = await User.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        ).select('-password');

        res.status(200).json({
            success: true,
            message: 'تم تحديث بيانات المستخدم بنجاح',
            user: updatedUser
        });

    } catch (error) {
        console.error('❌ خطأ في تحديث المستخدم:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ============================================================
// 5. حذف مستخدم (للمدير فقط)
// ============================================================
exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        if (id === req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'لا يمكنك حذف حسابك الخاص'
            });
        }

        const user = await User.findByIdAndDelete(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'المستخدم غير موجود'
            });
        }

        res.status(200).json({
            success: true,
            message: 'تم حذف المستخدم بنجاح'
        });

    } catch (error) {
        console.error('❌ خطأ في حذف المستخدم:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};