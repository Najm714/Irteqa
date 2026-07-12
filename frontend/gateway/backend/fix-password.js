// backend/fix-password.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'MONGO_URI=mongodb://localhost:27017/draseh_platform';

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

async function fixPassword() {
    try {
        // البحث عن المستخدم
        const user = await User.findOne({ email: 'admin@drasah.com' });
        
        if (!user) {
            console.log('❌ المستخدم غير موجود');
            process.exit(0);
        }

        // تشفير كلمة المرور الجديدة
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('Admin@123456', salt);

        // تحديث كلمة المرور
        user.password = hashedPassword;
        await user.save();

        console.log('✅ تم تحديث كلمة المرور بنجاح!');
        console.log('📧 البريد: admin@drasah.com');
        console.log('🔑 كلمة المرور: Admin@123456');
        process.exit(0);
    } catch (error) {
        console.error('❌ خطأ:', error);
        process.exit(1);
    }
}

fixPassword();