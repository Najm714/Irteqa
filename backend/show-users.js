// backend/show-users.js
const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/draseh_platform';

async function showAllUsers() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ تم الاتصال بقاعدة البيانات\n');

        // جلب جميع المستخدمين
        const users = await User.find({}, { password: 0 }).sort({ role: 1, name: 1 });

        if (users.length === 0) {
            console.log('❌ لا يوجد مستخدمين');
            return;
        }

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`📊 عدد المستخدمين: ${users.length}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        // إحصائيات الأدوار
        const roles = {};
        users.forEach(u => {
            roles[u.role] = (roles[u.role] || 0) + 1;
        });

        console.log('📈 إحصائيات الأدوار:');
        Object.entries(roles).forEach(([role, count]) => {
            const emoji = role === 'admin' ? '🛠️' : 
                         role === 'expert' ? '📋' : 
                         role === 'client' ? '📚' : '👤';
            console.log(`  ${emoji} ${role}: ${count} مستخدم`);
        });

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('👤 قائمة المستخدمين:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        // عرض المستخدمين
        users.forEach((user, index) => {
            const status = user.isActive ? '✅ نشط' : '❌ غير نشط';
            const roleEmoji = user.role === 'admin' ? '🛠️' : 
                             user.role === 'expert' ? '📋' : 
                             user.role === 'client' ? '📚' : '👤';
            
            console.log(`${index + 1}. ${roleEmoji} ${user.name}`);
            console.log(`   📧 ${user.email}`);
            console.log(`   🎯 الدور: ${user.role}`);
            console.log(`   📊 الحالة: ${status}`);
            console.log(`   📅 تاريخ التسجيل: ${user.createdAt.toLocaleDateString()}`);
            console.log('   ──────────────────────────────');
        });

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    } catch (error) {
        console.error('❌ خطأ:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

showAllUsers();