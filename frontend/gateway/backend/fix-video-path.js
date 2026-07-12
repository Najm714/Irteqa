// backend/fix-video-path.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/draseh_platform';

mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ تم الاتصال بقاعدة البيانات'))
    .catch(err => console.error('❌ خطأ:', err));

const Video = require('./models/Video');

async function fixVideo() {
    try {
        // ابحث عن الفيديو المحدد
        const video = await Video.findById('6a482b7d85281c1b25b7ef35');
        
        if (video) {
            console.log('📹 الفيديو الحالي:', video.title);
            console.log('📁 المسار الحالي:', video.filePath);
            console.log('📁 fileName:', video.fileName);
            
            // ✅ تأكد من أن المسار صحيح
            if (video.fileName) {
                video.filePath = `/uploads/videos/${video.fileName}`;
                await video.save();
                console.log('✅ تم تحديث المسار إلى:', video.filePath);
            } else {
                console.log('❌ لا يوجد fileName لهذا الفيديو');
            }
        } else {
            console.log('❌ الفيديو غير موجود');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ خطأ:', error);
        process.exit(1);
    }
}

fixVideo();