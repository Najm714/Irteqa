// backend/server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const WebSocket = require('ws');
const http = require('http');
const multer = require('multer');


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
// استيراد GridFS
// ============================================================
const { 
    initGridFS, 
    getGridFSBucket, 
    gridfsUpload,
    uploadFileToGridFS,
    uploadToGridFS, 
    getFileInfo, 
    deleteFile, 
    getStreamUrl,
    getMimeType 
} = require('./config/gridfs');

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
const healthOrdersDir = path.join(uploadsDir, 'health-orders');
const academicOrdersDir = path.join(uploadsDir, 'academic-orders');
const chatFilesDir = path.join(uploadsDir, 'chat-files');
const tempDir = path.join(uploadsDir, 'temp');

const dirs = [
    { path: uploadsDir, name: 'uploads' },
    { path: videosDir, name: 'videos' },
    { path: ordersDir, name: 'orders' },
    { path: summariesDir, name: 'summaries' },
    { path: businessOrdersDir, name: 'business-orders' },
    { path: healthOrdersDir, name: 'health-orders' },
    { path: academicOrdersDir, name: 'academic-orders' },
    { path: chatFilesDir, name: 'chat-files' },
    { path: tempDir, name: 'temp' }
];

dirs.forEach(dir => {
    if (!fs.existsSync(dir.path)) {
        fs.mkdirSync(dir.path, { recursive: true });
        console.log(`📁 تم إنشاء مجلد ${dir.name}`);
    }
});

// ============================================================
// خدمة الملفات الثابتة (Uploads)
// ============================================================
app.use('/uploads', express.static(uploadsDir));
app.use('/uploads/videos', express.static(videosDir));
app.use('/uploads/orders', express.static(ordersDir));
app.use('/uploads/summaries', express.static(summariesDir));
app.use('/uploads/business-orders', express.static(businessOrdersDir));
app.use('/uploads/health-orders', express.static(healthOrdersDir));      // ✅ أضف هذا
app.use('/uploads/academic-orders', express.static(academicOrdersDir));  // ✅ أضف هذا
app.use('/uploads/chat-files', express.static(chatFilesDir));


console.log('✅ تم تهيئة خدمة الملفات الثابتة للمجلدات:');
console.log('📁 مسار uploads:', uploadsDir);
console.log('📁 مسار videos:', videosDir);
console.log('📁 مسار summaries:', summariesDir);
console.log('📁 مسار chat-files:', chatFilesDir);
console.log('📁 مسار business-orders:', businessOrdersDir);
console.log('📁 مسار health-orders:', healthOrdersDir);
console.log('📁 مسار academic-orders:', academicOrdersDir);

// ============================================================
// الاتصال بقاعدة البيانات
// ============================================================
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/draseh_platform';

mongoose.connect(MONGO_URI)
    .then(() => {
        console.log('✅ تم الاتصال بقاعدة البيانات بنجاح');
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
const College = require('./models/College');  // ✅ إضافة هذا
const Specialty = require('./models/Specialty');  
const ExplanationMaterial = require('./models/ExplanationMaterial');
const Summary = require('./models/Summary');
const Subscription = require('./models/Subscription');
const Conversation = require('./models/Conversation');
const Message = require('./models/Message');
// ============================================================
// استيراد الميدل وير
// ============================================================
const { protect, authorize } = require('./middleware/auth');

// ============================================================
// المسار الرئيسي
// ============================================================
app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: '🚀 مرحباً بك في منصة ارتقاء - الخادم يعمل بنجاح!',
        version: '2.0.0',
        storage: 'GridFS (MongoDB)',
        status: {
            server: 'running',
            database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
            gridfs: 'ready',
            time: new Date().toISOString()
        }
    });
});

// ============================================================
// 📁 مسارات الملفات العامة (GridFS)
// ============================================================

// عرض ملف من GridFS
app.get('/api/files/:fileId', async (req, res) => {
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

        const contentType = fileInfo.contentType || 'video/mp4';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Length', fileInfo.length);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.setHeader('Access-Control-Allow-Origin', '*');

        const bucket = getGridFSBucket();
        if (!bucket) {
            return res.status(500).json({ success: false, message: 'GridFS غير مهيأ' });
        }

        const downloadStream = bucket.openDownloadStream(new ObjectId(fileId));
        downloadStream.on('error', (error) => {
            console.error('❌ خطأ في بث الملف:', error);
            if (!res.headersSent) {
                res.status(500).json({ success: false, message: 'حدث خطأ في عرض الملف: ' + error.message });
            }
        });
        downloadStream.pipe(res);

    } catch (error) {
        console.error('❌ خطأ في عرض الملف:', error);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: error.message || 'حدث خطأ في عرض الملف' });
        }
    }
});

// بث الفيديو
app.get('/api/videos/stream/:fileId', async (req, res) => {
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

        const contentType = fileInfo.contentType || 'video/mp4';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Length', fileInfo.length);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.setHeader('Access-Control-Allow-Origin', '*');

        const bucket = getGridFSBucket();
        if (!bucket) {
            return res.status(500).json({ success: false, message: 'GridFS غير مهيأ' });
        }

        const downloadStream = bucket.openDownloadStream(new ObjectId(fileId));
        downloadStream.on('error', (error) => {
            console.error('❌ خطأ في بث الفيديو:', error);
            if (!res.headersSent) {
                res.status(500).json({ success: false, message: 'حدث خطأ في عرض الفيديو: ' + error.message });
            }
        });
        downloadStream.pipe(res);

    } catch (error) {
        console.error('❌ خطأ في عرض الفيديو:', error);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: error.message || 'حدث خطأ في عرض الفيديو' });
        }
    }
});

// ============================================================
// 📤 مسارات الدردشة (Chat)
// ============================================================

// رفع ملف في الدردشة
app.post('/api/chat/upload', protect, async (req, res) => {
    try {
        const { file } = req.body;
        
        if (!file || !file.data) {
            return res.status(400).json({ success: false, message: 'الملف مطلوب' });
        }

        let base64Data = file.data;
        if (base64Data.includes(';base64,')) {
            base64Data = base64Data.split(';base64,').pop();
        }
        
        if (!base64Data || base64Data.length === 0) {
            return res.status(400).json({ success: false, message: 'بيانات الملف فارغة' });
        }

        const buffer = Buffer.from(base64Data, 'base64');
        if (buffer.length === 0) {
            return res.status(400).json({ success: false, message: 'الملف فارغ' });
        }

        const tempFile = {
            buffer: buffer,
            originalname: file.name || 'file',
            mimetype: file.type || 'application/octet-stream',
            size: file.size || buffer.length
        };

        const result = await uploadToGridFS(tempFile, {
            type: 'chat_file',
            uploadedBy: req.user.id,
            uploadedByName: req.user.name,
            originalName: file.name,
            mimeType: file.type,
            fileSize: file.size
        });

        if (!result) {
            return res.status(500).json({ success: false, message: 'فشل رفع الملف إلى GridFS' });
        }

        const baseUrl = process.env.BASE_URL || 'https://irteqa.onrender.com';
        res.status(200).json({
            success: true,
            data: {
                fileId: result.fileId,
                url: `${baseUrl}/api/chat/files/${result.fileId}`,
                path: `/api/chat/files/${result.fileId}`,
                name: file.name,
                type: file.type,
                size: file.size,
                storageProvider: 'gridfs'
            }
        });

    } catch (error) {
        console.error('❌ خطأ في رفع الملف:', error);
        res.status(500).json({ success: false, message: error.message || 'حدث خطأ في رفع الملف' });
    }
});

// عرض ملفات الدردشة
app.get('/api/chat/files/:fileId', async (req, res) => {
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

        const contentType = fileInfo.contentType || 'application/octet-stream';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Length', fileInfo.length);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.setHeader('Access-Control-Allow-Origin', '*');

        if (contentType === 'application/pdf') {
            res.setHeader('Content-Disposition', 'inline; filename="' + fileInfo.filename + '"');
        }

        const bucket = getGridFSBucket();
        if (!bucket) {
            return res.status(500).json({ success: false, message: 'GridFS غير مهيأ' });
        }

        const downloadStream = bucket.openDownloadStream(new ObjectId(fileId));
        downloadStream.on('error', (error) => {
            console.error('❌ خطأ في بث الملف:', error);
            if (!res.headersSent) {
                res.status(500).json({ success: false, message: 'حدث خطأ في عرض الملف: ' + error.message });
            }
        });
        downloadStream.pipe(res);

    } catch (error) {
        console.error('❌ خطأ في عرض الملف:', error);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: error.message || 'حدث خطأ في عرض الملف' });
        }
    }
});

// ============================================================
// 📹 مسارات الفيديوهات
// ============================================================

