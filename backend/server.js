// backend/server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const WebSocket = require('ws');
const http = require('http');

// تحميل متغيرات البيئة
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ============================================================
// Middleware
// ============================================================
app.use(cors());
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ extended: true, limit: '500mb' }));

// ============================================================
// خدمة الملفات الثابتة (Frontend)
// ============================================================
app.use(express.static(path.join(__dirname, '../frontend')));

// ============================================================
// إنشاء مجلدات uploads
// ============================================================
const uploadsDir = path.join(__dirname, 'uploads');
const videosDir = path.join(uploadsDir, 'videos');
const ordersDir = path.join(uploadsDir, 'orders');
const summariesDir = path.join(uploadsDir, 'summaries');
const businessOrdersDir = path.join(uploadsDir, 'business-orders');
const chatFilesDir = path.join(uploadsDir, 'chat-files');
const tempDir = path.join(uploadsDir, 'temp');

const dirs = [
    { path: uploadsDir, name: 'uploads' },
    { path: videosDir, name: 'videos' },
    { path: ordersDir, name: 'orders' },
    { path: summariesDir, name: 'summaries' },
    { path: businessOrdersDir, name: 'business-orders' },
    { path: chatFilesDir, name: 'chat-files' },
    { path: tempDir, name: 'temp' }
];

dirs.forEach(dir => {
    if (!fs.existsSync(dir.path)) {
        fs.mkdirSync(dir.path, { recursive: true });
        console.log(`📁 تم إنشاء مجلد ${dir.name}`);
    }
});

try {
    fs.accessSync(chatFilesDir, fs.constants.W_OK);
    console.log('✅ مجلد chat-files قابل للكتابة');
} catch (err) {
    console.error('❌ مجلد chat-files غير قابل للكتابة:', err);
}

// ============================================================
// خدمة الملفات الثابتة (Uploads)
// ============================================================
app.use('/uploads', express.static(uploadsDir));
app.use('/uploads/videos', express.static(videosDir));
app.use('/uploads/orders', express.static(ordersDir));
app.use('/uploads/summaries', express.static(summariesDir));
app.use('/uploads/business-orders', express.static(businessOrdersDir));
app.use('/uploads/chat-files', express.static(chatFilesDir));

console.log('✅ تم تهيئة خدمة الملفات الثابتة للمجلدات:');
console.log('📁 مسار uploads:', uploadsDir);
console.log('📁 مسار videos:', videosDir);
console.log('📁 مسار summaries:', summariesDir);
console.log('📁 مسار chat-files:', chatFilesDir);

// ============================================================
// مسار مباشر للفيديوهات (حل بديل)
// ============================================================
app.get('/uploads/videos/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(videosDir, filename);
    
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        const altPath = path.join(__dirname, '../uploads/videos', filename);
        if (fs.existsSync(altPath)) {
            res.sendFile(altPath);
        } else {
            res.status(404).json({
                success: false,
                message: 'الملف غير موجود',
                filename: filename
            });
        }
    }
});

// ============================================================
// مسار بديل للفيديوهات (بسيط)
// ============================================================
app.get('/video/:filename', (req, res) => {
    const filePath = path.join(videosDir, req.params.filename);
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).json({
            success: false,
            message: 'الملف غير موجود'
        });
    }
});

// ============================================================
// الاتصال بقاعدة البيانات
// ============================================================
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/draseh_platform';

mongoose.connect(MONGO_URI)
    .then(() => {
        console.log('✅ تم الاتصال بقاعدة البيانات بنجاح');
        const { initGridFS } = require('./config/gridfs');
        initGridFS();
    })
    .catch(err => console.error('❌ فشل الاتصال بقاعدة البيانات:', err.message));

// ============================================================
// استيراد النماذج (Models)
// ============================================================
const Video = require('./models/Video');
const Model = require('./models/Model');
const Order = require('./models/Order');
const User = require('./models/User');
const University = require('./models/University');
const ExplanationMaterial = require('./models/ExplanationMaterial');
const Summary = require('./models/Summary');
const Subscription = require('./models/Subscription');
const Conversation = require('./models/Conversation');
const Message = require('./models/Message');

// ============================================================
// استيراد الميدل وير
// ============================================================
const uploadVideo = require('./middleware/uploadVideo');
const upload = require('./middleware/upload');
const { protect, authorize } = require('./middleware/auth');

// ============================================================
// استيراد دوال GridFS
// ============================================================
const { 
    upload: gridfsUpload,
    uploadToGridFS,
    getGridFSBucket, 
    getFileInfo, 
    deleteFile, 
    getStreamUrl,
    getMimeType
} = require('./config/gridfs');

// ============================================================
// المسار الرئيسي
// ============================================================
app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: '🚀 مرحباً بك في منصة ارتقاء - الخادم يعمل بنجاح!',
        version: '2.0.0',
        storage: 'GridFS (MongoDB)',
        endpoints: {
            auth: '/api/auth',
            orders: '/api/orders',
            videos: '/api/videos',
            models: '/api/models',
            users: '/api/users',
            universities: '/api/universities',
            explanations: '/api/explanations/materials',
            summaries: '/api/summaries',
            subscriptions: '/api/subscriptions',
            health: '/api/health',
            businessOrders: '/api/business-orders'
        },
        status: {
            server: 'running',
            database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
            gridfs: 'ready',
            time: new Date().toISOString()
        }
    });
});

// ============================================================
// 🎬 مسار بث الملفات من GridFS
// ============================================================
app.get('/api/files/stream/:fileId', async (req, res) => {
    try {
        const { fileId } = req.params;
        const ObjectId = require('mongodb').ObjectId;

        if (!ObjectId.isValid(fileId)) {
            return res.status(400).json({ success: false, message: 'معرف ملف غير صالح' });
        }

        const fileInfo = await getFileInfo(fileId);
        if (!fileInfo) {
            return res.status(404).json({ success: false, message: 'الملف غير موجود' });
        }

        res.set('Content-Type', fileInfo.contentType || 'application/octet-stream');
        res.set('Content-Length', fileInfo.length);
        res.set('Accept-Ranges', 'bytes');

        const bucket = getGridFSBucket();
        const range = req.headers.range;

        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileInfo.length - 1;
            const chunksize = (end - start) + 1;

            res.status(206);
            res.set('Content-Range', `bytes ${start}-${end}/${fileInfo.length}`);
            res.set('Content-Length', chunksize);

            const downloadStream = bucket.openDownloadStream(new ObjectId(fileId), {
                start: start,
                end: end + 1
            });

            downloadStream.pipe(res);
            downloadStream.on('error', (error) => {
                console.error('❌ خطأ في البث:', error);
                if (!res.headersSent) {
                    res.status(500).json({ success: false, message: 'حدث خطأ في بث الملف' });
                }
            });
        } else {
            const downloadStream = bucket.openDownloadStream(new ObjectId(fileId));
            downloadStream.pipe(res);
            downloadStream.on('error', (error) => {
                console.error('❌ خطأ في البث:', error);
                if (!res.headersSent) {
                    res.status(500).json({ success: false, message: 'حدث خطأ في بث الملف' });
                }
            });
        }

    } catch (error) {
        console.error('❌ خطأ في بث الملف:', error);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
});

