// backend/fix-video-files.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/draseh_platform';

mongoose.connect(MONGO_URI)
    .then(() => {
        console.log('✅ تم الاتصال بقاعدة البيانات');
        fixVideoFiles();
    })
    .catch(err => {
        console.error('❌ خطأ:', err);
        process.exit(1);
    });

const Video = require('./models/Video');

async function fixVideoFiles() {
    try {
        // عرض الملفات الموجودة في المجلد
        const videosDir = path.join(__dirname, 'uploads/videos');
        console.log(`📁 مجلد الفيديوهات: ${videosDir}`);
        
        if (!fs.existsSync(videosDir)) {
            console.log('❌ مجلد الفيديوهات غير موجود');
            process.exit(1);
        }
        
        const files = fs.readdirSync(videosDir);
        console.log(`📹 الملفات الموجودة: ${files.join(', ')}`);
        
        // جلب جميع الفيديوهات من قاعدة البيانات
        const videos = await Video.find({});
        console.log(`📹 عدد الفيديوهات في قاعدة البيانات: ${videos.length}`);
        
        for (const video of videos) {
            console.log(`\n📹 فيديو: ${video.title}`);
            console.log(`   📁 fileName في قاعدة البيانات: ${video.fileName}`);
            
            // البحث عن ملف مطابق
            let foundFile = null;
            for (const file of files) {
                // البحث باسم الملف
                if (file === video.fileName) {
                    foundFile = file;
                    break;
                }
                // البحث باسم مشابه
                if (video.fileName && file.includes(video.fileName.replace('.mp4', ''))) {
                    foundFile = file;
                    break;
                }
            }
            
            if (foundFile) {
                console.log(`   ✅ تم العثور على الملف: ${foundFile}`);
                // تحديث المسار إذا كان مختلفاً
                if (video.fileName !== foundFile) {
                    video.fileName = foundFile;
                    video.filePath = `/uploads/videos/${foundFile}`;
                    await video.save();
                    console.log(`   ✅ تم تحديث المسار إلى: ${video.filePath}`);
                }
            } else {
                console.log(`   ❌ لم يتم العثور على ملف: ${video.fileName}`);
                console.log(`   💡 ضع الملف في: ${videosDir}`);
            }
        }
        
        console.log('\n✅ تم الانتهاء من الفحص');
        process.exit(0);
    } catch (error) {
        console.error('❌ خطأ:', error);
        process.exit(1);
    }
}
