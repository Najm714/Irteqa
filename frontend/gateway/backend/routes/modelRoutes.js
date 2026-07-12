// backend/routes/modelRoutes.js
const express = require('express');
const router = express.Router();
const Model = require('../models/Model');
const { protect, authorize } = require('../middleware/auth');

// ============================================================
// جلب جميع النماذج
// ============================================================
router.get('/', async (req, res) => {
    try {
        const models = await Model.find()
            .populate('uploadedBy', 'name email')
            .sort({ createdAt: -1 });
        res.status(200).json({ 
            success: true, 
            count: models.length, 
            data: models 
        });
    } catch (error) {
        console.error('❌ خطأ في جلب النماذج:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
});

// ============================================================
// جلب نموذج محدد
// ============================================================
router.get('/:id', async (req, res) => {
    try {
        const model = await Model.findById(req.params.id);
        if (!model) {
            return res.status(404).json({ 
                success: false, 
                message: 'النموذج غير موجود' 
            });
        }
        res.status(200).json({ 
            success: true, 
            data: model 
        });
    } catch (error) {
        console.error('❌ خطأ في جلب النموذج:', error);
        if (error.name === 'CastError' || error.kind === 'ObjectId') {
            return res.status(404).json({
                success: false,
                message: 'النموذج غير موجود'
            });
        }
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
});

// ============================================================
// جلب النماذج حسب الخدمة الرئيسية
// ============================================================
router.get('/service/:mainService', async (req, res) => {
    try {
        const mainService = req.params.mainService;
        const models = await Model.find({ mainService: mainService })
            .populate('uploadedBy', 'name email')
            .sort({ createdAt: -1 });
        
        res.status(200).json({
            success: true,
            count: models.length,
            data: models
        });
    } catch (error) {
        console.error('❌ خطأ في جلب النماذج حسب الخدمة:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================================
// جلب النماذج حسب الخدمة الفرعية
// ============================================================
router.get('/subservice/:subService', async (req, res) => {
    try {
        const subService = req.params.subService;
        const models = await Model.find({ subService: subService })
            .populate('uploadedBy', 'name email')
            .sort({ createdAt: -1 });
        
        res.status(200).json({
            success: true,
            count: models.length,
            data: models
        });
    } catch (error) {
        console.error('❌ خطأ في جلب النماذج حسب الخدمة الفرعية:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================================
// جلب النماذج حسب التصنيف
// ============================================================
router.get('/category/:category', async (req, res) => {
    try {
        const category = req.params.category;
        const models = await Model.find({ category: category })
            .populate('uploadedBy', 'name email')
            .sort({ createdAt: -1 });
        
        res.status(200).json({
            success: true,
            count: models.length,
            data: models
        });
    } catch (error) {
        console.error('❌ خطأ في جلب النماذج حسب التصنيف:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================================
// رفع نموذج جديد - ✅ معدل لدعم الخدمات الجديدة
// ============================================================
router.post('/', protect, authorize('admin'), async (req, res) => {
    try {
        const { 
            title, 
            category, 
            description, 
            fileName, 
            fileSize, 
            fileType, 
            fileData, 
            mainService, 
            subService 
        } = req.body;

        // التحقق من الحقول المطلوبة
        const missingFields = [];
        if (!title) missingFields.push('title (العنوان)');
        if (!category) missingFields.push('category (التصنيف)');
        if (!fileName) missingFields.push('fileName (اسم الملف)');
        if (!fileData) missingFields.push('fileData (بيانات الملف)');
        if (!mainService) missingFields.push('mainService (الخدمة الرئيسية)');

        if (missingFields.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: `البيانات المطلوبة ناقصة: ${missingFields.join(', ')}`
            });
        }

        console.log('📦 رفع نموذج جديد:');
        console.log('  - العنوان:', title);
        console.log('  - الخدمة الرئيسية:', mainService);
        console.log('  - الخدمة الفرعية:', subService || 'غير محددة');
        console.log('  - التصنيف:', category);
        console.log('  - اسم الملف:', fileName);
        console.log('  - حجم الملف:', fileSize || 'غير معروف');

        // إنشاء النموذج الجديد
        const model = new Model({
            title,
            category,
            description: description || '',
            fileName,
            fileSize: fileSize || '0 KB',
            fileType: fileType || 'application/octet-stream',
            fileData,
            mainService: mainService,
            subService: subService || 'خدمة فرعية',
            uploadedBy: req.user.id
        });

        await model.save();

        console.log('✅ تم رفع النموذج بنجاح:', model.title);

        res.status(201).json({ 
            success: true, 
            message: 'تم رفع النموذج بنجاح', 
            data: model 
        });
    } catch (error) {
        console.error('❌ خطأ في رفع النموذج:', error);
        
        // معالجة أخطاء التحقق من النموذج
        if (error.name === 'ValidationError') {
            const errors = Object.keys(error.errors).reduce((acc, key) => {
                acc[key] = error.errors[key].message;
                return acc;
            }, {});
            
            return res.status(400).json({
                success: false,
                message: 'فشل التحقق من البيانات',
                errors: errors
            });
        }
        
        res.status(500).json({ 
            success: false, 
            message: error.message,
            details: error.errors || {}
        });
    }
});

// ============================================================
// تحديث نموذج
// ============================================================
router.put('/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const { title, category, description, mainService, subService } = req.body;
        
        const model = await Model.findById(req.params.id);
        if (!model) {
            return res.status(404).json({ 
                success: false, 
                message: 'النموذج غير موجود' 
            });
        }

        // تحديث الحقول
        if (title) model.title = title;
        if (category) model.category = category;
        if (description !== undefined) model.description = description;
        if (mainService) model.mainService = mainService;
        if (subService !== undefined) model.subService = subService;

        await model.save();

        console.log('✅ تم تحديث النموذج:', model.title);

        res.status(200).json({
            success: true,
            message: 'تم تحديث النموذج بنجاح',
            data: model
        });
    } catch (error) {
        console.error('❌ خطأ في تحديث النموذج:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================================
// حذف نموذج
// ============================================================
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const model = await Model.findById(req.params.id);
        if (!model) {
            return res.status(404).json({ 
                success: false, 
                message: 'النموذج غير موجود' 
            });
        }
        
        await model.deleteOne();
        
        console.log('🗑️ تم حذف النموذج:', model.title);
        
        res.status(200).json({ 
            success: true, 
            message: 'تم حذف النموذج بنجاح' 
        });
    } catch (error) {
        console.error('❌ خطأ في حذف النموذج:', error);
        if (error.name === 'CastError' || error.kind === 'ObjectId') {
            return res.status(404).json({
                success: false,
                message: 'النموذج غير موجود'
            });
        }
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
});

// ============================================================
// جلب النماذج التي رفعها مستخدم معين
// ============================================================
router.get('/user/:userId', protect, async (req, res) => {
    try {
        const userId = req.params.userId;
        const models = await Model.find({ uploadedBy: userId })
            .populate('uploadedBy', 'name email')
            .sort({ createdAt: -1 });
        
        res.status(200).json({
            success: true,
            count: models.length,
            data: models
        });
    } catch (error) {
        console.error('❌ خطأ في جلب نماذج المستخدم:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================================
// البحث عن النماذج
// ============================================================
router.get('/search/:query', async (req, res) => {
    try {
        const query = req.params.query;
        const models = await Model.find({
            $or: [
                { title: { $regex: query, $options: 'i' } },
                { description: { $regex: query, $options: 'i' } },
                { mainService: { $regex: query, $options: 'i' } },
                { subService: { $regex: query, $options: 'i' } }
            ]
        }).populate('uploadedBy', 'name email').sort({ createdAt: -1 });
        
        res.status(200).json({
            success: true,
            count: models.length,
            data: models
        });
    } catch (error) {
        console.error('❌ خطأ في البحث عن النماذج:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;