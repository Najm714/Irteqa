// controllers/videoController.js
const Video = require('../models/Video');
const path = require('path');
const fs = require('fs');

// ============================================================
// الحصول على فيديو بواسطة ID
// ============================================================
exports.getVideoById = async (req, res) => {
    try {
        console.log('🔍 جلب الفيديو ID:', req.params.id);
        
        const video = await Video.findById(req.params.id);
        
        if (!video) {
            console.log('❌ الفيديو غير موجود');
            return res.status(404).json({ 
                success: false, 
                message: 'الفيديو غير موجود' 
            });
        }
        
        console.log('✅ تم جلب الفيديو:', video.title);
        
        res.json({
            success: true,
            data: video
        });
    } catch (error) {
        console.error('❌ خطأ في جلب الفيديو:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};

// ============================================================
// جلب فيديوهات المادة
// ============================================================
exports.getVideosBySubject = async (req, res) => {
    try {
        console.log('🔍 جلب فيديوهات المادة:', req.params.subjectId);
        
        const videos = await Video.find({ subjectId: req.params.subjectId });
        
        res.json({
            success: true,
            count: videos.length,
            data: videos
        });
    } catch (error) {
        console.error('❌ خطأ في جلب فيديوهات المادة:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};

// ============================================================
// جلب جميع الفيديوهات
// ============================================================
exports.getAllVideos = async (req, res) => {
    try {
        console.log('🔍 جلب جميع الفيديوهات');
        
        const videos = await Video.find().sort({ uploadDate: -1 });
        
        console.log(`✅ تم جلب ${videos.length} فيديو`);
        
        res.json({
            success: true,
            count: videos.length,
            data: videos
        });
    } catch (error) {
        console.error('❌ خطأ في جلب جميع الفيديوهات:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};

// ============================================================
// رفع فيديو جديد
// ============================================================
exports.uploadVideo = async (req, res) => {
    try {
        console.log('📁 استلام فيديو:', req.file);
        console.log('📦 بيانات:', req.body);

        if (!req.file) {
            return res.status(400).json({ 
                success: false, 
                message: 'يرجى اختيار فيديو' 
            });
        }

        // ✅ التحقق من أن subjectId موجود
        if (!req.body.subjectId) {
            return res.status(400).json({ 
                success: false, 
                message: 'معرف المادة مطلوب' 
            });
        }

        const video = new Video({
            title: req.body.title || 'فيديو بدون عنوان',
            subjectId: req.body.subjectId,
            subjectName: req.body.subjectName || '',
            specialtyName: req.body.specialtyName || '',
            universityName: req.body.universityName || '',
            description: req.body.description || '',
            filename: req.file.filename,
            filePath: req.file.path,
            fileSize: (req.file.size / (1024 * 1024)).toFixed(2) + ' MB',
            fileType: req.file.mimetype,
            uploadDate: new Date(),
            views: 0
        });

        await video.save();

        console.log('✅ تم رفع الفيديو:', video.title);

        res.status(201).json({
            success: true,
            message: 'تم رفع الفيديو بنجاح',
            data: video
        });
    } catch (error) {
        console.error('❌ خطأ في رفع الفيديو:', error);
        if (req.file) {
            fs.unlink(req.file.path, (err) => {
                if (err) console.error('❌ خطأ في حذف الملف:', err);
            });
        }
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};

// ============================================================
// حذف فيديو
// ============================================================
exports.deleteVideo = async (req, res) => {
    try {
        console.log('🗑️ حذف فيديو ID:', req.params.id);
        
        const video = await Video.findById(req.params.id);
        
        if (!video) {
            return res.status(404).json({ 
                success: false, 
                message: 'الفيديو غير موجود' 
            });
        }

        // حذف الملف الفعلي
        if (video.filePath && fs.existsSync(video.filePath)) {
            fs.unlink(video.filePath, (err) => {
                if (err) console.error('❌ خطأ في حذف الملف:', err);
            });
        }

        await Video.findByIdAndDelete(req.params.id);

        console.log('✅ تم حذف الفيديو');

        res.json({
            success: true,
            message: 'تم حذف الفيديو بنجاح'
        });
    } catch (error) {
        console.error('❌ خطأ في حذف الفيديو:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};

// ============================================================
// تحديث عدد المشاهدات
// ============================================================
exports.incrementViews = async (req, res) => {
    try {
        console.log('👁️ تحديث مشاهدات الفيديو:', req.params.id);
        
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

        console.log('✅ تم تحديث المشاهدات');

        res.json({
            success: true,
            data: video
        });
    } catch (error) {
        console.error('❌ خطأ في تحديث المشاهدات:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};