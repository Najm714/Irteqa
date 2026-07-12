// backend/create-admin.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/draseh_platform';

mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ تم الاتصال بقاعدة البيانات'))
    .catch(err => console.error('❌ فشل الاتصال:', err));

const UserSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    role: String,
    isActive: Boolean
}, { collection: 'users' });

const User = mongoose.model('User', UserSchema);

async function createAdmin() {
    try {
        // حذف المستخدم القديم إن وجد
        await User.deleteOne({ email: 'admin@drasah.com' });
        console.log('🗑️ تم حذف المستخدم القديم');

        // تشفير كلمة المرور
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('Admin@123456', salt);

        // إنشاء مستخدم جديد
        const admin = new User({
            name: 'مدير النظام',
            email: 'admin@drasah.com',
            password: hashedPassword,
            role: 'admin',
            isActive: true
        });

        await admin.save();

        console.log('✅ تم إنشاء المدير بنجاح!');
        console.log('📧 البريد: admin@drasah.com');
        console.log('🔑 كلمة المرور: Admin@123456');
        process.exit(0);
    } catch (error) {
        console.error('❌ خطأ:', error);
        process.exit(1);
    }
}

createAdmin();