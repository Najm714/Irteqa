// backend/fix-all-users.js
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

async function fixAllUsers() {
    try {
        // جلب جميع المستخدمين
        const users = await User.find({});
        console.log(`📦 تم العثور على ${users.length} مستخدم`);

        let fixedCount = 0;

        for (const user of users) {
            // إذا كانت كلمة المرور غير موجودة أو undefined
            if (!user.password || user.password === 'undefined' || user.password === '') {
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash('Admin@123456', salt);
                user.password = hashedPassword;
                await user.save();
                fixedCount++;
                console.log(`✅ تم تحديث كلمة مرور المستخدم: ${user.email}`);
            }
        }

        console.log(`🎉 تم تحديث ${fixedCount} مستخدم بنجاح`);
        console.log('📧 جميع المستخدمين يمكنهم استخدام: Admin@123456');
        process.exit(0);
    } catch (error) {
        console.error('❌ خطأ:', error);
        process.exit(1);
    }
}

fixAllUsers();