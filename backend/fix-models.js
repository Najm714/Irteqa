// backend/fix-models.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// تحميل متغيرات البيئة
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/draseh_platform';

console.log('🔗 محاولة الاتصال بقاعدة البيانات...');

// الاتصال بقاعدة البيانات
mongoose.connect(MONGO_URI)
    .then(() => {
        console.log('✅ تم الاتصال بقاعدة البيانات بنجاح');
        fixModels();
    })
    .catch(err => {
        console.error('❌ فشل الاتصال بقاعدة البيانات:', err.message);
        process.exit(1);
    });

// استيراد النماذج
const Video = require('./models/Video');
const Model = require('./models/Model');
const Order = require('./models/Order');
const User = require('./models/User');

async function fixModels() {
    try {
        console.log('\n🔍 جاري فحص النماذج...');
        
        // عرض إحصائيات
        const videoCount = await Video.countDocuments();
        const modelCount = await Model.countDocuments();
        const orderCount = await Order.countDocuments();
        const userCount = await User.countDocuments();
        
        console.log('\n📊 إحصائيات قاعدة البيانات:');
        console.log(`  📹 الفيديوهات: ${videoCount}`);
        console.log(`  📄 النماذج: ${modelCount}`);
        console.log(`  📋 الطلبات: ${orderCount}`);
        console.log(`  👤 المستخدمين: ${userCount}`);
        
        // إصلاح مسارات الفيديوهات
        console.log('\n🔧 جاري إصلاح مسارات الفيديوهات...');
        const videos = await Video.find({});
        let fixedCount = 0;
        
        for (const video of videos) {
            let needsUpdate = false;
            
            if (video.filePath && (
                video.filePath.includes('/opt/render/') ||
                video.filePath.includes('backend/uploads/') ||
                video.filePath.includes('\\')
            )) {
                const fileName = video.filePath.split('/').pop().split('\\').pop();
                if (fileName) {
                    video.filePath = `/uploads/videos/${fileName}`;
                    needsUpdate = true;
                    console.log(`  ✅ إصلاح مسار: ${video.title}`);
                }
            }
            
            if (!video.fileName && video.filePath) {
                const fileName = video.filePath.split('/').pop().split('\\').pop();
                if (fileName) {
                    video.fileName = fileName;
                    needsUpdate = true;
                    console.log(`  ✅ إضافة fileName: ${video.title}`);
                }
            }
            
            if (needsUpdate) {
                await video.save();
                fixedCount++;
            }
        }
        
        console.log(`\n✅ تم إصلاح ${fixedCount} فيديو`);
        
        console.log('\n✅ تم إكمال الإصلاح بنجاح!');
        process.exit(0);
        
    } catch (error) {
        console.error('❌ خطأ:', error);
        process.exit(1);
    }
}