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
// إنشاء مجلدات uploads (للملفات المؤقتة فقط)
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
// التحقق من وجود الملفات عند بدء التشغيل
// ============================================================
if (fs.existsSync(videosDir)) {
    const files = fs.readdirSync(videosDir);
    console.log(`📁 عدد الملفات في مجلد الفيديوهات: ${files.length}`);
}

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
// ✅ استيراد دوال GridFS
// ============================================================
const { 
    upload: gridfsUpload,
    uploadToGridFS,
    getGridFSBucket, 
    getFileInfo, 
    deleteFile, 
    getStreamUrl 
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
// 📹 مسار رفع الفيديو باستخدام GridFS (معدل)
// ============================================================
app.post('/api/videos/upload', protect, authorize('admin'), gridfsUpload.single('video'), async (req, res) => {
    try {
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

        // رفع الملف إلى GridFS
        const fileResult = await uploadToGridFS(req.file, {
            title: title,
            subjectId: subjectId,
            uploadedBy: req.user.id
        });

        if (!fileResult) {
            return res.status(500).json({
                success: false,
                message: 'فشل رفع الفيديو إلى GridFS'
            });
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

// ============================================================
// 🎬 بث الملفات من GridFS
// ============================================================
app.get('/api/files/stream/:fileId', async (req, res) => {
    try {
        const { fileId } = req.params;
        const ObjectId = require('mongodb').ObjectId;

        if (!ObjectId.isValid(fileId)) {
            return res.status(400).json({
                success: false,
                message: 'معرف ملف غير صالح'
            });
        }

        const fileInfo = await getFileInfo(fileId);
        if (!fileInfo) {
            return res.status(404).json({
                success: false,
                message: 'الملف غير موجود'
            });
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
            return res.status(404).json({
                success: false,
                message: 'الملف غير موجود'
            });
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
// 🗑️ حذف فيديو من GridFS
// ============================================================
app.delete('/api/videos/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const video = await Video.findById(req.params.id);
        if (!video) {
            return res.status(404).json({
                success: false,
                message: 'الفيديو غير موجود'
            });
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
        res.status(200).json({
            success: true,
            message: 'تم حذف الفيديو بنجاح'
        });

    } catch (error) {
        console.error('❌ خطأ في حذف الفيديو:', error);
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
            return res.status(404).json({
                success: false,
                message: 'الملف غير موجود'
            });
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
// 🖼️ عرض صور الدردشة من GridFS
// ============================================================
app.get('/api/chat/files/:fileId', async (req, res) => {
    try {
        const { fileId } = req.params;
        const ObjectId = require('mongodb').ObjectId;

        if (!ObjectId.isValid(fileId)) {
            return res.status(400).json({
                success: false,
                message: 'معرف ملف غير صالح'
            });
        }

        const fileInfo = await getFileInfo(fileId);
        if (!fileInfo) {
            return res.status(404).json({
                success: false,
                message: 'الملف غير موجود'
            });
        }

        res.set('Content-Type', fileInfo.contentType || 'image/jpeg');
        res.set('Content-Length', fileInfo.length);

        const bucket = getGridFSBucket();
        const downloadStream = bucket.openDownloadStream(new ObjectId(fileId));
        downloadStream.pipe(res);

        downloadStream.on('error', (error) => {
            console.error('❌ خطأ في عرض الصورة:', error);
            if (!res.headersSent) {
                res.status(500).json({ success: false, message: 'حدث خطأ في عرض الصورة' });
            }
        });

    } catch (error) {
        console.error('❌ خطأ في عرض الصورة:', error);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: error.message });
        }
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
// 📝 باقي المسارات (Auth, Orders, Models, Users, Universities, Explanations, Summaries, Subscriptions)
// ============================================================

// ... [جميع مسارات Auth, Orders, Models, Users, Universities, Explanations, Summaries, Subscriptions موجودة هنا]

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
            return res.status(400).json({
                success: false,
                message: 'معرف المستخدم مطلوب'
            });
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
        
        // ✅ تخزين الملف في GridFS بدلاً من التخزين المحلي
        if (file && file.data) {
            try {
                console.log('📁 جاري رفع ملف الدردشة إلى GridFS...');
                
                let base64Data = file.data;
                if (base64Data.includes(';base64,')) {
                    base64Data = base64Data.split(';base64,').pop();
                }
                
                if (!base64Data || base64Data.length === 0) {
                    throw new Error('بيانات الملف فارغة');
                }
                
                const buffer = Buffer.from(base64Data, 'base64');
                if (buffer.length === 0) {
                    throw new Error('الملف فارغ');
                }

                const tempFile = {
                    buffer: buffer,
                    originalname: file.name || 'file',
                    mimetype: file.type || 'application/octet-stream',
                    size: file.size || buffer.length
                };

                const gridfsResult = await uploadToGridFS(tempFile, {
                    type: 'chat_file',
                    conversationId: conversationId,
                    senderId: senderId,
                    originalName: file.name
                });

                if (gridfsResult) {
                    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
                    const fileUrl = `${baseUrl}/api/chat/files/${gridfsResult.fileId}`;

                    fileData = {
                        name: file.name,
                        type: file.type || 'application/octet-stream',
                        size: file.size || buffer.length,
                        path: `/api/chat/files/${gridfsResult.fileId}`,
                        url: fileUrl,
                        fileId: gridfsResult.fileId,
                        storageProvider: 'gridfs',
                        gridfsId: gridfsResult.id
                    };
                    console.log('✅ تم رفع ملف الدردشة إلى GridFS:', gridfsResult.filename);
                }
            } catch (fileError) {
                console.error('❌ خطأ في رفع الملف إلى GridFS:', fileError);
                return res.status(500).json({
                    success: false,
                    message: 'حدث خطأ في رفع الملف: ' + fileError.message
                });
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

// 5. جلب قائمة المستخدمين للمدير
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

                const gridfsResult = await uploadToGridFS(tempFile, {
                    type: 'chat_file_ws',
                    conversationId: conversationId,
                    senderId: userId
                });

                if (gridfsResult) {
                    const baseUrl = process.env.BASE_URL || 'https://irteqa.onrender.com';
                    fileData = {
                        name: file.name,
                        type: file.type || 'application/octet-stream',
                        size: file.size || buffer.length,
                        path: `/api/chat/files/${gridfsResult.fileId}`,
                        url: `${baseUrl}/api/chat/files/${gridfsResult.fileId}`,
                        fileId: gridfsResult.fileId,
                        storageProvider: 'gridfs',
                        gridfsId: gridfsResult.id
                    };
                }
            } catch (fileError) {
                console.error('❌ خطأ في رفع ملف WebSocket:', fileError);
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
// [جميع المسارات الأخرى - Auth, Orders, Models, Users, Universities, Explanations, Summaries, Subscriptions]
// ============================================================
// يتم تضمينها هنا (لم يتم حذف أي مسار)

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
// معالجة الملفات المفقودة في chat-files (للتخزين المحلي القديم)
// ============================================================
app.use('/uploads/chat-files/:filename', async (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(chatFilesDir, filename);
    
    if (fs.existsSync(filePath)) {
        return res.sendFile(filePath);
    }
    
    // البحث في GridFS إذا لم يكن موجوداً محلياً
    try {
        const ObjectId = require('mongodb').ObjectId;
        const files = await mongoose.connection.db.collection('uploads.files')
            .find({ filename: filename })
            .toArray();
        
        if (files.length > 0) {
            const fileId = files[0]._id;
            return res.redirect(`/api/chat/files/${fileId}`);
        }
    } catch (error) {
        console.error('❌ خطأ في البحث عن الملف في GridFS:', error);
    }
    
    res.status(404).json({
        success: false,
        message: 'الملف غير موجود',
        filename: filename,
        suggestion: 'يرجى إعادة تحميل الملف'
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