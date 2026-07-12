// backend/list-videos.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/draseh_platform';

mongoose.connect(MONGO_URI)
    .then(() => {
        console.log('✅ تم الاتصال بقاعدة البيانات');
        listVideos();
    })
    .catch(err => {
        console.error('❌ خطأ:', err);
        process.exit(1);
    });

const Video = require('./models/Video');

async function listVideos() {
    try {
        const videos = await Video.find({});
        
        console.log(`\n📹 عدد الفيديوهات: ${videos.length}`);
        console.log('='.repeat(50));
        
        if (videos.length === 0) {
            console.log('❌ لا توجد فيديوهات في قاعدة البيانات');
            console.log('\n💡 نصيحة: ارفع فيديو من خلال admin-videos.html');
        } else {
            videos.forEach((video, index) => {
                console.log(`\n📹 فيديو ${index + 1}:`);
                console.log(`   🆔 ID: ${video._id}`);
                console.log(`   📝 العنوان: ${video.title}`);
                console.log(`   📁 fileName: ${video.fileName}`);
                console.log(`   📁 filePath: ${video.filePath}`);
                console.log(`   🏫 الجامعة: ${video.universityName}`);
                console.log(`   📚 المادة: ${video.subjectName}`);
                console.log(`   👁️ المشاهدات: ${video.views}`);
            });
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ خطأ:', error);
        process.exit(1);
    }
}