// ============================================================
// 📥 تحميل ملف من GridFS
// ============================================================
app.get('/api/files/download/:fileId', protect, async (req, res) => {
    try {
        const { fileId } = req.params;
        const ObjectId = require('mongodb').ObjectId;

        const fileInfo = await getFileInfo(fileId);
        if (!fileInfo) {
            return res.status(404).json({ success: false, message: 'الملف غير موجود' });
        }

        res.set('Content-Type', fileInfo.contentType || 'application/octet-stream');
        res.set('Content-Disposition', `attachment; filename="${fileInfo.filename || 'file'}"`);

        const bucket = getGridFSBucket();
        const downloadStream = bucket.openDownloadStream(new ObjectId(fileId));
        downloadStream.pipe(res);

        downloadStream.on('error', (error) => {
            console.error('❌ خطأ في التحميل:', error);
            if (!res.headersSent) {
                res.status(500).json({ success: false, message: 'حدث خطأ في تحميل الملف' });
            }
        });

    } catch (error) {
        console.error('❌ خطأ في تحميل الملف:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================
// 📋 جلب معلومات ملف
// ============================================================
app.get('/api/files/info/:fileId', protect, async (req, res) => {
    try {
        const { fileId } = req.params;
        const fileInfo = await getFileInfo(fileId);
        
        if (!fileInfo) {
            return res.status(404).json({ success: false, message: 'الملف غير موجود' });
        }

        res.status(200).json({
            success: true,
            data: {
                id: fileInfo._id,
                filename: fileInfo.filename,
                contentType: fileInfo.contentType,
                size: fileInfo.length,
                uploadDate: fileInfo.uploadDate,
                metadata: fileInfo.metadata
            }
        });

    } catch (error) {
        console.error('❌ خطأ في جلب معلومات الملف:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================
// 📹 مسارات الفيديوهات (VIDEOS)
// ============================================================

// رفع فيديو باستخدام GridFS
app.post('/api/videos/upload', protect, authorize('admin'), gridfsUpload.single('video'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'يرجى اختيار فيديو' });
        }

        const { title, subjectId, subjectName, specialtyName, universityName, description } = req.body;

        if (!title || !subjectId || !subjectName) {
            return res.status(400).json({
                success: false,
                message: 'العنوان، معرف المادة، واسم المادة مطلوبون'
            });
        }

        const fileResult = await uploadToGridFS(req.file, {
            title: title,
            subjectId: subjectId,
            uploadedBy: req.user.id
        });

        if (!fileResult) {
            return res.status(500).json({ success: false, message: 'فشل رفع الفيديو إلى GridFS' });
        }

        const video = new Video({
            title: title,
            subjectId: String(subjectId),
            subjectName: subjectName,
            specialtyName: specialtyName || '',
            universityName: universityName || '',
            description: description || '',
            fileName: req.file.originalname,
            filePath: `/api/files/stream/${fileResult.fileId}`,
            fileSize: (req.file.size / (1024 * 1024)).toFixed(2) + ' MB',
            fileType: req.file.mimetype,
            fileId: fileResult.id,
            duration: '00:00',
            uploadDate: new Date(),
            views: 0,
            storageProvider: 'gridfs'
        });

        await video.save();

        res.status(201).json({
            success: true,
            message: '✅ تم رفع الفيديو بنجاح إلى قاعدة البيانات',
            data: video
        });

    } catch (error) {
        console.error('❌ خطأ في رفع الفيديو:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// جلب جميع الفيديوهات
app.get('/api/videos/all', async (req, res) => {
    try {
        const videos = await Video.find().sort({ uploadDate: -1 });
        res.status(200).json({ success: true, count: videos.length, data: videos });
    } catch (error) {
        console.error('❌ خطأ في جلب الفيديوهات:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// جلب فيديوهات مادة معينة
app.get('/api/videos/subject/:subjectId', async (req, res) => {
    try {
        const videos = await Video.find({ subjectId: req.params.subjectId });
        res.status(200).json({ success: true, count: videos.length, data: videos });
    } catch (error) {
        console.error('❌ خطأ في جلب فيديوهات المادة:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// جلب فيديو محدد
app.get('/api/videos/:id', async (req, res) => {
    try {
        const video = await Video.findById(req.params.id);
        if (!video) {
            return res.status(404).json({ success: false, message: 'الفيديو غير موجود' });
        }
        res.status(200).json({ success: true, data: video });
    } catch (error) {
        console.error('❌ خطأ في جلب الفيديو:', error);
        if (error.name === 'CastError' || error.kind === 'ObjectId') {
            return res.status(404).json({ success: false, message: 'الفيديو غير موجود' });
        }
        res.status(500).json({ success: false, message: error.message });
    }
});

// تحديث عدد المشاهدات
app.put('/api/videos/:id/views', async (req, res) => {
    try {
        const video = await Video.findByIdAndUpdate(
            req.params.id,
            { $inc: { views: 1 } },
            { new: true }
        );
        if (!video) {
            return res.status(404).json({ success: false, message: 'الفيديو غير موجود' });
        }
        res.status(200).json({ success: true, data: video });
    } catch (error) {
        console.error('❌ خطأ في تحديث المشاهدات:', error);
        if (error.name === 'CastError' || error.kind === 'ObjectId') {
            return res.status(404).json({ success: false, message: 'الفيديو غير موجود' });
        }
        res.status(500).json({ success: false, message: error.message });
    }
});

// حذف فيديو
app.delete('/api/videos/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const video = await Video.findById(req.params.id);
        if (!video) {
            return res.status(404).json({ success: false, message: 'الفيديو غير موجود' });
        }

        if (video.fileId) {
            try {
                await deleteFile(video.fileId);
                console.log(`🗑️ تم حذف الملف من GridFS: ${video.fileId}`);
            } catch (deleteError) {
                console.error('❌ خطأ في حذف الملف من GridFS:', deleteError);
            }
        }

        await video.deleteOne();
        res.status(200).json({ success: true, message: 'تم حذف الفيديو بنجاح' });

    } catch (error) {
        console.error('❌ خطأ في حذف الفيديو:', error);
        if (error.name === 'CastError' || error.kind === 'ObjectId') {
            return res.status(404).json({ success: false, message: 'الفيديو غير موجود' });
        }
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================
// 3. مسارات النماذج (MODELS)
// ============================================================

// جلب جميع النماذج
app.get('/api/models', async (req, res) => {
    try {
        const models = await Model.find()
            .populate('uploadedBy', 'name email')
            .sort({ createdAt: -1 });
        res.status(200).json({ success: true, count: models.length, data: models });
    } catch (error) {
        console.error('❌ خطأ في جلب النماذج:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// جلب نموذج محدد
app.get('/api/models/:id', async (req, res) => {
    try {
        const model = await Model.findById(req.params.id);
        if (!model) {
            return res.status(404).json({ success: false, message: 'النموذج غير موجود' });
        }
        res.status(200).json({ success: true, data: model });
    } catch (error) {
        console.error('❌ خطأ في جلب النموذج:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// رفع نموذج جديد
app.post('/api/models', protect, authorize('admin'), async (req, res) => {
    try {
        const { 
            title, category, description, fileName, fileSize, fileType, fileData, 
            mainService, subService 
        } = req.body;

        if (!title || !category || !fileName || !fileData || !mainService) {
            return res.status(400).json({
                success: false,
                message: 'يرجى إدخال جميع البيانات المطلوبة'
            });
        }

        const model = new Model({
            title,
            category,
            description: description || '',
            fileName,
            fileSize: fileSize || '0 KB',
            fileType: fileType || 'application/octet-stream',
            fileData,
            mainService: mainService,
            subService: subService || 'خدمة فرعية'
        });

        await model.save();
        res.status(201).json({ success: true, message: 'تم رفع النموذج بنجاح', data: model });
    } catch (error) {
        console.error('❌ خطأ في رفع النموذج:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// حذف نموذج
app.delete('/api/models/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const model = await Model.findById(req.params.id);
        if (!model) {
            return res.status(404).json({ success: false, message: 'النموذج غير موجود' });
        }
        await model.deleteOne();
        res.status(200).json({ success: true, message: 'تم حذف النموذج بنجاح' });
    } catch (error) {
        console.error('❌ خطأ في حذف النموذج:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================
// 4. مسارات الطلبات (ORDERS)
// ============================================================

// جلب جميع الطلبات للمدير
app.get('/api/orders/admin/all', protect, authorize('admin'), async (req, res) => {
    try {
        const orders = await Order.find()
            .populate('user', 'name email')
            .populate('assignedExpert', 'name email')
            .sort({ createdAt: -1 });
        res.status(200).json({ success: true, count: orders.length, data: orders });
    } catch (error) {
        console.error('❌ خطأ في جلب جميع الطلبات:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// جلب طلبات الخبير
app.get('/api/orders/expert', protect, authorize('expert'), async (req, res) => {
    try {
        const orders = await Order.find({ assignedExpert: req.user.id })
            .populate('user', 'name email')
            .populate('assignedExpert', 'name email')
            .sort({ assignedAt: -1, createdAt: -1 });
        res.status(200).json({ success: true, count: orders.length, data: orders });
    } catch (error) {
        console.error('❌ خطأ في جلب طلبات الخبير:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// جلب طلبات المستخدم
app.get('/api/orders', protect, async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user.id })
            .populate('user', 'name email')
            .sort({ createdAt: -1 });
        res.status(200).json({ success: true, count: orders.length, data: orders });
    } catch (error) {
        console.error('❌ خطأ في جلب طلبات المستخدم:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// إنشاء طلب جديد
app.post('/api/orders', protect, async (req, res) => {
    try {
        const orderData = {
            serviceType: req.body.serviceType || 'خدمة',
            title: req.body.title || 'طلب جديد',
            description: req.body.description || '',
            deadline: req.body.deadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            budget: req.body.budget || 0,
            status: 'pending',
            user: req.user.id
        };
        const order = await Order.create(orderData);
        res.status(201).json({ success: true, message: 'تم إنشاء الطلب بنجاح ✅', data: order });
    } catch (error) {
        console.error('❌ خطأ في إنشاء الطلب:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// جلب طلب محدد
app.get('/api/orders/:id', protect, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('user', 'name email')
            .populate('assignedExpert', 'name email');
        if (!order) {
            return res.status(404).json({ success: false, message: 'الطلب غير موجود ❌' });
        }
        res.status(200).json({ success: true, data: order });
    } catch (error) {
        console.error('❌ خطأ في جلب الطلب:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// تحديث طلب
app.put('/api/orders/:id', protect, async (req, res) => {
    try {
        let order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'الطلب غير موجود ❌' });
        }
        order = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        res.status(200).json({ success: true, message: 'تم تحديث الطلب بنجاح ✅', data: order });
    } catch (error) {
        console.error('❌ خطأ في تحديث الطلب:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// حذف طلب
app.delete('/api/orders/:id', protect, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'الطلب غير موجود ❌' });
        }
        await order.deleteOne();
        res.status(200).json({ success: true, message: 'تم حذف الطلب بنجاح 🗑️' });
    } catch (error) {
        console.error('❌ خطأ في حذف الطلب:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// تحديث حالة الطلب
app.put('/api/orders/:id/status', protect, async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['pending', 'in-progress', 'completed', 'revision', 'cancelled'];
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'حالة غير صالحة. الحالات المتاحة: ' + validStatuses.join(', ')
            });
        }
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'الطلب غير موجود ❌' });
        }
        order.status = status;
        await order.save();
        res.status(200).json({ success: true, message: `تم تحديث حالة الطلب إلى ${status} ✅`, data: order });
    } catch (error) {
        console.error('❌ خطأ في تحديث حالة الطلب:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// تعيين خبير للطلب
app.put('/api/orders/:id/assign-expert', protect, authorize('admin'), async (req, res) => {
    try {
        const { expertId, notes } = req.body;
        if (!expertId) {
            return res.status(400).json({ success: false, message: 'يرجى اختيار خبير' });
        }
        const expert = await User.findById(expertId);
        if (!expert || expert.role !== 'expert') {
            return res.status(404).json({ success: false, message: 'الخبير غير موجود' });
        }
        const order = await Order.findByIdAndUpdate(
            req.params.id,
            { assignedExpert: expertId, assignedAt: new Date(), status: 'in-progress', expertNotes: notes || '' },
            { new: true }
        );
        if (!order) {
            return res.status(404).json({ success: false, message: 'الطلب غير موجود ❌' });
        }
        res.status(200).json({ success: true, message: `تم تعيين الخبير ${expert.name} بنجاح ✅`, data: order });
    } catch (error) {
        console.error('❌ خطأ في تعيين الخبير:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================
// 4.5 مسارات طلبات كلية الأعمال (BUSINESS ORDERS)
// ============================================================

app.get('/api/business-orders', protect, authorize('admin'), async (req, res) => {
    try {
        const orders = await Order.find({
            $or: [{ orderType: 'business' }, { department: { $exists: true, $ne: '' } }]
        })
        .populate('user', 'name email')
        .populate('assignedExpert', 'name email')
        .sort({ createdAt: -1 });
        res.status(200).json({ success: true, count: orders.length, data: orders });
    } catch (error) {
        console.error('❌ خطأ في جلب طلبات الأعمال:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/api/business-orders/:id', protect, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('user', 'name email')
            .populate('assignedExpert', 'name email');
        if (!order) {
            return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
        }
        res.status(200).json({ success: true, data: order });
    } catch (error) {
        console.error('❌ خطأ في جلب الطلب:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/business-orders', async (req, res) => {
    try {
        const { name, email, phone, department, service, requestType, title, description, organization, deliveryDate, notes, termsAgreed, files } = req.body;
        const required = { name, email, phone, department, service, requestType, title, description, deliveryDate };
        const missing = Object.entries(required).filter(([k, v]) => !v || v.trim() === '').map(([k]) => k);
        if (missing.length > 0) {
            return res.status(400).json({ success: false, message: `الحقول المطلوبة غير مكتملة: ${missing.join('، ')}` });
        }

        const savedFiles = [];
        if (files && Array.isArray(files) && files.length > 0) {
            for (const file of files) {
                try {
                    if (!file.fileData || !file.fileData.includes(';base64,')) continue;
                    const base64Data = file.fileData.split(';base64,').pop();
                    const buffer = Buffer.from(base64Data, 'base64');
                    if (buffer.length === 0) continue;
                    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                    const ext = path.extname(file.filename);
                    const fileName = 'business-' + uniqueSuffix + ext;
                    const filePath = path.join(businessOrdersDir, fileName);
                    fs.writeFileSync(filePath, buffer);
                    savedFiles.push({
                        filename: file.filename,
                        filePath: filePath,
                        fileId: fileName,
                        fileSize: file.fileSize || buffer.length,
                        mimeType: file.fileType || 'application/octet-stream',
                        uploadDate: new Date()
                    });
                } catch (error) {
                    console.error(`❌ خطأ في حفظ الملف:`, error);
                }
            }
        }

        const order = new Order({
            serviceType: 'خدمة كلية الأعمال',
            title: title.trim(),
            description: description.trim(),
            deadline: new Date(deliveryDate),
            budget: 0,
            name: name.trim(),
            email: email.trim(),
            phone: phone.trim(),
            department: department.trim(),
            service: service.trim(),
            requestType: requestType.trim(),
            organization: organization ? organization.trim() : '',
            deliveryDate: deliveryDate,
            notes: notes ? notes.trim() : '',
            termsAgreed: termsAgreed === true || termsAgreed === 'true',
            orderType: 'business',
            status: 'pending',
            files: savedFiles
        });

        await order.save();
        res.status(201).json({ success: true, message: 'تم إرسال الطلب بنجاح ✅', data: order });
    } catch (error) {
        console.error('❌ خطأ في إنشاء الطلب:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/api/business-orders/files/:fileId', protect, async (req, res) => {
    try {
        const { fileId } = req.params;
        const order = await Order.findOne({ 'files.fileId': fileId });
        if (!order) {
            return res.status(404).json({ success: false, message: 'الملف غير موجود' });
        }
        const filePath = path.join(businessOrdersDir, fileId);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, message: 'الملف غير موجود على الخادم' });
        }
        const fileInfo = order.files.find(f => f.fileId === fileId);
        res.download(filePath, fileInfo ? fileInfo.filename : fileId);
    } catch (error) {
        console.error('❌ خطأ في تحميل الملف:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.put('/api/business-orders/:id/status', protect, async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['pending', 'in-progress', 'completed', 'revision', 'cancelled'];
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'حالة غير صالحة' });
        }
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'الطلب غير موجود ❌' });
        }
        order.status = status;
        await order.save();
        res.status(200).json({ success: true, message: `تم تحديث حالة الطلب إلى ${status} ✅`, data: order });
    } catch (error) {
        console.error('❌ خطأ في تحديث حالة الطلب:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.delete('/api/business-orders/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'الطلب غير موجود ❌' });
        }
        if (order.files && order.files.length > 0) {
            for (const file of order.files) {
                const filePath = path.join(businessOrdersDir, file.fileId);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }
        }
        await order.deleteOne();
        res.status(200).json({ success: true, message: 'تم حذف الطلب بنجاح 🗑️' });
    } catch (error) {
        console.error('❌ خطأ في حذف الطلب:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================
// 5. مسارات المستخدمين (USERS)
// ============================================================

app.get('/api/users', protect, authorize('admin'), async (req, res) => {
    try {
        const users = await User.find().select('-password').sort({ createdAt: -1 });
        res.status(200).json({ success: true, count: users.length, data: users });
    } catch (error) {
        console.error('❌ خطأ في جلب المستخدمين:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/api/users/experts', protect, authorize('admin'), async (req, res) => {
    try {
        const experts = await User.find({ role: 'expert' }).select('-password').sort({ name: 1 });
        res.status(200).json({ success: true, data: experts });
    } catch (error) {
        console.error('❌ خطأ في جلب الخبراء:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/api/users/:id', protect, async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
        }
        res.status(200).json({ success: true, data: user });
    } catch (error) {
        console.error('❌ خطأ في جلب المستخدم:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.put('/api/users/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const { isActive, expertise, bio, role } = req.body;
        const updateData = {};
        if (isActive !== undefined) updateData.isActive = isActive;
        if (expertise !== undefined) updateData.expertise = expertise;
        if (bio !== undefined) updateData.bio = bio;
        if (role !== undefined) updateData.role = role;
        const user = await User.findByIdAndUpdate(req.params.id, updateData, { new: true }).select('-password');
        if (!user) {
            return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
        }
        res.status(200).json({ success: true, data: user });
    } catch (error) {
        console.error('❌ خطأ في تحديث المستخدم:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.delete('/api/users/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
        }
        res.status(200).json({ success: true, message: 'تم حذف المستخدم بنجاح' });
    } catch (error) {
        console.error('❌ خطأ في حذف المستخدم:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================
// 6. مسارات الجامعات (UNIVERSITIES)
// ============================================================

app.get('/api/universities', async (req, res) => {
    try {
        const universities = await University.find().sort({ name: 1 });
        res.status(200).json({ success: true, data: universities });
    } catch (error) {
        console.error('❌ خطأ في جلب الجامعات:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/universities', protect, authorize('admin'), async (req, res) => {
    try {
        const { name, icon, count } = req.body;
        if (!name) {
            return res.status(400).json({ success: false, message: 'اسم الجامعة مطلوب' });
        }
        const existing = await University.findOne({ name });
        if (existing) {
            return res.status(400).json({ success: false, message: 'هذه الجامعة موجودة بالفعل' });
        }
        const university = new University({ name, icon: icon || 'fa-university', count: count || 0 });
        await university.save();
        res.status(201).json({ success: true, message: 'تم إضافة الجامعة بنجاح', data: university });
    } catch (error) {
        console.error('❌ خطأ في إضافة الجامعة:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.delete('/api/universities/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const university = await University.findById(req.params.id);
        if (!university) {
            return res.status(404).json({ success: false, message: 'الجامعة غير موجودة' });
        }
        await ExplanationMaterial.deleteMany({ universityId: req.params.id });
        await university.deleteOne();
        res.status(200).json({ success: true, message: 'تم حذف الجامعة والمواد المرتبطة بها بنجاح' });
    } catch (error) {
        console.error('❌ خطأ في حذف الجامعة:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================
// 7. مسارات المواد التعليمية (EXPLANATIONS MATERIALS)
// ============================================================

app.get('/api/explanations/materials', async (req, res) => {
    try {
        const materials = await ExplanationMaterial.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: materials });
    } catch (error) {
        console.error('❌ خطأ في جلب المواد:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/api/explanations/materials/:id', async (req, res) => {
    try {
        const material = await ExplanationMaterial.findById(req.params.id);
        if (!material) {
            return res.status(404).json({ success: false, message: 'المادة غير موجودة' });
        }
        res.status(200).json({ success: true, data: material });
    } catch (error) {
        console.error('❌ خطأ في جلب المادة:', error);
        if (error.name === 'CastError' || error.kind === 'ObjectId') {
            return res.status(404).json({ success: false, message: 'المادة غير موجودة' });
        }
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/explanations/materials', protect, authorize('admin'), async (req, res) => {
    try {
        const { title, code, instructor, universityId, icon, videos, description, isFeatured, price } = req.body;
        if (!title || !code || !instructor || !universityId) {
            return res.status(400).json({ success: false, message: 'جميع الحقول المطلوبة غير مكتملة' });
        }
        const university = await University.findById(universityId);
        if (!university) {
            return res.status(404).json({ success: false, message: 'الجامعة غير موجودة' });
        }
        const material = new ExplanationMaterial({
            title, code, instructor, universityId,
            icon: icon || 'fa-book',
            videos: videos || 0,
            description: description || '',
            isFeatured: isFeatured || false,
            price: price || 99
        });
        await material.save();
        await University.findByIdAndUpdate(universityId, { $inc: { count: 1 } });
        res.status(201).json({ success: true, message: 'تم إضافة المادة بنجاح', data: material });
    } catch (error) {
        console.error('❌ خطأ في إضافة المادة:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.put('/api/explanations/materials/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const material = await ExplanationMaterial.findById(req.params.id);
        if (!material) {
            return res.status(404).json({ success: false, message: 'المادة غير موجودة' });
        }
        Object.keys(req.body).forEach(key => {
            if (req.body[key] !== undefined) {
                material[key] = req.body[key];
            }
        });
        await material.save();
        res.status(200).json({ success: true, message: 'تم تحديث المادة بنجاح', data: material });
    } catch (error) {
        console.error('❌ خطأ في تحديث المادة:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.delete('/api/explanations/materials/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const material = await ExplanationMaterial.findById(req.params.id);
        if (!material) {
            return res.status(404).json({ success: false, message: 'المادة غير موجودة' });
        }
        await material.deleteOne();
        await University.findByIdAndUpdate(material.universityId, { $inc: { count: -1 } });
        res.status(200).json({ success: true, message: 'تم حذف المادة بنجاح' });
    } catch (error) {
        console.error('❌ خطأ في حذف المادة:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================
// 8. مسارات الملخصات (SUMMARIES)
// ============================================================

app.get('/api/summaries/all', async (req, res) => {
    try {
        const summaries = await Summary.find().populate('uploader', 'name email').sort({ createdAt: -1 });
        res.status(200).json({ success: true, count: summaries.length, data: summaries });
    } catch (error) {
        console.error('❌ خطأ في جلب الملخصات:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/api/summaries/:id', async (req, res) => {
    try {
        const summary = await Summary.findById(req.params.id);
        if (!summary) {
            return res.status(404).json({ success: false, message: 'الملخص غير موجود' });
        }
        res.status(200).json({ success: true, data: summary });
    } catch (error) {
        console.error('❌ خطأ في جلب الملخص:', error);
        if (error.name === 'CastError' || error.kind === 'ObjectId') {
            return res.status(404).json({ success: false, message: 'الملخص غير موجود' });
        }
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/summaries/upload', protect, authorize('admin'), async (req, res) => {
    try {
        const { title, subject, pages, size, fileName, fileSize, fileType, fileData, date, price } = req.body;
        if (!title || !subject || !pages || !size || !fileName || !fileData) {
            return res.status(400).json({ success: false, message: 'يرجى إدخال جميع البيانات المطلوبة' });
        }
        const summary = new Summary({
            title, subject, pages: parseInt(pages), size, fileName,
            fileSize: fileSize || (fileData.length / 1024).toFixed(2) + ' KB',
            fileType: fileType || 'application/pdf',
            fileData,
            date: date || new Date().toISOString().split('T')[0],
            downloads: 0,
            price: price || 49,
            uploader: req.user.id
        });
        await summary.save();
        res.status(201).json({ success: true, message: 'تم رفع الملخص بنجاح', data: summary });
    } catch (error) {
        console.error('❌ خطأ في رفع الملخص:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/api/summaries/download/:id', async (req, res) => {
    try {
        const summary = await Summary.findById(req.params.id);
        if (!summary) {
            return res.status(404).json({ success: false, message: 'الملخص غير موجود' });
        }
        if (!summary.fileData) {
            return res.status(404).json({ success: false, message: 'الملف غير موجود' });
        }
        summary.downloads = (summary.downloads || 0) + 1;
        await summary.save();
        res.status(200).json({
            success: true,
            message: 'تم تحميل الملف بنجاح',
            data: { fileData: summary.fileData, fileName: summary.fileName || 'ملخص.pdf' }
        });
    } catch (error) {
        console.error('❌ خطأ في تحميل الملخص:', error);
        if (error.name === 'CastError' || error.kind === 'ObjectId') {
            return res.status(404).json({ success: false, message: 'الملخص غير موجود' });
        }
        res.status(500).json({ success: false, message: error.message });
    }
});

app.delete('/api/summaries/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const summary = await Summary.findById(req.params.id);
        if (!summary) {
            return res.status(404).json({ success: false, message: 'الملخص غير موجود' });
        }
        await summary.deleteOne();
        res.status(200).json({ success: true, message: 'تم حذف الملخص بنجاح' });
    } catch (error) {
        console.error('❌ خطأ في حذف الملخص:', error);
        if (error.name === 'CastError' || error.kind === 'ObjectId') {
            return res.status(404).json({ success: false, message: 'الملخص غير موجود' });
        }
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================
// 9. مسارات الاشتراكات (SUBSCRIPTIONS)
// ============================================================

app.post('/api/subscriptions', async (req, res) => {
    try {
        const { name, email, phone, subscriptionType, materialId, title, price, paymentMethod, notes } = req.body;
        if (!name || !email || !phone || !subscriptionType || !materialId || !title || !price) {
            return res.status(400).json({ success: false, message: 'جميع الحقول المطلوبة غير مكتملة' });
        }
        let user = await User.findOne({ email });
        if (!user) {
            const bcrypt = require('bcryptjs');
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('password123', salt);
            user = new User({ name, email, password: hashedPassword, role: 'user', isActive: true });
            await user.save();
        }
        const subscription = new Subscription({
            user: user._id, subscriptionType, materialId, title, price, phone,
            paymentMethod: paymentMethod || 'card',
            status: 'pending',
            notes: notes || ''
        });
        await subscription.save();
        res.status(201).json({ success: true, message: 'تم إرسال طلب الاشتراك بنجاح', data: subscription });
    } catch (error) {
        console.error('❌ خطأ في إنشاء طلب الاشتراك:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/api/subscriptions', protect, authorize('admin'), async (req, res) => {
    try {
        const subscriptions = await Subscription.find().populate('user', 'name email').sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: subscriptions });
    } catch (error) {
        console.error('❌ خطأ في جلب طلبات الاشتراك:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/api/subscriptions/my', protect, async (req, res) => {
    try {
        const subscriptions = await Subscription.find({ user: req.user.id }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: subscriptions });
    } catch (error) {
        console.error('❌ خطأ في جلب طلبات اشتراك المستخدم:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.put('/api/subscriptions/:id/status', protect, authorize('admin'), async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['pending', 'active', 'cancelled'];
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'حالة غير صالحة' });
        }
        const subscription = await Subscription.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        ).populate('user', 'name email');
        if (!subscription) {
            return res.status(404).json({ success: false, message: 'طلب الاشتراك غير موجود' });
        }
        res.status(200).json({ success: true, message: `تم تحديث حالة الاشتراك إلى ${status}`, data: subscription });
    } catch (error) {
        console.error('❌ خطأ في تحديث حالة الاشتراك:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.delete('/api/subscriptions/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const subscription = await Subscription.findById(req.params.id);
        if (!subscription) {
            return res.status(404).json({ success: false, message: 'طلب الاشتراك غير موجود' });
        }
        await subscription.deleteOne();
        res.status(200).json({ success: true, message: 'تم حذف طلب الاشتراك بنجاح' });
    } catch (error) {
        console.error('❌ خطأ في حذف طلب الاشتراك:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================
// 1. مسارات المصادقة (AUTH)
// ============================================================

app.post('/api/auth/register', async (req, res) => {
    try {
        const bcrypt = require('bcryptjs');
        const { name, email, password, role } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'البريد الإلكتروني مسجل بالفعل' });
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const user = new User({ name, email, password: hashedPassword, role: role || 'user', isActive: true });
        await user.save();
        res.status(201).json({
            success: true,
            message: 'تم إنشاء الحساب بنجاح',
            data: { id: user._id, name: user.name, email: user.email, role: user.role }
        });
    } catch (error) {
        console.error('❌ خطأ في التسجيل:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const bcrypt = require('bcryptjs');
        const jwt = require('jsonwebtoken');
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'البريد الإلكتروني وكلمة المرور مطلوبان' });
        }
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ success: false, message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
        }
        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET || 'my_super_secret_key_123456',
            { expiresIn: '30d' }
        );
        res.status(200).json({
            success: true,
            token,
            user: { id: user._id, name: user.name, email: user.email, role: user.role, isActive: user.isActive }
        });
    } catch (error) {
        console.error('❌ خطأ في تسجيل الدخول:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/api/auth/me', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
        }
        res.status(200).json({ success: true, data: user });
    } catch (error) {
        console.error('❌ خطأ في جلب بيانات المستخدم:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================
// 🗨️ مسارات الدردشة (Chat Routes)
// ============================================================

// 1. جلب جميع المحادثات للمستخدم
app.get('/api/chat/conversations', protect, async (req, res) => {
    try {
        const userId = req.user.id;
        const conversations = await Conversation.find({ participants: userId })
            .populate('participants', 'name email role avatar')
            .populate('lastMessage')
            .sort({ updatedAt: -1 });

        const formattedConversations = conversations.map(conv => {
            const otherUser = conv.participants.find(p => p._id.toString() !== userId);
            const unreadCount = conv.messages ? conv.messages.filter(m => 
                m.senderId.toString() !== userId && !m.read
            ).length : 0;

            return {
                id: conv._id,
                otherUser: otherUser ? {
                    id: otherUser._id,
                    name: otherUser.name,
                    email: otherUser.email,
                    role: otherUser.role,
                    avatar: otherUser.avatar || otherUser.name.charAt(0)
                } : null,
                lastMessage: conv.lastMessage ? conv.lastMessage.text : 'لا توجد رسائل',
                lastMessageTime: conv.lastMessage ? conv.lastMessage.createdAt : conv.updatedAt,
                unreadCount: unreadCount,
                createdAt: conv.createdAt,
                updatedAt: conv.updatedAt
            };
        });

        res.status(200).json({ success: true, data: formattedConversations });
    } catch (error) {
        console.error('❌ خطأ في جلب المحادثات:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 2. إنشاء محادثة جديدة
app.post('/api/chat/conversations', protect, async (req, res) => {
    try {
        const { userId } = req.body;
        const senderId = req.user.id;
        let targetUserId = userId;

        if (userId === 'admin') {
            const admin = await User.findOne({ role: 'admin', isActive: true });
            if (!admin) {
                return res.status(404).json({
                    success: false,
                    message: 'لا يوجد مدير متاح للمراسلة حالياً'
                });
            }
            targetUserId = admin._id;
        }

        if (!targetUserId) {
            return res.status(400).json({ success: false, message: 'معرف المستخدم مطلوب' });
        }

        const targetUser = await User.findById(targetUserId);
        if (!targetUser) {
            return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
        }

        const existingConversation = await Conversation.findOne({
            participants: { $all: [senderId, targetUserId] }
        });

        if (existingConversation) {
            return res.status(200).json({
                success: true,
                data: existingConversation,
                message: 'المحادثة موجودة بالفعل'
            });
        }

        const conversation = new Conversation({
            participants: [senderId, targetUserId],
            createdBy: senderId,
            type: 'direct'
        });

        await conversation.save();

        const populatedConv = await Conversation.findById(conversation._id)
            .populate('participants', 'name email role avatar');

        res.status(201).json({
            success: true,
            data: populatedConv,
            message: 'تم إنشاء المحادثة بنجاح'
        });

    } catch (error) {
        console.error('❌ خطأ في إنشاء المحادثة:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 3. جلب رسائل محادثة معينة
app.get('/api/chat/conversations/:id/messages', protect, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const conversation = await Conversation.findById(id);
        if (!conversation) {
            return res.status(404).json({ success: false, message: 'المحادثة غير موجودة' });
        }

        if (!conversation.participants.includes(userId)) {
            return res.status(403).json({ success: false, message: 'ليس لديك صلاحية لعرض هذه المحادثة' });
        }

        const messages = await Message.find({ conversationId: id })
            .populate('senderId', 'name email role avatar')
            .sort({ createdAt: 1 });

        await Message.updateMany(
            { conversationId: id, senderId: { $ne: userId }, read: false },
            { read: true }
        );

        await Conversation.findByIdAndUpdate(id, { $set: { unreadCount: 0 } });

        const formattedMessages = messages.map(msg => ({
            id: msg._id,
            senderId: msg.senderId._id,
            senderName: msg.senderId.name,
            senderRole: msg.senderId.role,
            text: msg.text,
            file: msg.file || null,
            read: msg.read,
            createdAt: msg.createdAt,
            updatedAt: msg.updatedAt
        }));

        res.status(200).json({ success: true, data: formattedMessages });
    } catch (error) {
        console.error('❌ خطأ في جلب الرسائل:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 4. إرسال رسالة جديدة - مع تخزين الملفات في GridFS
app.post('/api/chat/messages', protect, async (req, res) => {
    try {
        const { conversationId, text, file } = req.body;
        const senderId = req.user.id;

        if (!conversationId || !text) {
            return res.status(400).json({
                success: false,
                message: 'معرف المحادثة والنص مطلوبان'
            });
        }

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return res.status(404).json({ success: false, message: 'المحادثة غير موجودة' });
        }

        if (!conversation.participants.includes(senderId)) {
            return res.status(403).json({ success: false, message: 'ليس لديك صلاحية لإرسال رسالة' });
        }

        let fileData = null;
        
        // تخزين الملف في GridFS
        if (file && file.fileId) {
            // الملف مرفوع بالفعل إلى GridFS عبر /api/chat/upload
            const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
            fileData = {
                name: file.name,
                type: file.type,
                size: file.size,
                path: `/api/chat/files/${file.fileId}`,
                url: `${baseUrl}/api/chat/files/${file.fileId}`,
                fileId: file.fileId,
                storageProvider: 'gridfs'
            };
        } else if (file && file.data) {
            // رفع الملف مباشرة (للتوافق مع الإصدارات القديمة)
            try {
                let base64Data = file.data;
                if (base64Data.includes(';base64,')) {
                    base64Data = base64Data.split(';base64,').pop();
                }
                const buffer = Buffer.from(base64Data, 'base64');
                const tempFile = {
                    buffer: buffer,
                    originalname: file.name || 'file',
                    mimetype: file.type || 'application/octet-stream',
                    size: file.size || buffer.length
                };
                const result = await uploadToGridFS(tempFile, {
                    type: 'chat_file',
                    conversationId: conversationId,
                    senderId: senderId
                });
                if (result) {
                    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
                    fileData = {
                        name: file.name,
                        type: file.type,
                        size: file.size,
                        path: `/api/chat/files/${result.fileId}`,
                        url: `${baseUrl}/api/chat/files/${result.fileId}`,
                        fileId: result.fileId,
                        storageProvider: 'gridfs'
                    };
                }
            } catch (error) {
                console.error('❌ خطأ في رفع الملف:', error);
            }
        }

        const message = new Message({
            conversationId: conversationId,
            senderId: senderId,
            text: text,
            file: fileData,
            read: false
        });

        await message.save();

        await Conversation.findByIdAndUpdate(conversationId, {
            lastMessage: message._id,
            updatedAt: new Date(),
            $inc: { unreadCount: 1 }
        });

        const populatedMessage = await Message.findById(message._id)
            .populate('senderId', 'name email role avatar');

        // إرسال إشعار عبر WebSocket
        const wsData = {
            type: 'new_message',
            conversationId: conversationId,
            message: {
                id: populatedMessage._id,
                senderId: populatedMessage.senderId._id,
                senderName: populatedMessage.senderId.name,
                senderRole: populatedMessage.senderId.role,
                text: populatedMessage.text,
                file: populatedMessage.file || null,
                createdAt: populatedMessage.createdAt
            }
        };

        broadcastToConversation(conversationId, senderId, wsData);

        res.status(201).json({
            success: true,
            data: {
                id: populatedMessage._id,
                senderId: populatedMessage.senderId._id,
                senderName: populatedMessage.senderId.name,
                senderRole: populatedMessage.senderId.role,
                text: populatedMessage.text,
                file: populatedMessage.file || null,
                createdAt: populatedMessage.createdAt
            },
            message: 'تم إرسال الرسالة بنجاح'
        });

    } catch (error) {
        console.error('❌ خطأ في إرسال الرسالة:', error);
        res.status(500).json({ success: false, message: error.message || 'حدث خطأ في إرسال الرسالة' });
    }
});
// backend/server.js

// ============================================================
// 📤 رفع ملف في الدردشة - الحل النهائي
// ============================================================
app.post('/api/chat/upload', protect, async (req, res) => {
    try {
        const { file } = req.body;
        
        if (!file || !file.data) {
            return res.status(400).json({ 
                success: false, 
                message: 'الملف مطلوب' 
            });
        }

        // ✅ تحويل Base64 إلى Buffer
        let base64Data = file.data;
        if (base64Data.includes(';base64,')) {
            base64Data = base64Data.split(';base64,').pop();
        }
        const buffer = Buffer.from(base64Data, 'base64');

        // ✅ حفظ الملف محلياً (الحل الأساسي)
        const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const fileName = `chat_${Date.now()}_${cleanName}`;
        const filePath = path.join(chatFilesDir, fileName);
        
        fs.writeFileSync(filePath, buffer);
        console.log(`✅ تم حفظ الملف محلياً: ${fileName} (${(buffer.length/1024).toFixed(1)} KB)`);

        const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
        
        res.status(200).json({
            success: true,
            data: {
                fileId: fileName,
                url: `${baseUrl}/uploads/chat-files/${fileName}`,
                path: `/uploads/chat-files/${fileName}`,
                name: file.name,
                type: file.type,
                size: file.size,
                storageProvider: 'local'
            }
        });

    } catch (error) {
        console.error('❌ خطأ في رفع الملف:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'حدث خطأ في رفع الملف'
        });
    }
}); 
// ============================================================
// 🖼️ عرض ملفات الدردشة - الحل النهائي
// ============================================================
app.get('/api/chat/files/:fileId', async (req, res) => {
    try {
        const { fileId } = req.params;
        
        // ✅ البحث عن الملف في التخزين المحلي أولاً
        const filePath = path.join(chatFilesDir, fileId);
        
        if (fs.existsSync(filePath)) {
            console.log('✅ تم العثور على الملف محلياً:', fileId);
            const ext = path.extname(fileId).toLowerCase();
            const mimeTypes = {
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png',
                '.gif': 'image/gif',
                '.webp': 'image/webp',
                '.pdf': 'application/pdf',
                '.mp4': 'video/mp4',
                '.mov': 'video/quicktime',
                '.avi': 'video/x-msvideo',
                '.webm': 'video/webm',
                '.doc': 'application/msword',
                '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                '.xls': 'application/vnd.ms-excel',
                '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                '.ppt': 'application/vnd.ms-powerpoint',
                '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                '.zip': 'application/zip',
                '.rar': 'application/x-rar-compressed',
                '.txt': 'text/plain'
            };
            const contentType = mimeTypes[ext] || 'application/octet-stream';
            
            res.setHeader('Content-Type', contentType);
            res.setHeader('Cache-Control', 'public, max-age=86400');
            res.setHeader('Access-Control-Allow-Origin', '*');
            
            if (contentType === 'application/pdf') {
                res.setHeader('Content-Disposition', 'inline; filename="' + fileId + '"');
            }
            
            return res.sendFile(filePath);
        }
        
        // ✅ البحث في GridFS كاحتياطي
        console.log('📁 البحث في GridFS:', fileId);
        const ObjectId = require('mongodb').ObjectId;
        
        if (!ObjectId.isValid(fileId)) {
            return res.status(404).json({ success: false, message: 'الملف غير موجود' });
        }
        
        const fileInfo = await getFileInfo(fileId);
        if (fileInfo) {
            console.log('✅ تم العثور على الملف في GridFS');
            res.setHeader('Content-Type', fileInfo.contentType || 'application/octet-stream');
            res.setHeader('Content-Length', fileInfo.length);
            res.setHeader('Cache-Control', 'public, max-age=86400');
            res.setHeader('Access-Control-Allow-Origin', '*');
            
            const bucket = getGridFSBucket();
            const downloadStream = bucket.openDownloadStream(new ObjectId(fileId));
            downloadStream.pipe(res);
            
            downloadStream.on('error', (error) => {
                console.error('❌ خطأ:', error);
                if (!res.headersSent) {
                    res.status(404).json({ success: false, message: 'الملف غير موجود' });
                }
            });
            return;
        }
        
        console.error('❌ الملف غير موجود:', fileId);
        res.status(404).json({ success: false, message: 'الملف غير موجود' });
        
    } catch (error) {
        console.error('❌ خطأ:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});
// ============================================================
// 📁 عرض الصور القديمة من التخزين المحلي
// ============================================================
app.get('/uploads/chat-files/:filename', async (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(chatFilesDir, filename);
    
    console.log('📁 البحث عن الصورة القديمة:', filename);
    
    // ✅ البحث في التخزين المحلي
    if (fs.existsSync(filePath)) {
        console.log('✅ تم العثور على الصورة محلياً:', filename);
        res.set('Content-Type', getMimeType(filename));
        return res.sendFile(filePath);
    }
    
    // ✅ محاولة البحث في مجلدات أخرى
    const altPaths = [
        path.join(__dirname, '..', 'uploads', 'chat-files', filename),
        path.join(uploadsDir, 'chat-files', filename),
        path.join(__dirname, 'uploads', filename)
    ];
    
    for (const altPath of altPaths) {
        if (fs.existsSync(altPath)) {
            console.log('✅ تم العثور على الصورة في مسار بديل:', altPath);
            res.set('Content-Type', getMimeType(filename));
            return res.sendFile(altPath);
        }
    }
    
    // ✅ البحث في GridFS
    try {
        const files = await mongoose.connection.db.collection('uploads.files')
            .find({ filename: { $regex: filename, $options: 'i' } })
            .toArray();
        
        if (files.length > 0) {
            const fileId = files[0]._id;
            console.log('✅ إعادة توجيه إلى GridFS:', fileId);
            return res.redirect(`/api/chat/files/${fileId}`);
        }
    } catch (error) {
        console.error('❌ خطأ في البحث في GridFS:', error);
    }
    
    console.error('❌ الصورة غير موجودة:', filename);
    res.status(404).json({
        success: false,
        message: 'الملف غير موجود',
        filename: filename,
        suggestion: 'يرجى إعادة تحميل الملف'
    });
});

// ============================================================
// 8. جلب قائمة المستخدمين للمدير
// ============================================================
app.get('/api/chat/clients', protect, authorize('admin'), async (req, res) => {
    try {
        const users = await User.find({ 
            role: { $in: ['user', 'client', 'expert'] },
            isActive: true 
        })
        .select('_id name email role avatar isActive createdAt')
        .sort({ name: 1 });

        const usersWithLastMessage = await Promise.all(users.map(async (user) => {
            const conversation = await Conversation.findOne({
                participants: { $all: [req.user.id, user._id] }
            })
            .populate('lastMessage')
            .sort({ updatedAt: -1 });

            const roleLabels = { 'user': 'مستخدم', 'client': 'عميل', 'expert': 'خبير' };

            return {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                roleLabel: roleLabels[user.role] || user.role,
                avatar: user.avatar || user.name.charAt(0),
                isActive: user.isActive,
                lastMessage: conversation?.lastMessage?.text || 'لا توجد رسائل',
                lastMessageTime: conversation?.lastMessage?.createdAt || conversation?.updatedAt || null,
                unreadCount: conversation?.unreadCount || 0,
                conversationId: conversation?._id || null
            };
        }));

        const roleOrder = { 'user': 0, 'client': 1, 'expert': 2 };
        usersWithLastMessage.sort((a, b) => {
            const orderA = roleOrder[a.role] ?? 3;
            const orderB = roleOrder[b.role] ?? 3;
            if (orderA !== orderB) return orderA - orderB;
            if (!a.lastMessageTime) return 1;
            if (!b.lastMessageTime) return -1;
            return new Date(b.lastMessageTime) - new Date(a.lastMessageTime);
        });

        res.status(200).json({ success: true, data: usersWithLastMessage });
    } catch (error) {
        console.error('❌ خطأ في جلب المستخدمين:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================
// 🔄 ترحيل الملفات القديمة إلى GridFS
// ============================================================
app.post('/api/chat/migrate-files', protect, authorize('admin'), async (req, res) => {
    try {
        const messages = await Message.find({
            'file.storageProvider': { $ne: 'gridfs' },
            'file.path': { $exists: true, $ne: null }
        });

        let migrated = 0;
        let failed = 0;

        for (const msg of messages) {
            try {
                const filePath = msg.file.path;
                const filename = filePath.split('/').pop();
                const localPath = path.join(chatFilesDir, filename);

                if (fs.existsSync(localPath)) {
                    const buffer = fs.readFileSync(localPath);
                    const tempFile = {
                        buffer: buffer,
                        originalname: msg.file.name || filename,
                        mimetype: msg.file.type || 'application/octet-stream',
                        size: msg.file.size || buffer.length
                    };

                    const result = await uploadToGridFS(tempFile, {
                        type: 'chat_file_migrated',
                        originalMessageId: msg._id
                    });

                    if (result) {
                        const baseUrl = process.env.BASE_URL || 'https://irteqa.onrender.com';
                        msg.file.fileId = result.fileId;
                        msg.file.url = `${baseUrl}/api/chat/files/${result.fileId}`;
                        msg.file.path = `/api/chat/files/${result.fileId}`;
                        msg.file.storageProvider = 'gridfs';
                        msg.file.gridfsId = result.id;
                        await msg.save();
                        migrated++;
                    }
                }
            } catch (error) {
                failed++;
                console.error('❌ فشل ترحيل الملف:', error);
            }
        }

        res.status(200).json({
            success: true,
            message: `تم ترحيل ${migrated} ملف، فشل ${failed} ملف`,
            migrated,
            failed
        });

    } catch (error) {
        console.error('❌ خطأ في ترحيل الملفات:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================
// مسار الصحة
// ============================================================
app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'الخادم يعمل بشكل صحيح 🚀',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        storage: 'GridFS (MongoDB)'
    });
});

// ============================================================
// 🔌 WebSocket للدردشة الفورية
// ============================================================

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const connections = {
    clients: new Map(),
    admins: new Map(),
    experts: new Map(),
    all: new Set()
};

wss.on('connection', function(ws, req) {
    const urlParams = new URLSearchParams(req.url.split('?')[1]);
    const userId = urlParams.get('userId');
    const role = urlParams.get('role') || 'client';

    if (!userId) {
        ws.close(1008, 'معرف المستخدم مطلوب');
        return;
    }

    ws.userData = { userId, role, connectedAt: new Date().toISOString() };
    connections.all.add(ws);
    
    if (role === 'admin') {
        connections.admins.set(userId, ws);
        console.log(`👤 مدير متصل: ${userId}`);
    } else if (role === 'expert') {
        connections.experts.set(userId, ws);
        console.log(`👤 خبير متصل: ${userId}`);
    } else {
        connections.clients.set(userId, ws);
        console.log(`👤 عميل متصل: ${userId}`);
    }

    sendUserConversations(ws, userId);

    broadcastToAdmins({
        type: 'user_online',
        userId: userId,
        userName: 'مستخدم',
        role: role,
        timestamp: new Date().toISOString()
    });

    ws.on('message', async function(message) {
        try {
            const data = JSON.parse(message);
            switch(data.type) {
                case 'auth':
                    ws.send(JSON.stringify({ type: 'auth_confirm', userId, role }));
                    break;
                case 'new_message':
                    await handleNewMessage(ws, data, userId, role);
                    break;
                case 'read':
                    await handleReadMessages(ws, data, userId);
                    break;
                case 'typing':
                    broadcastToConversationParticipants(data.conversationId, userId, {
                        type: 'typing',
                        userId: userId,
                        userName: data.userName || 'مستخدم',
                        isTyping: data.isTyping
                    });
                    break;
                case 'heartbeat':
                    ws.send(JSON.stringify({ type: 'heartbeat_ack', timestamp: new Date().toISOString() }));
                    break;
                default:
                    console.log('📩 نوع رسالة غير معروف:', data.type);
            }
        } catch (error) {
            console.error('❌ خطأ في معالجة الرسالة:', error);
            ws.send(JSON.stringify({ type: 'error', message: 'حدث خطأ في معالجة الرسالة' }));
        }
    });

    ws.on('close', function() {
        connections.all.delete(ws);
        connections.clients.delete(userId);
        connections.admins.delete(userId);
        connections.experts.delete(userId);
        console.log(`👤 مستخدم غير متصل: ${userId}`);
        broadcastToAdmins({ type: 'user_offline', userId, userName: 'مستخدم', timestamp: new Date().toISOString() });
    });

    ws.on('error', function(error) {
        console.error(`❌ خطأ في WebSocket للمستخدم ${userId}:`, error);
    });
});

// ============================================================
// دوال مساعدة WebSocket
// ============================================================

function sendToUser(userId, data) {
    let ws = connections.clients.get(userId);
    if (!ws) ws = connections.admins.get(userId);
    if (!ws) ws = connections.experts.get(userId);
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
        return true;
    }
    return false;
}

function broadcastToAdmins(data) {
    connections.admins.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data));
    });
}

function broadcastToConversation(conversationId, senderId, data) {
    Conversation.findById(conversationId)
        .then(conversation => {
            if (!conversation) return;
            conversation.participants.forEach(participantId => {
                if (participantId.toString() !== senderId) {
                    sendToUser(participantId.toString(), data);
                }
            });
        })
        .catch(error => console.error('❌ خطأ في إرسال إلى المحادثة:', error));
}

function broadcastToConversationParticipants(conversationId, senderId, data) {
    Conversation.findById(conversationId)
        .then(conversation => {
            if (!conversation) return;
            conversation.participants.forEach(participantId => {
                if (participantId.toString() !== senderId) {
                    sendToUser(participantId.toString(), data);
                }
            });
        })
        .catch(error => console.error('❌ خطأ:', error));
}

async function sendUserConversations(ws, userId) {
    try {
        const conversations = await Conversation.find({ participants: userId })
            .populate('participants', 'name email role avatar')
            .populate('lastMessage')
            .sort({ updatedAt: -1 });

        const formatted = conversations.map(conv => {
            const otherUser = conv.participants.find(p => p._id.toString() !== userId);
            return {
                id: conv._id,
                otherUser: otherUser ? {
                    id: otherUser._id,
                    name: otherUser.name,
                    role: otherUser.role,
                    avatar: otherUser.avatar || otherUser.name.charAt(0)
                } : null,
                lastMessage: conv.lastMessage ? conv.lastMessage.text : 'لا توجد رسائل',
                lastMessageTime: conv.lastMessage ? conv.lastMessage.createdAt : conv.updatedAt,
                unreadCount: conv.unreadCount || 0,
                createdAt: conv.createdAt
            };
        });

        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'conversations', data: formatted }));
        }
    } catch (error) {
        console.error('❌ خطأ في إرسال المحادثات:', error);
    }
}

async function handleNewMessage(ws, data, userId, role) {
    try {
        const { conversationId, text, file } = data;

        if (!conversationId || !text) {
            ws.send(JSON.stringify({ type: 'error', message: 'معرف المحادثة والنص مطلوبان' }));
            return;
        }

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            ws.send(JSON.stringify({ type: 'error', message: 'المحادثة غير موجودة' }));
            return;
        }

        if (!conversation.participants.includes(userId)) {
            ws.send(JSON.stringify({ type: 'error', message: 'ليس لديك صلاحية' }));
            return;
        }

        let fileData = null;
        
        if (file) {
            try {
                let base64Data = file.data;
                if (base64Data.includes(';base64,')) {
                    base64Data = base64Data.split(';base64,').pop();
                }
                const buffer = Buffer.from(base64Data, 'base64');

                const tempFile = {
                    buffer: buffer,
                    originalname: file.name || 'file',
                    mimetype: file.type || 'application/octet-stream',
                    size: file.size || buffer.length
                };

                const result = await uploadToGridFS(tempFile, {
                    type: 'chat_file_ws',
                    conversationId: conversationId,
                    senderId: userId
                });

                if (result) {
                    const baseUrl = process.env.BASE_URL || 'https://irteqa.onrender.com';
                    fileData = {
                        name: file.name,
                        type: file.type || 'application/octet-stream',
                        size: file.size || buffer.length,
                        path: `/api/chat/files/${result.fileId}`,
                        url: `${baseUrl}/api/chat/files/${result.fileId}`,
                        fileId: result.fileId,
                        storageProvider: 'gridfs',
                        gridfsId: result.id
                    };
                }
            } catch (error) {
                console.error('❌ خطأ في رفع ملف WebSocket:', error);
            }
        }

        const message = new Message({
            conversationId: conversationId,
            senderId: userId,
            text: text,
            file: fileData,
            read: false
        });

        await message.save();

        await Conversation.findByIdAndUpdate(conversationId, {
            lastMessage: message._id,
            updatedAt: new Date(),
            $inc: { unreadCount: 1 }
        });

        const populatedMessage = await Message.findById(message._id)
            .populate('senderId', 'name email role avatar');

        ws.send(JSON.stringify({
            type: 'message_sent',
            message: {
                id: populatedMessage._id,
                senderId: populatedMessage.senderId._id,
                senderName: populatedMessage.senderId.name,
                text: populatedMessage.text,
                file: populatedMessage.file || null,
                createdAt: populatedMessage.createdAt
            }
        }));

        const wsData = {
            type: 'new_message',
            conversationId: conversationId,
            message: {
                id: populatedMessage._id,
                senderId: populatedMessage.senderId._id,
                senderName: populatedMessage.senderId.name,
                senderRole: populatedMessage.senderId.role,
                text: populatedMessage.text,
                file: populatedMessage.file || null,
                createdAt: populatedMessage.createdAt
            }
        };

        conversation.participants.forEach(participantId => {
            if (participantId.toString() !== userId) {
                sendToUser(participantId.toString(), wsData);
            }
        });

        if (role === 'client') {
            broadcastToAdmins({
                type: 'notification',
                userId: userId,
                userName: populatedMessage.senderId.name || 'عميل',
                message: text,
                conversationId: conversationId,
                timestamp: new Date().toISOString()
            });
        }

    } catch (error) {
        console.error('❌ خطأ في معالجة الرسالة الجديدة:', error);
        ws.send(JSON.stringify({ type: 'error', message: 'حدث خطأ في إرسال الرسالة' }));
    }
}

async function handleReadMessages(ws, data, userId) {
    try {
        const { conversationId } = data;
        if (!conversationId) return;

        await Message.updateMany(
            { conversationId, senderId: { $ne: userId }, read: false },
            { read: true }
        );

        await Conversation.findByIdAndUpdate(conversationId, { $set: { unreadCount: 0 } });

        const conversation = await Conversation.findById(conversationId);
        if (conversation) {
            conversation.participants.forEach(participantId => {
                if (participantId.toString() !== userId) {
                    sendToUser(participantId.toString(), {
                        type: 'messages_read',
                        conversationId: conversationId,
                        readBy: userId
                    });
                }
            });
        }
    } catch (error) {
        console.error('❌ خطأ في تحديث القراءة:', error);
    }
}

// ============================================================
// معالجة 404
// ============================================================
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'المسار المطلوب غير موجود',
        path: req.originalUrl
    });
});

// ============================================================
// تشغيل الخادم
// ============================================================
server.listen(PORT, () => {
    console.log(`✅ الخادم يعمل على http://localhost:${PORT}`);
    console.log(`📁 مجلد الفيديوهات: ${videosDir}`);
    console.log(`📁 مجلد الطلبات: ${ordersDir}`);
    console.log(`📁 مجلد الملخصات: ${summariesDir}`);
    console.log(`📁 مجلد طلبات الأعمال: ${businessOrdersDir}`);
    console.log(`🔌 WebSocket جاهز على ws://localhost:${PORT}`);
    console.log(`📁 مجلد chat-files: ${chatFilesDir}`);
    console.log(`🌐 بيئة التشغيل: ${process.env.NODE_ENV || 'development'}`);
    console.log(`💾 التخزين: GridFS (MongoDB) - الملفات محفوظة في قاعدة البيانات`);
});

module.exports = { app, server };