// backend/fix-videos.js
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
        fixVideos();
    })
    .catch(err => {
        console.error('❌ فشل الاتصال بقاعدة البيانات:', err.message);
        process.exit(1);
    });

// استيراد نموذج Video
const Video = require('./models/Video');

async function fixVideos() {
    try {
        console.log('\n🔍 جاري البحث عن الفيديوهات...');
        
        const videos = await Video.find({});
        console.log(`📹 تم العثور على ${videos.length} فيديو`);
        
        let count = 0;

        for (const video of videos) {
            let needsUpdate = false;
            
            // إصلاح المسار
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
            
            // إضافة fileName إذا كان مفقوداً
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
                count++;
            }
        }

        console.log(`\n✅ تم تحديث ${count} فيديو بنجاح!`);
        
        // عرض النتائج
        const updatedVideos = await Video.find({});
        console.log('\n📋 الفيديوهات بعد التحديث:');
        updatedVideos.forEach(v => {
            console.log(`  📹 ${v.title}`);
            console.log(`     📁 fileName: ${v.fileName}`);
            console.log(`     📁 filePath: ${v.filePath}`);
        });
        
        console.log('\n✅ تم إكمال الإصلاح بنجاح!');
        process.exit(0);
        
    } catch (error) {
        console.error('❌ خطأ:', error);
        process.exit(1);
    }
}