app.post('/api/videos/upload', protect, authorize('admin'), gridfsUpload.single('video'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'يرجى اختيار فيديو' });
        }

        const { title, subjectId, subjectName, specialtyName, universityName, description } = req.body;

        if (!title || !subjectId || !subjectName) {
            return res.status(400).json({ success: false, message: 'العنوان، معرف المادة، واسم المادة مطلوبون' });
        }

        const fileResult = await uploadFileToGridFS(req.file, {
            title: title,
            subjectId: subjectId,
            uploadedBy: req.user.id,
            uploadedByName: req.user.name,
            type: 'video'
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
            filePath: `/api/files/${fileResult.fileId}`,
            fileSize: (req.file.size / (1024 * 1024)).toFixed(2) + ' MB',
            fileType: req.file.mimetype,
            fileId: fileResult.fileId,
            duration: '00:00',
            uploadDate: new Date(),
            views: 0,
            storageProvider: 'gridfs'
        });

        await video.save();
        res.status(201).json({ success: true, message: '✅ تم رفع الفيديو بنجاح', data: video });

    } catch (error) {
        console.error('❌ خطأ في رفع الفيديو:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/api/videos/all', async (req, res) => {
    try {
        const videos = await Video.find().sort({ uploadDate: -1 });
        res.status(200).json({ success: true, count: videos.length, data: videos });
    } catch (error) {
        console.error('❌ خطأ في جلب الفيديوهات:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/api/videos/subject/:subjectId', async (req, res) => {
    try {
        const videos = await Video.find({ subjectId: req.params.subjectId });
        res.status(200).json({ success: true, count: videos.length, data: videos });
    } catch (error) {
        console.error('❌ خطأ في جلب فيديوهات المادة:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/api/videos/:id', async (req, res) => {
    try {
        const video = await Video.findById(req.params.id);
        if (!video) {
            return res.status(404).json({ success: false, message: 'الفيديو غير موجود' });
        }
        res.status(200).json({ success: true, data: video });
    } catch (error) {
        console.error('❌ خطأ في جلب الفيديو:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.put('/api/videos/:id/views', async (req, res) => {
    try {
        const video = await Video.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } }, { new: true });
        if (!video) {
            return res.status(404).json({ success: false, message: 'الفيديو غير موجود' });
        }
        res.status(200).json({ success: true, data: video });
    } catch (error) {
        console.error('❌ خطأ في تحديث المشاهدات:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.delete('/api/videos/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const video = await Video.findById(req.params.id);
        if (!video) {
            return res.status(404).json({ success: false, message: 'الفيديو غير موجود' });
        }

        if (video.fileId) {
            await deleteFile(video.fileId);
        }

        await video.deleteOne();
        res.status(200).json({ success: true, message: 'تم حذف الفيديو بنجاح' });

    } catch (error) {
        console.error('❌ خطأ في حذف الفيديو:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================
// 3. مسارات النماذج (MODELS)
// ============================================================

app.get('/api/models', async (req, res) => {
    try {
        const models = await Model.find().populate('uploadedBy', 'name email').sort({ createdAt: -1 });
        res.status(200).json({ success: true, count: models.length, data: models });
    } catch (error) {
        console.error('❌ خطأ في جلب النماذج:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

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

app.post('/api/models', protect, authorize('admin'), async (req, res) => {
    try {
        const { title, category, description, fileName, fileSize, fileType, fileData, mainService, subService } = req.body;

        if (!title || !category || !fileName || !fileData || !mainService) {
            return res.status(400).json({ success: false, message: 'يرجى إدخال جميع البيانات المطلوبة' });
        }

        const model = new Model({
            title, category, description: description || '',
            fileName, fileSize: fileSize || '0 KB',
            fileType: fileType || 'application/octet-stream',
            fileData, mainService, subService: subService || 'خدمة فرعية'
        });

        await model.save();
        res.status(201).json({ success: true, message: 'تم رفع النموذج بنجاح', data: model });
    } catch (error) {
        console.error('❌ خطأ في رفع النموذج:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

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

// ✅ جلب جميع طلبات المستخدم (من جميع المصادر)
app.get('/api/orders/all', protect, async (req, res) => {
    try {
        const userId = req.user.id;
        const userEmail = req.user.email;
        
        console.log(`📋 جلب الطلبات للمستخدم: ${userEmail}`);

        const orders = await Order.find({
            $or: [
                { user: userId },
                { email: userEmail }
            ]
        }).sort({ createdAt: -1 });

        console.log(`✅ تم جلب ${orders.length} طلب`);

        const formattedOrders = orders.map(order => {
            const orderObj = order.toObject ? order.toObject() : order;
            let source = 'business';
            let sourceLabel = '💼 أعمال';
            
            if (orderObj.orderType === 'academic') {
                source = 'academic';
                sourceLabel = '🔬 بحث علمي';
            } else if (orderObj.orderType === 'health') {
                source = 'health';
                sourceLabel = '🏥 صحي';
            }
            
            return { ...orderObj, source, sourceLabel };
        });

        res.status(200).json({ success: true, count: formattedOrders.length, data: formattedOrders });

    } catch (error) {
        console.error('❌ خطأ في جلب الطلبات:', error);
        res.status(500).json({ success: false, message: error.message || 'حدث خطأ في جلب الطلبات' });
    }
});

// جلب طلبات المستخدم
app.get('/api/orders', protect, async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user.id }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, count: orders.length, data: orders });
    } catch (error) {
        console.error('❌ خطأ في جلب طلبات المستخدم:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// جلب طلب محدد
app.get('/api/orders/:id', protect, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
        }

        if (order.user && order.user.toString() !== req.user.id) {
            if (order.email && order.email !== req.user.email) {
                return res.status(403).json({ success: false, message: 'ليس لديك صلاحية لعرض هذا الطلب' });
            }
        }

        res.status(200).json({ success: true, data: order });
    } catch (error) {
        console.error('❌ خطأ في جلب الطلب:', error);
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

// تحديث حالة الطلب
app.put('/api/orders/:id/status', protect, async (req, res) => {
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

// جلب جميع الطلبات للمدير
app.get('/api/orders/admin/all', protect, authorize('admin'), async (req, res) => {
    try {
        const orders = await Order.find().populate('user', 'name email').populate('assignedExpert', 'name email').sort({ createdAt: -1 });
        res.status(200).json({ success: true, count: orders.length, data: orders });
    } catch (error) {
        console.error('❌ خطأ في جلب جميع الطلبات:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================
// 4.5 مسارات طلبات كلية الأعمال (BUSINESS ORDERS)
// ============================================================

// جلب جميع طلبات الأعمال (للمدير)
app.get('/api/business-orders', protect, authorize('admin'), async (req, res) => {
    try {
        const orders = await Order.find({
            $or: [
                { orderType: 'business' },
                { department: { $exists: true, $ne: '' } }
            ]
        }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, count: orders.length, data: orders });
    } catch (error) {
        console.error('❌ خطأ في جلب طلبات الأعمال:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// جلب طلب أعمال محدد
app.get('/api/business-orders/:id', protect, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
        }
        res.status(200).json({ success: true, data: order });
    } catch (error) {
        console.error('❌ خطأ في جلب الطلب:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// إنشاء طلب أعمال جديد
app.post('/api/business-orders', async (req, res) => {
    try {
        const { name, email, phone, department, service, requestType, title, description, organization, deliveryDate, notes, termsAgreed, files } = req.body;

        // التحقق من الحقول المطلوبة
        const required = { name, email, phone, department, service, requestType, title, description, deliveryDate };
        const missing = Object.entries(required).filter(([k, v]) => !v || v.trim() === '').map(([k]) => k);
        if (missing.length > 0) {
            return res.status(400).json({ success: false, message: `الحقول المطلوبة غير مكتملة: ${missing.join('، ')}` });
        }

        // حفظ الملفات
        const savedFiles = [];
        if (files && Array.isArray(files) && files.length > 0) {
            for (const file of files) {
                try {
                    if (!file.fileData || !file.fileData.includes(';base64,')) continue;
                    const base64Data = file.fileData.split(';base64,').pop();
                    const buffer = Buffer.from(base64Data, 'base64');
                    if (buffer.length === 0) continue;
                    
                    const ext = path.extname(file.filename || 'ملف');
                    const fileName = `business-${Date.now()}-${Math.round(Math.random() * 10000)}${ext}`;
                    const filePath = path.join(businessOrdersDir, fileName);
                    fs.writeFileSync(filePath, buffer);
                    
                    savedFiles.push({
                        filename: file.filename || 'ملف',
                        filePath: filePath,
                        fileId: fileName,
                        fileSize: file.fileSize || buffer.length,
                        mimeType: file.fileType || file.type || 'application/octet-stream',
                        uploadDate: new Date()
                    });
                } catch (error) {
                    console.error(`❌ خطأ في حفظ الملف:`, error);
                }
            }
        }

        const order = new Order({
            serviceType: service || 'خدمة كلية الأعمال',
            title: title.trim(),
            description: description.trim(),
            deadline: new Date(deliveryDate),
            budget: 0,
            status: 'pending',
            orderType: 'business',
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
            files: savedFiles,
            timeline: [{ event: 'تم إنشاء الطلب', time: new Date() }]
        });

        await order.save();
        res.status(201).json({ success: true, message: 'تم إرسال الطلب بنجاح ✅', data: order });

    } catch (error) {
        console.error('❌ خطأ في إنشاء الطلب:', error);
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({ success: false, message: `خطأ في البيانات: ${errors.join('، ')}` });
        }
        res.status(500).json({ success: false, message: error.message || 'حدث خطأ في إنشاء الطلب' });
    }
});

// تحديث حالة طلب أعمال
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
        order.timeline = order.timeline || [];
        order.timeline.push({ event: `تم تغيير الحالة إلى ${status}`, time: new Date() });
        await order.save();
        res.status(200).json({ success: true, message: `تم تحديث حالة الطلب إلى ${status} ✅`, data: order });
    } catch (error) {
        console.error('❌ خطأ في تحديث حالة الطلب:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// حذف طلب أعمال
app.delete('/api/business-orders/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'الطلب غير موجود ❌' });
        }
        if (order.files && order.files.length > 0) {
            for (const file of order.files) {
                const filePath = path.join(businessOrdersDir, file.fileId || file.filename);
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
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
// 📁 مسارات الملفات لطلبات الأعمال
// ============================================================

// عرض ملفات طلبات الأعمال (يدعم التخزين المحلي و GridFS)
app.get('/api/business-orders/files/:fileId', async (req, res) => {
    try {
        const { fileId } = req.params;
        const ObjectId = require('mongodb').ObjectId;

        // البحث في التخزين المحلي أولاً
        const localPath = path.join(businessOrdersDir, fileId);
        if (fs.existsSync(localPath)) {
            const ext = path.extname(fileId).toLowerCase();
            const mimeTypes = {
                '.pdf': 'application/pdf', '.doc': 'application/msword', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                '.xls': 'application/vnd.ms-excel', '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                '.ppt': 'application/vnd.ms-powerpoint', '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif',
                '.zip': 'application/zip', '.rar': 'application/x-rar-compressed', '.txt': 'text/plain'
            };
            const contentType = mimeTypes[ext] || 'application/octet-stream';
            res.setHeader('Content-Type', contentType);
            res.setHeader('Content-Disposition', `inline; filename="${fileId}"`);
            return res.sendFile(localPath);
        }

        // البحث في GridFS
        if (ObjectId.isValid(fileId)) {
            const fileInfo = await getFileInfo(fileId);
            if (fileInfo) {
                const bucket = getGridFSBucket();
                if (bucket) {
                    res.setHeader('Content-Type', fileInfo.contentType || 'application/octet-stream');
                    res.setHeader('Content-Length', fileInfo.length);
                    const downloadStream = bucket.openDownloadStream(new ObjectId(fileId));
                    downloadStream.pipe(res);
                    return;
                }
            }
        }

        res.status(404).json({ success: false, message: 'الملف غير موجود', fileId });
    } catch (error) {
        console.error('❌ خطأ في عرض الملف:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// عرض الملفات من التخزين المحلي
app.get('/uploads/business-orders/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(businessOrdersDir, filename);
    
    if (fs.existsSync(filePath)) {
        const ext = path.extname(filename).toLowerCase();
        const mimeTypes = {
            '.pdf': 'application/pdf', '.doc': 'application/msword', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.xls': 'application/vnd.ms-excel', '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.ppt': 'application/vnd.ms-powerpoint', '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif',
            '.zip': 'application/zip', '.rar': 'application/x-rar-compressed', '.txt': 'text/plain'
        };
        const contentType = mimeTypes[ext] || 'application/octet-stream';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
        res.sendFile(filePath);
    } else {
        res.status(404).json({ success: false, message: 'الملف غير موجود', filename });
    }
});

// قائمة الملفات (للمدير)
app.get('/api/business-orders/files/list', protect, authorize('admin'), async (req, res) => {
    try {
        const files = fs.readdirSync(businessOrdersDir);
        const fileList = files.map(filename => {
            const filePath = path.join(businessOrdersDir, filename);
            const stats = fs.statSync(filePath);
            return { filename, size: stats.size, created: stats.birthtime, modified: stats.mtime };
        });
        res.status(200).json({ success: true, count: fileList.length, data: fileList, directory: businessOrdersDir });
    } catch (error) {
        console.error('❌ خطأ في قراءة المجلد:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================
// 📁 4.6 مسارات طلبات الخدمات الأكاديمية (ACADEMIC ORDERS)
// ============================================================

// جلب جميع الطلبات الأكاديمية (للمدير)
app.get('/api/academic-orders', protect, authorize('admin'), async (req, res) => {
    try {
        const orders = await Order.find({
            $or: [
                { orderType: 'academic' },
                { department: { $regex: /Academic|Research|Translation|Design/i, $options: 'i' } }
            ]
        }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, count: orders.length, data: orders });
    } catch (error) {
        console.error('❌ خطأ في جلب الطلبات الأكاديمية:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// جلب طلب أكاديمي محدد
app.get('/api/academic-orders/:id', protect, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
        }
        res.status(200).json({ success: true, data: order });
    } catch (error) {
        console.error('❌ خطأ في جلب الطلب:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// إنشاء طلب أكاديمي جديد
app.post('/api/academic-orders', async (req, res) => {
    try {
        const { 
            name, email, phone, department, service, requestType, 
            title, description, organization, deliveryDate, notes, 
            termsAgreed, files 
        } = req.body;

        // التحقق من الحقول المطلوبة
        const required = { name, email, phone, department, service, requestType, title, description, deliveryDate };
        const missing = Object.entries(required).filter(([k, v]) => !v || v.trim() === '').map(([k]) => k);
        if (missing.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: `الحقول المطلوبة غير مكتملة: ${missing.join('، ')}` 
            });
        }

        // حفظ الملفات
        const savedFiles = [];
        if (files && Array.isArray(files) && files.length > 0) {
            for (const file of files) {
                try {
                    if (!file.fileData || !file.fileData.includes(';base64,')) continue;
                    const base64Data = file.fileData.split(';base64,').pop();
                    const buffer = Buffer.from(base64Data, 'base64');
                    if (buffer.length === 0) continue;
                    
                    const ext = path.extname(file.filename || 'ملف');
                    const fileName = `academic-${Date.now()}-${Math.round(Math.random() * 10000)}${ext}`;
                    const filePath = path.join(academicOrdersDir, fileName);
                    fs.writeFileSync(filePath, buffer);
                    
                    savedFiles.push({
                        filename: file.filename || 'ملف',
                        filePath: filePath,
                        fileId: fileName,
                        fileSize: file.fileSize || buffer.length,
                        mimeType: file.fileType || file.type || 'application/octet-stream',
                        uploadDate: new Date()
                    });
                } catch (error) {
                    console.error(`❌ خطأ في حفظ الملف:`, error);
                }
            }
        }

        // تحديد التصنيف بناءً على نوع الخدمة
        const serviceCategories = {
            research: '🔬 بحث علمي',
            statistics: '📊 تحليل إحصائي',
            translation: '🌐 ترجمة',
            editing: '✍️ تحرير',
            design: '🎨 تصميم',
            publication: '📰 نشر',
            references: '📚 مراجع'
        };

        const serviceCategory = serviceCategories[service] || 'خدمات أكاديمية';

        const order = new Order({
            serviceType: service || 'خدمة أكاديمية',
            title: title.trim(),
            description: description.trim(),
            deadline: new Date(deliveryDate),
            budget: 0,
            status: 'pending',
            orderType: 'academic',
            serviceCategory: serviceCategory,
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
            files: savedFiles,
            timeline: [{ event: 'تم إنشاء الطلب الأكاديمي', time: new Date() }]
        });

        await order.save();
        res.status(201).json({ 
            success: true, 
            message: 'تم إرسال الطلب الأكاديمي بنجاح ✅', 
            data: order 
        });

    } catch (error) {
        console.error('❌ خطأ في إنشاء الطلب الأكاديمي:', error);
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({ 
                success: false, 
                message: `خطأ في البيانات: ${errors.join('، ')}` 
            });
        }
        res.status(500).json({ 
            success: false, 
            message: error.message || 'حدث خطأ في إنشاء الطلب الأكاديمي' 
        });
    }
});

// تحديث حالة طلب أكاديمي
app.put('/api/academic-orders/:id/status', protect, async (req, res) => {
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
        order.timeline = order.timeline || [];
        order.timeline.push({ 
            event: `تم تغيير الحالة إلى ${status}`, 
            time: new Date() 
        });
        
        await order.save();
        res.status(200).json({ 
            success: true, 
            message: `تم تحديث حالة الطلب إلى ${status} ✅`, 
            data: order 
        });
    } catch (error) {
        console.error('❌ خطأ في تحديث حالة الطلب:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// حذف طلب أكاديمي
app.delete('/api/academic-orders/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'الطلب غير موجود ❌' });
        }
        
        // حذف الملفات المرتبطة
        if (order.files && order.files.length > 0) {
            for (const file of order.files) {
                const filePath = path.join(academicOrdersDir, file.fileId || file.filename);
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            }
        }
        
        await order.deleteOne();
        res.status(200).json({ success: true, message: 'تم حذف الطلب الأكاديمي بنجاح 🗑️' });
    } catch (error) {
        console.error('❌ خطأ في حذف الطلب:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================
// 📁 مسارات الملفات للطلبات الأكاديمية
// ============================================================

// عرض ملفات الطلبات الأكاديمية (يدعم التخزين المحلي و GridFS)
app.get('/api/academic-orders/files/:fileId', async (req, res) => {
    try {
        const { fileId } = req.params;
        const ObjectId = require('mongodb').ObjectId;

        // البحث في التخزين المحلي أولاً
        const localPath = path.join(academicOrdersDir, fileId);
        if (fs.existsSync(localPath)) {
            const ext = path.extname(fileId).toLowerCase();
            const mimeTypes = {
                '.pdf': 'application/pdf', 
                '.doc': 'application/msword', 
                '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                '.xls': 'application/vnd.ms-excel', 
                '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                '.ppt': 'application/vnd.ms-powerpoint', 
                '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                '.jpg': 'image/jpeg', 
                '.jpeg': 'image/jpeg', 
                '.png': 'image/png', 
                '.gif': 'image/gif',
                '.zip': 'application/zip', 
                '.rar': 'application/x-rar-compressed', 
                '.txt': 'text/plain',
                '.csv': 'text/csv',
                '.xml': 'application/xml',
                '.json': 'application/json',
                '.md': 'text/markdown'
            };
            const contentType = mimeTypes[ext] || 'application/octet-stream';
            res.setHeader('Content-Type', contentType);
            res.setHeader('Content-Disposition', `inline; filename="${fileId}"`);
            return res.sendFile(localPath);
        }

        // البحث في GridFS
        if (ObjectId.isValid(fileId)) {
            const fileInfo = await getFileInfo(fileId);
            if (fileInfo) {
                const bucket = getGridFSBucket();
                if (bucket) {
                    res.setHeader('Content-Type', fileInfo.contentType || 'application/octet-stream');
                    res.setHeader('Content-Length', fileInfo.length);
                    const downloadStream = bucket.openDownloadStream(new ObjectId(fileId));
                    downloadStream.pipe(res);
                    return;
                }
            }
        }

        res.status(404).json({ success: false, message: 'الملف غير موجود', fileId });
    } catch (error) {
        console.error('❌ خطأ في عرض الملف الأكاديمي:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// عرض الملفات من التخزين المحلي
app.get('/uploads/academic-orders/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(academicOrdersDir, filename);
    
    if (fs.existsSync(filePath)) {
        const ext = path.extname(filename).toLowerCase();
        const mimeTypes = {
            '.pdf': 'application/pdf', 
            '.doc': 'application/msword', 
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.xls': 'application/vnd.ms-excel', 
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.ppt': 'application/vnd.ms-powerpoint', 
            '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            '.jpg': 'image/jpeg', 
            '.jpeg': 'image/jpeg', 
            '.png': 'image/png', 
            '.gif': 'image/gif',
            '.zip': 'application/zip', 
            '.rar': 'application/x-rar-compressed', 
            '.txt': 'text/plain',
            '.csv': 'text/csv',
            '.xml': 'application/xml',
            '.json': 'application/json',
            '.md': 'text/markdown'
        };
        const contentType = mimeTypes[ext] || 'application/octet-stream';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
        res.sendFile(filePath);
    } else {
        res.status(404).json({ success: false, message: 'الملف غير موجود', filename });
    }
});

// قائمة الملفات الأكاديمية (للمدير)
app.get('/api/academic-orders/files/list', protect, authorize('admin'), async (req, res) => {
    try {
        const files = fs.readdirSync(academicOrdersDir);
        const fileList = files.map(filename => {
            const filePath = path.join(academicOrdersDir, filename);
            const stats = fs.statSync(filePath);
            return { 
                filename, 
                size: stats.size, 
                created: stats.birthtime, 
                modified: stats.mtime,
                sizeKB: (stats.size / 1024).toFixed(2),
                sizeMB: (stats.size / (1024 * 1024)).toFixed(2)
            };
        });
        res.status(200).json({ 
            success: true, 
            count: fileList.length, 
            data: fileList, 
            directory: academicOrdersDir 
        });
    } catch (error) {
        console.error('❌ خطأ في قراءة المجلد الأكاديمي:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================
// 📊 إحصائيات الطلبات الأكاديمية (للمدير)
// ============================================================

app.get('/api/academic-orders/stats', protect, authorize('admin'), async (req, res) => {
    try {
        const total = await Order.countDocuments({ orderType: 'academic' });
        const pending = await Order.countDocuments({ orderType: 'academic', status: 'pending' });
        const inProgress = await Order.countDocuments({ orderType: 'academic', status: 'in-progress' });
        const completed = await Order.countDocuments({ orderType: 'academic', status: 'completed' });
        const revision = await Order.countDocuments({ orderType: 'academic', status: 'revision' });
        const cancelled = await Order.countDocuments({ orderType: 'academic', status: 'cancelled' });

        // إحصائيات حسب التصنيف
        const categoryStats = await Order.aggregate([
            { $match: { orderType: 'academic' } },
            { $group: { _id: '$serviceCategory', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        // إحصائيات حسب الشهر
        const monthlyStats = await Order.aggregate([
            { $match: { orderType: 'academic' } },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': -1, '_id.month': -1 } },
            { $limit: 12 }
        ]);

        res.status(200).json({
            success: true,
            data: {
                total,
                pending,
                inProgress,
                completed,
                revision,
                cancelled,
                categoryStats,
                monthlyStats
            }
        });
    } catch (error) {
        console.error('❌ خطأ في جلب إحصائيات الطلبات الأكاديمية:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================
// 🔍 البحث والتصفية للطلبات الأكاديمية
// ============================================================

app.get('/api/academic-orders/search', protect, authorize('admin'), async (req, res) => {
    try {
        const { q, status, category, fromDate, toDate } = req.query;
        const query = { orderType: 'academic' };

        // البحث النصي
        if (q) {
            query.$or = [
                { name: { $regex: q, $options: 'i' } },
                { email: { $regex: q, $options: 'i' } },
                { title: { $regex: q, $options: 'i' } },
                { description: { $regex: q, $options: 'i' } },
                { service: { $regex: q, $options: 'i' } }
            ];
        }

        // تصفية حسب الحالة
        if (status) {
            query.status = status;
        }

        // تصفية حسب التصنيف
        if (category) {
            query.serviceCategory = { $regex: category, $options: 'i' };
        }

        // تصفية حسب التاريخ
        if (fromDate || toDate) {
            query.createdAt = {};
            if (fromDate) query.createdAt.$gte = new Date(fromDate);
            if (toDate) query.createdAt.$lte = new Date(toDate);
        }

        const orders = await Order.find(query).sort({ createdAt: -1 });
        res.status(200).json({ 
            success: true, 
            count: orders.length, 
            data: orders 
        });
    } catch (error) {
        console.error('❌ خطأ في البحث عن الطلبات:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================
// 📥 تصدير الطلبات الأكاديمية (Excel/CSV)
// ============================================================

app.get('/api/academic-orders/export/csv', protect, authorize('admin'), async (req, res) => {
    try {
        const orders = await Order.find({ orderType: 'academic' }).sort({ createdAt: -1 });
        
        // تحويل البيانات إلى CSV
        let csv = 'الرقم,الاسم,البريد الإلكتروني,الهاتف,الخدمة,نوع الطلب,الحالة,تاريخ التسليم,تاريخ الإنشاء\n';
        orders.forEach(order => {
            csv += `${order._id},${order.name},${order.email},${order.phone},${order.service},${order.requestType},${order.status},${order.deliveryDate},${order.createdAt}\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=academic-orders-${Date.now()}.csv`);
        res.send(csv);
    } catch (error) {
        console.error('❌ خطأ في تصدير CSV:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});
// ============================================================
// 4.8 مسارات طلبات العلوم الصحية (HEALTH ORDERS)
// ============================================================

// جلب جميع طلبات العلوم الصحية (للمدير)
app.get('/api/health-orders', protect, authorize('admin'), async (req, res) => {
    try {
        const orders = await Order.find({
            $or: [
                { orderType: 'health' },
                { department: { $regex: /Health Sciences|Nursing|Medical|Clinical|Midwifery|Pediatric|Psychiatric|Community Health/i, $options: 'i' } },
                { serviceCategory: { $regex: /Clinical|Nursing|Documentation|Reports|Presentations|Health/i, $options: 'i' } }
            ]
        }).sort({ createdAt: -1 });
        
        res.status(200).json({ 
            success: true, 
            count: orders.length, 
            data: orders 
        });
    } catch (error) {
        console.error('❌ خطأ في جلب طلبات العلوم الصحية:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// جلب طلب علوم صحية محدد
app.get('/api/health-orders/:id', protect, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ 
                success: false, 
                message: 'الطلب غير موجود' 
            });
        }
        res.status(200).json({ success: true, data: order });
    } catch (error) {
        console.error('❌ خطأ في جلب طلب العلوم الصحية:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// إنشاء طلب علوم صحية جديد
app.post('/api/health-orders', async (req, res) => {
    try {
        const { 
            name, email, phone, department, service, requestType, 
            title, description, organization, deliveryDate, notes, 
            termsAgreed, files, serviceCategory 
        } = req.body;

        // التحقق من الحقول المطلوبة
        const required = { 
            name, email, phone, department, service, requestType, 
            title, description, deliveryDate 
        };
        const missing = Object.entries(required)
            .filter(([k, v]) => !v || v.trim() === '')
            .map(([k]) => k);
            
        if (missing.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: `الحقول المطلوبة غير مكتملة: ${missing.join('، ')}` 
            });
        }

        // التحقق من صيغة البريد الإلكتروني
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                success: false, 
                message: 'صيغة البريد الإلكتروني غير صحيحة' 
            });
        }

        // حفظ الملفات
        const savedFiles = [];
        if (files && Array.isArray(files) && files.length > 0) {
            for (const file of files) {
                try {
                    if (!file.fileData || !file.fileData.includes(';base64,')) continue;
                    
                    const base64Data = file.fileData.split(';base64,').pop();
                    const buffer = Buffer.from(base64Data, 'base64');
                    if (buffer.length === 0) continue;
                    
                    const ext = path.extname(file.filename || 'ملف');
                    const fileName = `health-${Date.now()}-${Math.round(Math.random() * 10000)}${ext}`;
                    const filePath = path.join(healthOrdersDir, fileName);
                    fs.writeFileSync(filePath, buffer);
                    
                    savedFiles.push({
                        filename: file.filename || 'ملف',
                        filePath: filePath,
                        fileId: fileName,
                        fileSize: file.fileSize || buffer.length,
                        mimeType: file.fileType || file.type || 'application/octet-stream',
                        uploadDate: new Date()
                    });
                } catch (error) {
                    console.error(`❌ خطأ في حفظ الملف:`, error);
                }
            }
        }

        // تحديد التصنيف بناءً على نوع الخدمة
        const serviceCategories = {
            clinical: 'سريري',
            nursing: 'تمريض',
            documentation: 'توثيق',
            reports: 'تقارير',
            presentations: 'عروض تقديمية'
        };

        const category = serviceCategory || serviceCategories[service] || 'العلوم الصحية';

        const order = new Order({
            serviceType: service || 'خدمة العلوم الصحية',
            title: title.trim(),
            description: description.trim(),
            deadline: new Date(deliveryDate),
            budget: 0,
            status: 'pending',
            orderType: 'health',
            serviceCategory: category,
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
            files: savedFiles,
            timeline: [{ 
                event: 'تم إنشاء طلب العلوم الصحية', 
                time: new Date() 
            }]
        });

        await order.save();
        res.status(201).json({ 
            success: true, 
            message: 'تم إرسال طلب العلوم الصحية بنجاح ✅', 
            data: order 
        });

    } catch (error) {
        console.error('❌ خطأ في إنشاء طلب العلوم الصحية:', error);
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({ 
                success: false, 
                message: `خطأ في البيانات: ${errors.join('، ')}` 
            });
        }
        res.status(500).json({ 
            success: false, 
            message: error.message || 'حدث خطأ في إنشاء طلب العلوم الصحية' 
        });
    }
});

// تحديث حالة طلب علوم صحية
app.put('/api/health-orders/:id/status', protect, async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['pending', 'in-progress', 'completed', 'revision', 'cancelled'];
        
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({ 
                success: false, 
                message: 'حالة غير صالحة. الحالات المتاحة: ' + validStatuses.join('، ') 
            });
        }
        
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ 
                success: false, 
                message: 'الطلب غير موجود ❌' 
            });
        }
        
        order.status = status;
        order.timeline = order.timeline || [];
        order.timeline.push({ 
            event: `تم تغيير الحالة إلى ${status}`, 
            time: new Date() 
        });
        
        await order.save();
        res.status(200).json({ 
            success: true, 
            message: `تم تحديث حالة الطلب إلى ${status} ✅`, 
            data: order 
        });
    } catch (error) {
        console.error('❌ خطأ في تحديث حالة طلب العلوم الصحية:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// حذف طلب علوم صحية (للمدير فقط)
app.delete('/api/health-orders/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ 
                success: false, 
                message: 'الطلب غير موجود ❌' 
            });
        }
        
        // حذف الملفات المرتبطة
        if (order.files && order.files.length > 0) {
            for (const file of order.files) {
                const filePath = path.join(healthOrdersDir, file.fileId || file.filename);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    console.log(`🗑️ تم حذف الملف: ${filePath}`);
                }
            }
        }
        
        await order.deleteOne();
        res.status(200).json({ 
            success: true, 
            message: 'تم حذف طلب العلوم الصحية بنجاح 🗑️' 
        });
    } catch (error) {
        console.error('❌ خطأ في حذف طلب العلوم الصحية:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================
// 📁 مسارات الملفات لطلبات العلوم الصحية
// ============================================================

// عرض ملفات طلبات العلوم الصحية (يدعم التخزين المحلي و GridFS)
app.get('/api/health-orders/files/:fileId', async (req, res) => {
    try {
        const { fileId } = req.params;
        const ObjectId = require('mongodb').ObjectId;

        // البحث في التخزين المحلي أولاً
        const localPath = path.join(healthOrdersDir, fileId);
        if (fs.existsSync(localPath)) {
            const ext = path.extname(fileId).toLowerCase();
            const mimeTypes = {
                '.pdf': 'application/pdf',
                '.doc': 'application/msword',
                '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                '.xls': 'application/vnd.ms-excel',
                '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                '.ppt': 'application/vnd.ms-powerpoint',
                '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png',
                '.gif': 'image/gif',
                '.zip': 'application/zip',
                '.rar': 'application/x-rar-compressed',
                '.txt': 'text/plain',
                '.csv': 'text/csv',
                '.xml': 'application/xml',
                '.json': 'application/json',
                '.md': 'text/markdown'
            };
            const contentType = mimeTypes[ext] || 'application/octet-stream';
            res.setHeader('Content-Type', contentType);
            res.setHeader('Content-Disposition', `inline; filename="${fileId}"`);
            return res.sendFile(localPath);
        }

        // البحث في GridFS
        if (ObjectId.isValid(fileId)) {
            const fileInfo = await getFileInfo(fileId);
            if (fileInfo) {
                const bucket = getGridFSBucket();
                if (bucket) {
                    res.setHeader('Content-Type', fileInfo.contentType || 'application/octet-stream');
                    res.setHeader('Content-Length', fileInfo.length);
                    const downloadStream = bucket.openDownloadStream(new ObjectId(fileId));
                    downloadStream.pipe(res);
                    return;
                }
            }
        }

        res.status(404).json({ 
            success: false, 
            message: 'الملف غير موجود', 
            fileId 
        });
    } catch (error) {
        console.error('❌ خطأ في عرض ملف العلوم الصحية:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// عرض الملفات من التخزين المحلي
app.get('/uploads/health-orders/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(healthOrdersDir, filename);
    
    if (fs.existsSync(filePath)) {
        const ext = path.extname(filename).toLowerCase();
        const mimeTypes = {
            '.pdf': 'application/pdf',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.xls': 'application/vnd.ms-excel',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.ppt': 'application/vnd.ms-powerpoint',
            '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.zip': 'application/zip',
            '.rar': 'application/x-rar-compressed',
            '.txt': 'text/plain',
            '.csv': 'text/csv',
            '.xml': 'application/xml',
            '.json': 'application/json',
            '.md': 'text/markdown'
        };
        const contentType = mimeTypes[ext] || 'application/octet-stream';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
        res.sendFile(filePath);
    } else {
        res.status(404).json({ 
            success: false, 
            message: 'الملف غير موجود', 
            filename 
        });
    }
});

// قائمة الملفات (للمدير)
app.get('/api/health-orders/files/list', protect, authorize('admin'), async (req, res) => {
    try {
        const files = fs.readdirSync(healthOrdersDir);
        const fileList = files.map(filename => {
            const filePath = path.join(healthOrdersDir, filename);
            const stats = fs.statSync(filePath);
            return {
                filename,
                size: stats.size,
                sizeKB: (stats.size / 1024).toFixed(2),
                sizeMB: (stats.size / (1024 * 1024)).toFixed(2),
                created: stats.birthtime,
                modified: stats.mtime
            };
        });
        res.status(200).json({
            success: true,
            count: fileList.length,
            data: fileList,
            directory: healthOrdersDir
        });
    } catch (error) {
        console.error('❌ خطأ في قراءة مجلد ملفات العلوم الصحية:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================
// 📊 إحصائيات طلبات العلوم الصحية (للمدير)
// ============================================================

app.get('/api/health-orders/stats', protect, authorize('admin'), async (req, res) => {
    try {
        const baseQuery = {
            $or: [
                { orderType: 'health' },
                { serviceCategory: { $regex: /Clinical|Nursing|Documentation|Reports|Presentations|Health/i, $options: 'i' } }
            ]
        };

        const total = await Order.countDocuments(baseQuery);
        const pending = await Order.countDocuments({ ...baseQuery, status: 'pending' });
        const inProgress = await Order.countDocuments({ ...baseQuery, status: 'in-progress' });
        const completed = await Order.countDocuments({ ...baseQuery, status: 'completed' });
        const revision = await Order.countDocuments({ ...baseQuery, status: 'revision' });
        const cancelled = await Order.countDocuments({ ...baseQuery, status: 'cancelled' });

        // إحصائيات حسب التصنيف
        const categoryStats = await Order.aggregate([
            { $match: baseQuery },
            { $group: { _id: '$serviceCategory', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        // إحصائيات حسب الشهر
        const monthlyStats = await Order.aggregate([
            { $match: baseQuery },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': -1, '_id.month': -1 } },
            { $limit: 12 }
        ]);

        res.status(200).json({
            success: true,
            data: {
                total,
                pending,
                inProgress,
                completed,
                revision,
                cancelled,
                categoryStats,
                monthlyStats
            }
        });
    } catch (error) {
        console.error('❌ خطأ في جلب إحصائيات طلبات العلوم الصحية:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================
// 🔍 البحث والتصفية لطلبات العلوم الصحية (للمدير)
// ============================================================

app.get('/api/health-orders/search', protect, authorize('admin'), async (req, res) => {
    try {
        const { q, status, category, fromDate, toDate } = req.query;
        const query = { 
            $or: [
                { orderType: 'health' },
                { serviceCategory: { $regex: /Clinical|Nursing|Documentation|Reports|Presentations|Health/i, $options: 'i' } }
            ]
        };

        // البحث النصي
        if (q) {
            query.$and = query.$and || [];
            query.$and.push({
                $or: [
                    { name: { $regex: q, $options: 'i' } },
                    { email: { $regex: q, $options: 'i' } },
                    { title: { $regex: q, $options: 'i' } },
                    { description: { $regex: q, $options: 'i' } },
                    { service: { $regex: q, $options: 'i' } },
                    { requestType: { $regex: q, $options: 'i' } },
                    { department: { $regex: q, $options: 'i' } }
                ]
            });
        }

        // تصفية حسب الحالة
        if (status) {
            query.status = status;
        }

        // تصفية حسب التصنيف
        if (category) {
            query.serviceCategory = { $regex: category, $options: 'i' };
        }

        // تصفية حسب التاريخ
        if (fromDate || toDate) {
            query.createdAt = {};
            if (fromDate) query.createdAt.$gte = new Date(fromDate);
            if (toDate) query.createdAt.$lte = new Date(toDate);
        }

        const orders = await Order.find(query).sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            count: orders.length,
            data: orders
        });
    } catch (error) {
        console.error('❌ خطأ في البحث عن طلبات العلوم الصحية:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================
// 📥 تصدير طلبات العلوم الصحية (CSV) (للمدير)
// ============================================================

app.get('/api/health-orders/export/csv', protect, authorize('admin'), async (req, res) => {
    try {
        const orders = await Order.find({ 
            $or: [
                { orderType: 'health' },
                { serviceCategory: { $regex: /Clinical|Nursing|Documentation|Reports|Presentations|Health/i, $options: 'i' } }
            ]
        }).sort({ createdAt: -1 });
        
        // تحويل البيانات إلى CSV
        let csv = 'الرقم,الاسم,البريد الإلكتروني,الهاتف,القسم,الخدمة,نوع الطلب,التصنيف,الحالة,تاريخ التسليم,تاريخ الإنشاء,الملاحظات\n';
        orders.forEach(order => {
            csv += `${order._id},${order.name},${order.email},${order.phone},${order.department || ''},${order.service},${order.requestType},${order.serviceCategory || 'علوم صحية'},${order.status},${order.deliveryDate},${order.createdAt},${order.notes || ''}\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=health-orders-${Date.now()}.csv`);
        res.send(csv);
    } catch (error) {
        console.error('❌ خطأ في تصدير CSV لطلبات العلوم الصحية:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================
// 📊 لوحة تحكم طلبات العلوم الصحية (للمدير)
// ============================================================

app.get('/api/health-orders/dashboard', protect, authorize('admin'), async (req, res) => {
    try {
        // نطاق اليوم
        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0));
        const endOfDay = new Date(today.setHours(23, 59, 59, 999));
        
        // بداية الأسبوع
        const startOfWeek = new Date(today);
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        // بداية الشهر
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        const baseQuery = {
            $or: [
                { orderType: 'health' },
                { serviceCategory: { $regex: /Clinical|Nursing|Documentation|Reports|Presentations|Health/i, $options: 'i' } }
            ]
        };

        // الإحصائيات
        const total = await Order.countDocuments(baseQuery);
        const todayCount = await Order.countDocuments({
            ...baseQuery,
            createdAt: { $gte: startOfDay, $lte: endOfDay }
        });
        const weekCount = await Order.countDocuments({
            ...baseQuery,
            createdAt: { $gte: startOfWeek }
        });
        const monthCount = await Order.countDocuments({
            ...baseQuery,
            createdAt: { $gte: startOfMonth }
        });

        // أحدث الطلبات
        const recentOrders = await Order.find(baseQuery)
            .sort({ createdAt: -1 })
            .limit(10);

        // توزيع الحالات
        const statusDistribution = await Order.aggregate([
            { $match: baseQuery },
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        // توزيع التصنيفات
        const categoryDistribution = await Order.aggregate([
            { $match: baseQuery },
            { $group: { _id: '$serviceCategory', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        res.status(200).json({
            success: true,
            data: {
                totals: {
                    total,
                    today: todayCount,
                    week: weekCount,
                    month: monthCount
                },
                statusDistribution,
                categoryDistribution,
                recentOrders
            }
        });
    } catch (error) {
        console.error('❌ خطأ في جلب لوحة تحكم العلوم الصحية:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================
// 📤 رفع ملفات للطلب
// ============================================================
app.post('/api/orders/:orderId/upload', protect, async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
        }

        if (order.user && order.user.toString() !== req.user.id) {
            if (order.email && order.email !== req.user.email) {
                return res.status(403).json({ success: false, message: 'ليس لديك صلاحية' });
            }
        }

        const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });
        upload.array('files')(req, res, async function(err) {
            if (err) {
                return res.status(500).json({ success: false, message: 'خطأ في رفع الملفات: ' + err.message });
            }

            const uploadedFiles = [];
            if (req.files && req.files.length > 0) {
                for (const file of req.files) {
                    const fileName = `order-${Date.now()}-${Math.round(Math.random() * 10000)}${path.extname(file.originalname)}`;
                    const filePath = path.join(businessOrdersDir, fileName);
                    fs.writeFileSync(filePath, file.buffer);
                    uploadedFiles.push({
                        filename: file.originalname,
                        fileId: fileName,
                        fileSize: file.size,
                        mimeType: file.mimetype,
                        url: `${process.env.BASE_URL || 'https://irteqa.onrender.com'}/uploads/business-orders/${fileName}`,
                        storageProvider: 'local',
                        uploadDate: new Date()
                    });
                }
            }

            if (uploadedFiles.length > 0) {
                order.files = order.files || [];
                order.files.push(...uploadedFiles);
                await order.save();
            }

            res.status(200).json({ success: true, message: `تم رفع ${uploadedFiles.length} ملف بنجاح`, data: { files: uploadedFiles, total: uploadedFiles.length } });
        });

    } catch (error) {
        console.error('❌ خطأ في رفع الملفات:', error);
        res.status(500).json({ success: false, message: error.message || 'حدث خطأ في رفع الملفات' });
    }
});
// ============================================================
// 4.7 مسارات التخصصات (SPECIALTIES) - جديد
// ============================================================

// جلب جميع التخصصات
app.get('/api/specialties', async (req, res) => {
    try {
        const specialties = await Specialty.find()
            .populate('universityId', 'name icon')
            .populate('collegeId', 'name icon')
            .sort({ name: 1 });
        res.status(200).json({ 
            success: true, 
            count: specialties.length, 
            data: specialties 
        });
    } catch (error) {
        console.error('❌ خطأ في جلب التخصصات:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// جلب تخصص محدد
app.get('/api/specialties/:id', async (req, res) => {
    try {
        const specialty = await Specialty.findById(req.params.id)
            .populate('universityId', 'name icon')
            .populate('collegeId', 'name icon');
        
        if (!specialty) {
            return res.status(404).json({ 
                success: false, 
                message: 'التخصص غير موجود' 
            });
        }
        res.status(200).json({ success: true, data: specialty });
    } catch (error) {
        console.error('❌ خطأ في جلب التخصص:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// جلب تخصصات جامعة محددة
app.get('/api/specialties/university/:universityId', async (req, res) => {
    try {
        const specialties = await Specialty.find({ 
            universityId: req.params.universityId 
        }).populate('collegeId', 'name').sort({ name: 1 });
        
        res.status(200).json({ 
            success: true, 
            count: specialties.length, 
            data: specialties 
        });
    } catch (error) {
        console.error('❌ خطأ في جلب تخصصات الجامعة:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// جلب تخصصات كلية محددة
app.get('/api/specialties/college/:collegeId', async (req, res) => {
    try {
        const specialties = await Specialty.find({ 
            collegeId: req.params.collegeId 
        }).populate('universityId', 'name').sort({ name: 1 });
        
        res.status(200).json({ 
            success: true, 
            count: specialties.length, 
            data: specialties 
        });
    } catch (error) {
        console.error('❌ خطأ في جلب تخصصات الكلية:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// إضافة تخصص جديد (للمدير فقط)
app.post('/api/specialties', protect, authorize('admin'), async (req, res) => {
    try {
        const { name, universityId, collegeId, icon, count, description } = req.body;

        if (!name || !universityId || !collegeId) {
            return res.status(400).json({ 
                success: false, 
                message: 'اسم التخصص، معرف الجامعة، ومعرف الكلية مطلوبون' 
            });
        }

        // التحقق من وجود الجامعة
        const university = await University.findById(universityId);
        if (!university) {
            return res.status(404).json({ 
                success: false, 
                message: 'الجامعة غير موجودة' 
            });
        }

        // التحقق من وجود الكلية
        const college = await College.findById(collegeId);
        if (!college) {
            return res.status(404).json({ 
                success: false, 
                message: 'الكلية غير موجودة' 
            });
        }

        // التحقق من عدم وجود تخصص بنفس الاسم لنفس الكلية
        const existingSpecialty = await Specialty.findOne({ 
            name: name.trim(), 
            collegeId: collegeId 
        });
        
        if (existingSpecialty) {
            return res.status(400).json({ 
                success: false, 
                message: 'هذا التخصص موجود بالفعل في هذه الكلية' 
            });
        }

        const specialty = new Specialty({
            name: name.trim(),
            universityId,
            collegeId,
            icon: icon || 'fa-tag',
            count: count || 0,
            description: description || ''
        });

        await specialty.save();

        // تحديث عدد التخصصات في الكلية
        await College.findByIdAndUpdate(collegeId, {
            $inc: { count: 1 }
        });

        // تحديث عدد التخصصات في الجامعة (اختياري)
        // يمكن إضافة حقل count في الجامعة إذا أردت

        res.status(201).json({ 
            success: true, 
            message: 'تم إضافة التخصص بنجاح ✅', 
            data: specialty 
        });

    } catch (error) {
        console.error('❌ خطأ في إضافة التخصص:', error);
        if (error.code === 11000) {
            return res.status(400).json({ 
                success: false, 
                message: 'هذا التخصص موجود بالفعل في هذه الكلية' 
            });
        }
        res.status(500).json({ 
            success: false, 
            message: error.message || 'حدث خطأ في إضافة التخصص' 
        });
    }
});

// حذف تخصص (للمدير فقط)
app.delete('/api/specialties/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const specialty = await Specialty.findById(req.params.id);
        if (!specialty) {
            return res.status(404).json({ 
                success: false, 
                message: 'التخصص غير موجود' 
            });
        }

        // تحديث عدد التخصصات في الكلية
        await College.findByIdAndUpdate(specialty.collegeId, {
            $inc: { count: -1 }
        });

        await specialty.deleteOne();

        res.status(200).json({ 
            success: true, 
            message: 'تم حذف التخصص بنجاح 🗑️' 
        });

    } catch (error) {
        console.error('❌ خطأ في حذف التخصص:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'حدث خطأ في حذف التخصص' 
        });
    }
});
 // ============================================================
// 4.8 مسارات المواد (MATERIALS) - موحد
// ============================================================

// جلب جميع المواد
app.get('/api/explanations/materials', async (req, res) => {
    try {
        const materials = await ExplanationMaterial.find()
            .populate('universityId', 'name icon')
            .populate('collegeId', 'name icon')
            .populate('specialtyId', 'name icon')
            .sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: materials });
    } catch (error) {
        console.error('❌ خطأ في جلب المواد:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// جلب مادة محددة
app.get('/api/explanations/materials/:id', async (req, res) => {
    try {
        const material = await ExplanationMaterial.findById(req.params.id)
            .populate('universityId', 'name icon')
            .populate('collegeId', 'name icon')
            .populate('specialtyId', 'name icon');
        
        if (!material) {
            return res.status(404).json({ 
                success: false, 
                message: 'المادة غير موجودة' 
            });
        }
        res.status(200).json({ success: true, data: material });
    } catch (error) {
        console.error('❌ خطأ في جلب المادة:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// إضافة مادة جديدة (للمدير فقط) - ✅ النسخة الموحدة
app.post('/api/explanations/materials', protect, authorize('admin'), async (req, res) => {
    try {
        const { 
            title, code, instructor, universityId, collegeId, specialtyId,
            icon, description, isFeatured, price, image,
            studentsCount, rating, duration, quizzes, instructorBio, features, units
        } = req.body;

        // ✅ التحقق من جميع الحقول المطلوبة
        if (!title || !code || !instructor || !universityId || !collegeId || !specialtyId) {
            return res.status(400).json({ 
                success: false, 
                message: 'جميع الحقول المطلوبة غير مكتملة' 
            });
        }

        // التحقق من وجود الجامعة
        const university = await University.findById(universityId);
        if (!university) {
            return res.status(404).json({ 
                success: false, 
                message: 'الجامعة غير موجودة' 
            });
        }

        // التحقق من وجود الكلية
        const college = await College.findById(collegeId);
        if (!college) {
            return res.status(404).json({ 
                success: false, 
                message: 'الكلية غير موجودة' 
            });
        }

        // التحقق من وجود التخصص
        const specialty = await Specialty.findById(specialtyId);
        if (!specialty) {
            return res.status(404).json({ 
                success: false, 
                message: 'التخصص غير موجود' 
            });
        }

        const material = new ExplanationMaterial({
            title,
            code,
            instructor,
            universityId,
            collegeId,
            specialtyId,
            icon: icon || 'fa-book',
            description: description || '',
            isFeatured: isFeatured || false,
            price: price || 99,
            image: image || '',
            studentsCount: studentsCount || 0,
            rating: rating || 4.5,
            duration: duration || 0,
            quizzes: quizzes || 0,
            instructorBio: instructorBio || '',
            features: features || [],
            units: units || []
        });

        await material.save();

        // تحديث عدد المواد في التخصص
        await Specialty.findByIdAndUpdate(specialtyId, { 
            $inc: { count: 1 } 
        });

        res.status(201).json({ 
            success: true, 
            message: 'تم إضافة المادة بنجاح', 
            data: material 
        });
    } catch (error) {
        console.error('❌ خطأ في إضافة المادة:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// تحديث مادة (للمدير فقط)
app.put('/api/explanations/materials/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const material = await ExplanationMaterial.findById(req.params.id);
        if (!material) {
            return res.status(404).json({ 
                success: false, 
                message: 'المادة غير موجودة' 
            });
        }

        const updates = req.body;
        Object.keys(updates).forEach(key => {
            if (updates[key] !== undefined) {
                material[key] = updates[key];
            }
        });

        await material.save();
        res.status(200).json({ 
            success: true, 
            message: 'تم تحديث المادة بنجاح', 
            data: material 
        });
    } catch (error) {
        console.error('❌ خطأ في تحديث المادة:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// حذف مادة (للمدير فقط)
app.delete('/api/explanations/materials/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const material = await ExplanationMaterial.findById(req.params.id);
        if (!material) {
            return res.status(404).json({ 
                success: false, 
                message: 'المادة غير موجودة' 
            });
        }

        // تحديث عدد المواد في التخصص
        await Specialty.findByIdAndUpdate(material.specialtyId, {
            $inc: { count: -1 }
        });

        await material.deleteOne();
        res.status(200).json({ 
            success: true, 
            message: 'تم حذف المادة بنجاح 🗑️' 
        });

    } catch (error) {
        console.error('❌ خطأ في حذف المادة:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});
// تحديث مسار جلب المواد
app.get('/api/explanations/materials', async (req, res) => {
    try {
        const materials = await ExplanationMaterial.find()
            .populate('universityId', 'name icon')
            .populate('collegeId', 'name icon')
            .populate('specialtyId', 'name icon')
            .sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: materials });
    } catch (error) {
        console.error('❌ خطأ في جلب المواد:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// جلب مواد تخصص محدد
app.get('/api/explanations/materials/specialty/:specialtyId', async (req, res) => {
    try {
        const materials = await ExplanationMaterial.find({ 
            specialtyId: req.params.specialtyId 
        }).populate('universityId', 'name').populate('collegeId', 'name').sort({ title: 1 });
        
        res.status(200).json({ 
            success: true, 
            count: materials.length, 
            data: materials 
        });
    } catch (error) {
        console.error('❌ خطأ في جلب مواد التخصص:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================
// 4.9 تحديث مسارات الفيديوهات (VIDEOS) لإضافة الربط
// ============================================================

// تحديث مسار رفع الفيديو
app.post('/api/videos/upload', protect, authorize('admin'), async (req, res) => {
    try {
        // ... الكود الموجود لرفع الفيديو ...
        
        // بعد حفظ الفيديو، تأكد من حفظ المعرفات
        const video = new Video({
            title: req.body.title,
            subjectId: req.body.subjectId,
            subjectName: req.body.subjectName || '',
            specialtyName: req.body.specialtyName || '',
            universityName: req.body.universityName || '',
            collegeName: req.body.collegeName || '',
            color: req.body.color || '#7C3AED',
            description: req.body.description || '',
            // ... باقي الحقول
            // ✅ إضافة معرفات الربط
            universityId: req.body.universityId,
            collegeId: req.body.collegeId,
            specialtyId: req.body.specialtyId
        });
        
        await video.save();
        // ... باقي الكود
    } catch (error) {
        // ... معالجة الخطأ
    }
});

// جلب فيديوهات حسب المادة
app.get('/api/videos/material/:materialId', async (req, res) => {
    try {
        const videos = await Video.find({ 
            subjectId: req.params.materialId 
        }).sort({ uploadDate: -1 });
        res.status(200).json({ success: true, count: videos.length, data: videos });
    } catch (error) {
        console.error('❌ خطأ في جلب فيديوهات المادة:', error);
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
            fileData, date: date || new Date().toISOString().split('T')[0],
            downloads: 0, price: price || 49, uploader: req.user.id
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
        res.status(200).json({ success: true, message: 'تم تحميل الملف بنجاح', data: { fileData: summary.fileData, fileName: summary.fileName || 'ملخص.pdf' } });
    } catch (error) {
        console.error('❌ خطأ في تحميل الملخص:', error);
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
            paymentMethod: paymentMethod || 'card', status: 'pending', notes: notes || ''
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
        const subscription = await Subscription.findByIdAndUpdate(req.params.id, { status }, { new: true }).populate('user', 'name email');
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
        res.status(201).json({ success: true, message: 'تم إنشاء الحساب بنجاح', data: { id: user._id, name: user.name, email: user.email, role: user.role } });
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
        res.status(200).json({ success: true, token, user: { id: user._id, name: user.name, email: user.email, role: user.role, isActive: user.isActive } });
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
// 4.9 مسارات الكليات (COLLEGES)
// ============================================================
// ============================================================
// جلب جميع الكليات
// ============================================================
app.get('/api/colleges', async (req, res) => {
    try {
        const colleges = await College.find()
            .populate('universityId', 'name icon')
            .sort({ name: 1 });
        
        // ✅ تحويل البيانات إلى صيغة نظيفة
        const cleanData = colleges.map(col => ({
            _id: col._id,
            name: col.name,
            universityId: col.universityId ? col.universityId._id : null,
            universityName: col.universityId ? col.universityId.name : null,
            icon: col.icon,
            description: col.description,
            createdAt: col.createdAt,
            updatedAt: col.updatedAt
        }));
        
        res.status(200).json({ 
            success: true, 
            count: colleges.length, 
            data: cleanData 
        });
    } catch (error) {
        console.error('❌ خطأ في جلب الكليات:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// جلب كلية محددة
app.get('/api/colleges/:id', async (req, res) => {
    try {
        const college = await College.findById(req.params.id)
            .populate('universityId', 'name icon');
        
        if (!college) {
            return res.status(404).json({ 
                success: false, 
                message: 'الكلية غير موجودة' 
            });
        }
        res.status(200).json({ success: true, data: college });
    } catch (error) {
        console.error('❌ خطأ في جلب الكلية:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// جلب كليات جامعة محددة
app.get('/api/colleges/university/:universityId', async (req, res) => {
    try {
        const colleges = await College.find({ 
            universityId: req.params.universityId 
        }).sort({ name: 1 });
        
        res.status(200).json({ 
            success: true, 
            count: colleges.length, 
            data: colleges 
        });
    } catch (error) {
        console.error('❌ خطأ في جلب كليات الجامعة:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});
// ============================================================
// إضافة كلية جديدة (للمدير فقط)
// ============================================================
app.post('/api/colleges', protect, authorize('admin'), async (req, res) => {
    try {
        const { name, universityId, icon, description } = req.body;

        console.log('📥 استلام طلب إضافة كلية:', { name, universityId, icon, description });

        // ✅ التحقق من الحقول المطلوبة
        if (!name || !universityId) {
            return res.status(400).json({ 
                success: false, 
                message: 'اسم الكلية ومعرف الجامعة مطلوبان' 
            });
        }

        // ✅ التأكد من أن universityId هو معرف صحيح
        let uniId = universityId;
        if (typeof universityId === 'object' && universityId._id) {
            uniId = universityId._id;
        }

        // ✅ التحقق من وجود الجامعة
        const university = await University.findById(uniId);
        if (!university) {
            return res.status(404).json({ 
                success: false, 
                message: 'الجامعة غير موجودة' 
            });
        }

        // ✅ التحقق من عدم وجود كلية بنفس الاسم لنفس الجامعة
        const existingCollege = await College.findOne({ 
            name: name.trim(), 
            universityId: uniId 
        });
        
        if (existingCollege) {
            return res.status(400).json({ 
                success: false, 
                message: 'هذه الكلية موجودة بالفعل في هذه الجامعة' 
            });
        }

        const college = new College({
            name: name.trim(),
            universityId: uniId,
            icon: icon || 'fa-school',
            description: description || ''
        });

        await college.save();

        // ✅ إعادة الكلية مع populate
        const populatedCollege = await College.findById(college._id)
            .populate('universityId', 'name icon');

        res.status(201).json({ 
            success: true, 
            message: 'تم إضافة الكلية بنجاح ✅', 
            data: populatedCollege 
        });

    } catch (error) {
        console.error('❌ خطأ في إضافة الكلية:', error);
        if (error.code === 11000) {
            return res.status(400).json({ 
                success: false, 
                message: 'هذه الكلية موجودة بالفعل في هذه الجامعة' 
            });
        }
        res.status(500).json({ 
            success: false, 
            message: error.message || 'حدث خطأ في إضافة الكلية' 
        });
    }
});

// تحديث كلية (للمدير فقط)
app.put('/api/colleges/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const { name, icon, count, description, universityId } = req.body;
        const college = await College.findById(req.params.id);

        if (!college) {
            return res.status(404).json({ 
                success: false, 
                message: 'الكلية غير موجودة' 
            });
        }

        // إذا تم تغيير الجامعة، تحديث العدادات
        if (universityId && universityId !== college.universityId.toString()) {
            // تقليل عدد الكليات في الجامعة القديمة
            await University.findByIdAndUpdate(college.universityId, {
                $inc: { count: -1 }
            });
            
            // زيادة عدد الكليات في الجامعة الجديدة
            await University.findByIdAndUpdate(universityId, {
                $inc: { count: 1 }
            });
        }

        // تحديث الحقول
        if (name) college.name = name.trim();
        if (icon) college.icon = icon;
        if (count !== undefined) college.count = count;
        if (description !== undefined) college.description = description;
        if (universityId) college.universityId = universityId;

        await college.save();

        res.status(200).json({ 
            success: true, 
            message: 'تم تحديث الكلية بنجاح ✅', 
            data: college 
        });

    } catch (error) {
        console.error('❌ خطأ في تحديث الكلية:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'حدث خطأ في تحديث الكلية' 
        });
    }
});

// حذف كلية (للمدير فقط)
app.delete('/api/colleges/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const college = await College.findById(req.params.id);

        if (!college) {
            return res.status(404).json({ 
                success: false, 
                message: 'الكلية غير موجودة' 
            });
        }

        // تحديث عدد الكليات في الجامعة
        await University.findByIdAndUpdate(college.universityId, {
            $inc: { count: -1 }
        });

        // حذف الكلية
        await college.deleteOne();

        res.status(200).json({ 
            success: true, 
            message: 'تم حذف الكلية بنجاح 🗑️' 
        });

    } catch (error) {
        console.error('❌ خطأ في حذف الكلية:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'حدث خطأ في حذف الكلية' 
        });
    }
});

// ============================================================
// 📊 إحصائيات الكليات (للمدير)
// ============================================================

app.get('/api/colleges/stats', protect, authorize('admin'), async (req, res) => {
    try {
        const total = await College.countDocuments();
        const byUniversity = await College.aggregate([
            {
                $group: {
                    _id: '$universityId',
                    count: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: 'universities',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'university'
                }
            },
            {
                $unwind: '$university'
            },
            {
                $project: {
                    universityName: '$university.name',
                    count: 1
                }
            },
            { $sort: { count: -1 } }
        ]);

        res.status(200).json({
            success: true,
            data: {
                total,
                byUniversity
            }
        });
    } catch (error) {
        console.error('❌ خطأ في جلب إحصائيات الكليات:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================
// 🔍 البحث في الكليات (للمدير)
// ============================================================

app.get('/api/colleges/search', protect, authorize('admin'), async (req, res) => {
    try {
        const { q, universityId } = req.query;
        const query = {};

        if (q) {
            query.$or = [
                { name: { $regex: q, $options: 'i' } },
                { description: { $regex: q, $options: 'i' } }
            ];
        }

        if (universityId) {
            query.universityId = universityId;
        }

        const colleges = await College.find(query)
            .populate('universityId', 'name icon')
            .sort({ name: 1 });

        res.status(200).json({
            success: true,
            count: colleges.length,
            data: colleges
        });
    } catch (error) {
        console.error('❌ خطأ في البحث عن الكليات:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});
// ============================================================
// 🗨️ مسارات الدردشة (Chat Routes)
// ============================================================

app.get('/api/chat/conversations', protect, async (req, res) => {
    try {
        const userId = req.user.id;
        const conversations = await Conversation.find({ participants: userId })
            .populate('participants', 'name email role avatar')
            .populate('lastMessage')
            .sort({ updatedAt: -1 });

        const formattedConversations = conversations.map(conv => {
            const otherUser = conv.participants.find(p => p._id.toString() !== userId);
            const unreadCount = conv.messages ? conv.messages.filter(m => m.senderId.toString() !== userId && !m.read).length : 0;
            return {
                id: conv._id,
                otherUser: otherUser ? { id: otherUser._id, name: otherUser.name, email: otherUser.email, role: otherUser.role, avatar: otherUser.avatar || otherUser.name.charAt(0) } : null,
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

app.post('/api/chat/conversations', protect, async (req, res) => {
    try {
        const { userId } = req.body;
        const senderId = req.user.id;
        let targetUserId = userId;

        if (userId === 'admin') {
            const admin = await User.findOne({ role: 'admin', isActive: true });
            if (!admin) {
                return res.status(404).json({ success: false, message: 'لا يوجد مدير متاح للمراسلة حالياً' });
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

        const existingConversation = await Conversation.findOne({ participants: { $all: [senderId, targetUserId] } });
        if (existingConversation) {
            return res.status(200).json({ success: true, data: existingConversation, message: 'المحادثة موجودة بالفعل' });
        }

        const conversation = new Conversation({ participants: [senderId, targetUserId], createdBy: senderId, type: 'direct' });
        await conversation.save();

        const populatedConv = await Conversation.findById(conversation._id).populate('participants', 'name email role avatar');
        res.status(201).json({ success: true, data: populatedConv, message: 'تم إنشاء المحادثة بنجاح' });
    } catch (error) {
        console.error('❌ خطأ في إنشاء المحادثة:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

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
        const messages = await Message.find({ conversationId: id }).populate('senderId', 'name email role avatar').sort({ createdAt: 1 });
        await Message.updateMany({ conversationId: id, senderId: { $ne: userId }, read: false }, { read: true });
        await Conversation.findByIdAndUpdate(id, { $set: { unreadCount: 0 } });
        const formattedMessages = messages.map(msg => ({
            id: msg._id, senderId: msg.senderId._id, senderName: msg.senderId.name,
            senderRole: msg.senderId.role, text: msg.text, file: msg.file || null,
            read: msg.read, createdAt: msg.createdAt, updatedAt: msg.updatedAt
        }));
        res.status(200).json({ success: true, data: formattedMessages });
    } catch (error) {
        console.error('❌ خطأ في جلب الرسائل:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/chat/messages', protect, async (req, res) => {
    try {
        const { conversationId, text, file } = req.body;
        const senderId = req.user.id;

        if (!conversationId || !text) {
            return res.status(400).json({ success: false, message: 'معرف المحادثة والنص مطلوبان' });
        }

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return res.status(404).json({ success: false, message: 'المحادثة غير موجودة' });
        }
        if (!conversation.participants.includes(senderId)) {
            return res.status(403).json({ success: false, message: 'ليس لديك صلاحية لإرسال رسالة' });
        }

        let fileData = null;
        if (file && file.fileId) {
            const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
            fileData = { name: file.name, type: file.type, size: file.size, path: `/api/chat/files/${file.fileId}`, url: `${baseUrl}/api/chat/files/${file.fileId}`, fileId: file.fileId, storageProvider: 'gridfs' };
        } else if (file && file.data) {
            try {
                let base64Data = file.data;
                if (base64Data.includes(';base64,')) {
                    base64Data = base64Data.split(';base64,').pop();
                }
                const buffer = Buffer.from(base64Data, 'base64');
                const tempFile = { buffer: buffer, originalname: file.name || 'file', mimetype: file.type || 'application/octet-stream', size: file.size || buffer.length };
                const result = await uploadToGridFS(tempFile, { type: 'chat_file', conversationId: conversationId, senderId: senderId });
                if (result) {
                    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
                    fileData = { name: file.name, type: file.type, size: file.size, path: `/api/chat/files/${result.fileId}`, url: `${baseUrl}/api/chat/files/${result.fileId}`, fileId: result.fileId, storageProvider: 'gridfs' };
                }
            } catch (error) {
                console.error('❌ خطأ في رفع الملف:', error);
            }
        }

        const message = new Message({ conversationId: conversationId, senderId: senderId, text: text, file: fileData, read: false });
        await message.save();
        await Conversation.findByIdAndUpdate(conversationId, { lastMessage: message._id, updatedAt: new Date(), $inc: { unreadCount: 1 } });
        const populatedMessage = await Message.findById(message._id).populate('senderId', 'name email role avatar');

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

        res.status(201).json({ success: true, data: { id: populatedMessage._id, senderId: populatedMessage.senderId._id, senderName: populatedMessage.senderId.name, senderRole: populatedMessage.senderId.role, text: populatedMessage.text, file: populatedMessage.file || null, createdAt: populatedMessage.createdAt }, message: 'تم إرسال الرسالة بنجاح' });
    } catch (error) {
        console.error('❌ خطأ في إرسال الرسالة:', error);
        res.status(500).json({ success: false, message: error.message || 'حدث خطأ في إرسال الرسالة' });
    }
});

app.get('/api/chat/clients', protect, authorize('admin'), async (req, res) => {
    try {
        const users = await User.find({ role: { $in: ['user', 'client', 'expert'] }, isActive: true }).select('_id name email role avatar isActive createdAt').sort({ name: 1 });
        const usersWithLastMessage = await Promise.all(users.map(async (user) => {
            const conversation = await Conversation.findOne({ participants: { $all: [req.user.id, user._id] } }).populate('lastMessage').sort({ updatedAt: -1 });
            const roleLabels = { 'user': 'مستخدم', 'client': 'عميل', 'expert': 'خبير' };
            return {
                id: user._id, name: user.name, email: user.email,
                role: user.role, roleLabel: roleLabels[user.role] || user.role,
                avatar: user.avatar || user.name.charAt(0), isActive: user.isActive,
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
// مسار الصحة
// ============================================================
app.get('/api/health', (req, res) => {
    res.status(200).json({ success: true, message: 'الخادم يعمل بشكل صحيح 🚀', uptime: process.uptime(), timestamp: new Date().toISOString(), storage: 'GridFS (MongoDB)' });
});

// ============================================================
// 🔌 WebSocket للدردشة الفورية
// ============================================================

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const connections = { clients: new Map(), admins: new Map(), experts: new Map(), all: new Set() };

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
    
    if (role === 'admin') connections.admins.set(userId, ws);
    else if (role === 'expert') connections.experts.set(userId, ws);
    else connections.clients.set(userId, ws);

    sendUserConversations(ws, userId);
    broadcastToAdmins({ type: 'user_online', userId, userName: 'مستخدم', role, timestamp: new Date().toISOString() });

    ws.on('message', async function(message) {
        try {
            const data = JSON.parse(message);
            switch(data.type) {
                case 'auth': ws.send(JSON.stringify({ type: 'auth_confirm', userId, role })); break;
                case 'new_message': await handleNewMessage(ws, data, userId, role); break;
                case 'read': await handleReadMessages(ws, data, userId); break;
                case 'typing': broadcastToConversationParticipants(data.conversationId, userId, { type: 'typing', userId, userName: data.userName || 'مستخدم', isTyping: data.isTyping }); break;
                case 'heartbeat': ws.send(JSON.stringify({ type: 'heartbeat_ack', timestamp: new Date().toISOString() })); break;
                default: console.log('📩 نوع رسالة غير معروف:', data.type);
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
        broadcastToAdmins({ type: 'user_offline', userId, userName: 'مستخدم', timestamp: new Date().toISOString() });
    });

    ws.on('error', function(error) {
        console.error(`❌ خطأ في WebSocket للمستخدم ${userId}:`, error);
    });
});

function sendToUser(userId, data) {
    let ws = connections.clients.get(userId) || connections.admins.get(userId) || connections.experts.get(userId);
    if (ws && ws.readyState === WebSocket.OPEN) { ws.send(JSON.stringify(data)); return true; }
    return false;
}

function broadcastToAdmins(data) {
    connections.admins.forEach((ws) => { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data)); });
}

function broadcastToConversation(conversationId, senderId, data) {
    Conversation.findById(conversationId).then(conversation => {
        if (!conversation) return;
        conversation.participants.forEach(participantId => {
            if (participantId.toString() !== senderId) sendToUser(participantId.toString(), data);
        });
    }).catch(error => console.error('❌ خطأ في إرسال إلى المحادثة:', error));
}

function broadcastToConversationParticipants(conversationId, senderId, data) {
    Conversation.findById(conversationId).then(conversation => {
        if (!conversation) return;
        conversation.participants.forEach(participantId => {
            if (participantId.toString() !== senderId) sendToUser(participantId.toString(), data);
        });
    }).catch(error => console.error('❌ خطأ:', error));
}

async function sendUserConversations(ws, userId) {
    try {
        const conversations = await Conversation.find({ participants: userId }).populate('participants', 'name email role avatar').populate('lastMessage').sort({ updatedAt: -1 });
        const formatted = conversations.map(conv => {
            const otherUser = conv.participants.find(p => p._id.toString() !== userId);
            return {
                id: conv._id,
                otherUser: otherUser ? { id: otherUser._id, name: otherUser.name, role: otherUser.role, avatar: otherUser.avatar || otherUser.name.charAt(0) } : null,
                lastMessage: conv.lastMessage ? conv.lastMessage.text : 'لا توجد رسائل',
                lastMessageTime: conv.lastMessage ? conv.lastMessage.createdAt : conv.updatedAt,
                unreadCount: conv.unreadCount || 0, createdAt: conv.createdAt
            };
        });
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'conversations', data: formatted }));
    } catch (error) { console.error('❌ خطأ في إرسال المحادثات:', error); }
}

async function handleNewMessage(ws, data, userId, role) {
    try {
        const { conversationId, text, file } = data;
        if (!conversationId || !text) { ws.send(JSON.stringify({ type: 'error', message: 'معرف المحادثة والنص مطلوبان' })); return; }
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) { ws.send(JSON.stringify({ type: 'error', message: 'المحادثة غير موجودة' })); return; }
        if (!conversation.participants.includes(userId)) { ws.send(JSON.stringify({ type: 'error', message: 'ليس لديك صلاحية' })); return; }

        let fileData = null;
        if (file) {
            try {
                let base64Data = file.data;
                if (base64Data.includes(';base64,')) base64Data = base64Data.split(';base64,').pop();
                const buffer = Buffer.from(base64Data, 'base64');
                const tempFile = { buffer, originalname: file.name || 'file', mimetype: file.type || 'application/octet-stream', size: file.size || buffer.length };
                const result = await uploadToGridFS(tempFile, { type: 'chat_file_ws', conversationId, senderId: userId });
                if (result) {
                    const baseUrl = process.env.BASE_URL || 'https://irteqa.onrender.com';
                    fileData = { name: file.name, type: file.type || 'application/octet-stream', size: file.size || buffer.length, path: `/api/chat/files/${result.fileId}`, url: `${baseUrl}/api/chat/files/${result.fileId}`, fileId: result.fileId, storageProvider: 'gridfs', gridfsId: result.id };
                }
            } catch (error) { console.error('❌ خطأ في رفع ملف WebSocket:', error); }
        }

        const message = new Message({ conversationId, senderId: userId, text, file: fileData, read: false });
        await message.save();
        await Conversation.findByIdAndUpdate(conversationId, { lastMessage: message._id, updatedAt: new Date(), $inc: { unreadCount: 1 } });
        const populatedMessage = await Message.findById(message._id).populate('senderId', 'name email role avatar');

        ws.send(JSON.stringify({ type: 'message_sent', message: { id: populatedMessage._id, senderId: populatedMessage.senderId._id, senderName: populatedMessage.senderId.name, text: populatedMessage.text, file: populatedMessage.file || null, createdAt: populatedMessage.createdAt } }));

        const wsData = { type: 'new_message', conversationId, message: { id: populatedMessage._id, senderId: populatedMessage.senderId._id, senderName: populatedMessage.senderId.name, senderRole: populatedMessage.senderId.role, text: populatedMessage.text, file: populatedMessage.file || null, createdAt: populatedMessage.createdAt } };
        conversation.participants.forEach(participantId => {
            if (participantId.toString() !== userId) sendToUser(participantId.toString(), wsData);
        });

        if (role === 'client') {
            broadcastToAdmins({ type: 'notification', userId, userName: populatedMessage.senderId.name || 'عميل', message: text, conversationId, timestamp: new Date().toISOString() });
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
        await Message.updateMany({ conversationId, senderId: { $ne: userId }, read: false }, { read: true });
        await Conversation.findByIdAndUpdate(conversationId, { $set: { unreadCount: 0 } });
        const conversation = await Conversation.findById(conversationId);
        if (conversation) {
            conversation.participants.forEach(participantId => {
                if (participantId.toString() !== userId) sendToUser(participantId.toString(), { type: 'messages_read', conversationId, readBy: userId });
            });
        }
    } catch (error) { console.error('❌ خطأ في تحديث القراءة:', error); }
}

// ============================================================
// معالجة 404
// ============================================================
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'المسار المطلوب غير موجود', path: req.originalUrl });
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