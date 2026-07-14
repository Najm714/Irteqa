// backend/add-admin.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/draseh_platform';

async function addAdmin() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ تم الاتصال بقاعدة البيانات');

        const adminData = {
            name: 'شهاب القاضي',
            email: 'shhabalqady569@gmail.com',
            password: '775230669',
            role: 'admin',
            isActive: true
        };

        // التحقق من وجود البريد
        const existing = await User.findOne({ email: adminData.email });
        if (existing) {
            console.log('⚠️ هذا البريد موجود بالفعل:', adminData.email);
            process.exit(0);
        }

        // تشفير كلمة المرور
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(adminData.password, salt);

        // إنشاء المدير
        const admin = new User({
            name: adminData.name,
            email: adminData.email,
            password: hashedPassword,
            role: adminData.role,
            isActive: adminData.isActive
        });

        await admin.save();
        console.log('✅ تم إضافة المدير بنجاح!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📧 البريد الإلكتروني:', adminData.email);
        console.log('🔑 كلمة المرور:', adminData.password);
        console.log('👤 الاسم:', adminData.name);
        console.log('🎯 الدور:', adminData.role);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ يمكنك الآن تسجيل الدخول');

    } catch (error) {
        console.error('❌ خطأ:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

addAdmin();