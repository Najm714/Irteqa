// backend/routes/videoRoutes.js
const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadVideo');
const Video = require('../models/Video');
const fs = require('fs');
const path = require('path');

// ============================================================
// رفع فيديو جديد - ✅ نسخة مصححة
// ============================================================
router.post('/upload', upload.single('video'), async (req, res) => {
    try {
        console.log('📁 استلام فيديو:', req.file);
        console.log('📦 بيانات:', req.body);

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'يرجى اختيار فيديو'
            });
        }

        const { title, subjectId, subjectName, specialtyName, universityName, description } = req.body;

        if (!title || !subjectId || !subjectName) {
            return res.status(400).json({
                success: false,
                message: 'العنوان، معرف المادة، واسم المادة مطلوبون'
            });
        }

        // ✅ استخراج اسم الملف فقط
        const fileName = req.file.filename;
        
        // ✅ بناء المسار العام
        const publicPath = `/uploads/videos/${fileName}`;

        console.log('📁 اسم الملف:', fileName);
        console.log('📁 المسار العام:', publicPath);

        const video = new Video({
            title: title,
            subjectId: parseInt(subjectId),
            subjectName: subjectName,
            specialtyName: specialtyName || '',
            universityName: universityName || '',
            description: description || '',
            fileName: fileName,                          // ✅ fileName وليس filename
            filePath: publicPath,                        // ✅ المسار العام
            fileSize: (req.file.size / (1024 * 1024)).toFixed(2) + ' MB',
            fileType: req.file.mimetype,
            uploadDate: new Date(),
            views: 0
        });

        await video.save();

        console.log('✅ تم رفع الفيديو:', video.title);
        console.log('✅ المسار المخزن:', video.filePath);

        res.status(201).json({
            success: true,
            message: 'تم رفع الفيديو بنجاح',
            data: video
        });
    } catch (error) {
        console.error('❌ خطأ في رفع الفيديو:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================================
// جلب جميع الفيديوهات
// ============================================================
router.get('/all', async (req, res) => {
    try {
        const videos = await Video.find().sort({ uploadDate: -1 });
        res.json({
            success: true,
            count: videos.length,
            data: videos
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================
// جلب فيديوهات مادة معينة
// ============================================================
router.get('/subject/:subjectId', async (req, res) => {
    try {
        const videos = await Video.find({ subjectId: parseInt(req.params.subjectId) });
        res.json({
            success: true,
            count: videos.length,
            data: videos
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================
// جلب فيديو محدد
// ============================================================
router.get('/:id', async (req, res) => {
    try {
        const video = await Video.findById(req.params.id);
        if (!video) {
            return res.status(404).json({
                success: false,
                message: 'الفيديو غير موجود'
            });
        }
        res.json({ success: true, data: video });
    } catch (error) {
        // ✅ معالجة خطأ CastError
        if (error.name === 'CastError' || error.kind === 'ObjectId') {
            return res.status(400).json({
                success: false,
                message: 'معرف الفيديو غير صالح'
            });
        }
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================
// تحديث عدد المشاهدات
// ============================================================
router.put('/:id/views', async (req, res) => {
    try {
        const video = await Video.findByIdAndUpdate(
            req.params.id,
            { $inc: { views: 1 } },
            { new: true }
        );
        if (!video) {
            return res.status(404).json({
                success: false,
                message: 'الفيديو غير موجود'
            });
        }
        res.json({ success: true, data: video });
    } catch (error) {
        if (error.name === 'CastError' || error.kind === 'ObjectId') {
            return res.status(400).json({
                success: false,
                message: 'معرف الفيديو غير صالح'
            });
        }
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================
// حذف فيديو (للمدير فقط)
// ============================================================
router.delete('/:id', async (req, res) => {
    try {
        const video = await Video.findById(req.params.id);
        if (!video) {
            return res.status(404).json({
                success: false,
                message: 'الفيديو غير موجود'
            });
        }

        // حذف الملف من الخادم
        if (video.filePath) {
            // استخراج اسم الملف من المسار
            const fileName = video.filePath.split('/').pop();
            const filePath = path.join(__dirname, '../uploads/videos', fileName);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`🗑️ تم حذف الملف: ${filePath}`);
            }
        }

        await video.deleteOne();
        res.json({
            success: true,
            message: 'تم حذف الفيديو بنجاح'
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;