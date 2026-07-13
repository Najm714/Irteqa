// backend/server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const WebSocket = require('ws');
const http = require('http'); // ✅ أضف هذا مع باقي الـ imports

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
app.use('/uploads/chat-files', express.static(path.join(__dirname, 'uploads', 'chat-files')));

// ============================================================
// إنشاء مجلدات uploads
// ============================================================
const uploadsDir = path.join(__dirname, 'uploads');
const videosDir = path.join(uploadsDir, 'videos');
const ordersDir = path.join(uploadsDir, 'orders');
const summariesDir = path.join(uploadsDir, 'summaries');
const businessOrdersDir = path.join(uploadsDir, 'business-orders');
const chatFilesDir = path.join(uploadsDir, 'chat-files'); // ✅ أضف هذا


// ✅ إنشاء جميع المجلدات
const dirs = [
    { path: uploadsDir, name: 'uploads' },
    { path: videosDir, name: 'videos' },
    { path: ordersDir, name: 'orders' },
    { path: summariesDir, name: 'summaries' },
    { path: businessOrdersDir, name: 'business-orders' },
    { path: chatFilesDir, name: 'chat-files' } // ✅ أضف هذا
];

dirs.forEach(dir => {
    if (!fs.existsSync(dir.path)) {
        fs.mkdirSync(dir.path, { recursive: true });
        console.log(`📁 تم إنشاء مجلد ${dir.name}`);
    } else {
        console.log(`📁 مجلد ${dir.name} موجود بالفعل`);
    }
});

// ✅ التحقق من صلاحيات مجلد chat-files
try {
    fs.accessSync(chatFilesDir, fs.constants.W_OK);
    console.log('✅ مجلد chat-files قابل للكتابة');
} catch (err) {
    console.error('❌ مجلد chat-files غير قابل للكتابة:', err);
}

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('📁 تم إنشاء مجلد uploads');
}
if (!fs.existsSync(videosDir)) {
    fs.mkdirSync(videosDir, { recursive: true });
    console.log('📁 تم إنشاء مجلد videos');
}
if (!fs.existsSync(ordersDir)) {
    fs.mkdirSync(ordersDir, { recursive: true });
    console.log('📁 تم إنشاء مجلد orders');
}
if (!fs.existsSync(summariesDir)) {
    fs.mkdirSync(summariesDir, { recursive: true });
    console.log('📁 تم إنشاء مجلد summaries');
}
if (!fs.existsSync(businessOrdersDir)) {
    fs.mkdirSync(businessOrdersDir, { recursive: true });
    console.log('📁 تم إنشاء مجلد business-orders');
}

console.log('📁 مسار uploads:', uploadsDir);
console.log('📁 مسار videos:', videosDir);
console.log('📁 مسار summaries:', summariesDir);
console.log('📁 مسار chat-files:', chatFilesDir);

// ============================================================
// خدمة الملفات الثابتة (Uploads)
// ============================================================
app.use('/uploads', express.static(uploadsDir));
app.use('/uploads/videos', express.static(videosDir));
app.use('/uploads/orders', express.static(ordersDir));
app.use('/uploads/summaries', express.static(summariesDir));
app.use('/uploads/business-orders', express.static(businessOrdersDir));
app.use('/uploads/chat-files', express.static(chatFilesDir));


// ============================================================
// مسار مباشر للفيديوهات (حل بديل)
// ============================================================
app.get('/uploads/videos/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(videosDir, filename);
    
    console.log('📁 محاولة تحميل:', filePath);
    
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        const altPath = path.join(__dirname, '../uploads/videos', filename);
        console.log('📁 محاولة بديلة:', altPath);
        
        if (fs.existsSync(altPath)) {
            res.sendFile(altPath);
        } else {
            console.error('❌ الملف غير موجود:', filename);
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
    console.log('📁 محتويات مجلد الفيديوهات:', files);
    console.log(`📁 عدد الملفات: ${files.length}`);
} else {
    console.log('⚠️ مجلد الفيديوهات غير موجود');
}

// ============================================================
// الاتصال بقاعدة البيانات
// ============================================================
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/draseh_platform';

mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ تم الاتصال بقاعدة البيانات بنجاح'))
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
// المسار الرئيسي
// ============================================================
app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: '🚀 مرحباً بك في منصة ارتقاء - الخادم يعمل بنجاح!',
        version: '1.0.0',
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
            time: new Date().toISOString()
        }
    });
});


// ============================================================
// ============================================================
// 🗨️ مسارات الدردشة (Chat Routes)
// ============================================================
// ============================================================

// ============================================================
// 1. جلب جميع المحادثات للمستخدم
// ============================================================
app.get('/api/chat/conversations', protect, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // جلب المحادثات التي يشارك فيها المستخدم
        const conversations = await Conversation.find({
            participants: userId
        })
        .populate('participants', 'name email role avatar')
        .populate('lastMessage')
        .sort({ updatedAt: -1 });

        // تنسيق البيانات
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

        res.status(200).json({
            success: true,
            data: formattedConversations
        });

    } catch (error) {
        console.error('❌ خطأ في جلب المحادثات:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});
 // 2. إنشاء محادثة جديدة
app.post('/api/chat/conversations', protect, async (req, res) => {
    try {
        const { userId, userRole } = req.body;
        const senderId = req.user.id;

        let targetUserId = userId;

        // ✅ إذا كان userId = 'admin'، نبحث عن أول مدير نشط
        if (userId === 'admin') {
            const admin = await User.findOne({ 
                role: 'admin', 
                isActive: true 
            });
            
            if (!admin) {
                // إذا لم يوجد مدير، نبحث عن أي مستخدم لديه صلاحيات إدارية
                const anyAdmin = await User.findOne({ 
                    role: { $in: ['admin', 'expert'] },
                    isActive: true 
                });
                
                if (!anyAdmin) {
                    return res.status(404).json({
                        success: false,
                        message: 'لا يوجد مدير متاح للمراسلة حالياً'
                    });
                }
                targetUserId = anyAdmin._id;
            } else {
                targetUserId = admin._id;
            }
        }

        if (!targetUserId) {
            return res.status(400).json({
                success: false,
                message: 'معرف المستخدم مطلوب'
            });
        }

        // التحقق من وجود المستخدم
        const targetUser = await User.findById(targetUserId);
        if (!targetUser) {
            return res.status(404).json({
                success: false,
                message: 'المستخدم غير موجود'
            });
        }

        // التحقق من وجود محادثة سابقة
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

        // إنشاء محادثة جديدة
        const conversation = new Conversation({
            participants: [senderId, targetUserId],
            createdBy: senderId,
            type: 'direct'
        });

        await conversation.save();

        // جلب المحادثة مع بيانات المشاركين
        const populatedConv = await Conversation.findById(conversation._id)
            .populate('participants', 'name email role avatar');

        res.status(201).json({
            success: true,
            data: populatedConv,
            message: 'تم إنشاء المحادثة بنجاح'
        });

    } catch (error) {
        console.error('❌ خطأ في إنشاء المحادثة:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================================
// 3. جلب رسائل محادثة معينة
// ============================================================
app.get('/api/chat/conversations/:id/messages', protect, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // التحقق من وجود المحادثة
        const conversation = await Conversation.findById(id);
        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: 'المحادثة غير موجودة'
            });
        }

        // التحقق من أن المستخدم مشارك في المحادثة
        if (!conversation.participants.includes(userId)) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية لعرض هذه المحادثة'
            });
        }

        // جلب الرسائل
        const messages = await Message.find({ conversationId: id })
            .populate('senderId', 'name email role avatar')
            .sort({ createdAt: 1 });

        // تحديث الرسائل غير المقروءة
        await Message.updateMany(
            { 
                conversationId: id, 
                senderId: { $ne: userId },
                read: false 
            },
            { read: true }
        );

        // تحديث عدد الرسائل غير المقروءة في المحادثة
        await Conversation.findByIdAndUpdate(id, {
            $set: { unreadCount: 0 }
        });

        // تنسيق الرسائل
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

        res.status(200).json({
            success: true,
            data: formattedMessages
        });

    } catch (error) {
        console.error('❌ خطأ في جلب الرسائل:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});
 // 4. إرسال رسالة جديدة - مع مسار ملف صحيح
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
            return res.status(404).json({
                success: false,
                message: 'المحادثة غير موجودة'
            });
        }

        if (!conversation.participants.includes(senderId)) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية لإرسال رسالة في هذه المحادثة'
            });
        }

        let fileData = null;
        
        if (file && file.data) {
            try {
                // ✅ التأكد من وجود مجلد chat-files
                if (!fs.existsSync(chatFilesDir)) {
                    fs.mkdirSync(chatFilesDir, { recursive: true });
                    console.log('📁 تم إنشاء مجلد chat-files');
                }

                // ✅ تنظيف اسم الملف
                const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
                const fileName = `chat_${Date.now()}_${cleanName}`;
                const filePath = path.join(chatFilesDir, fileName);
                
                // ✅ استخراج البيانات من Base64
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

                // ✅ حفظ الملف
                fs.writeFileSync(filePath, buffer);
                console.log(`✅ تم حفظ الملف: ${fileName} (${(buffer.length / 1024).toFixed(1)} KB)`);

                // ✅ بناء URL الملف (مسار كامل)
                const baseUrl = req.protocol + '://' + req.get('host');
                const fileUrl = `${baseUrl}/uploads/chat-files/${fileName}`;

                fileData = {
                    name: file.name,
                    type: file.type || 'application/octet-stream',
                    size: file.size || buffer.length,
                    path: `/uploads/chat-files/${fileName}`, // المسار النسبي
                    url: fileUrl, // ✅ URL كامل للوصول للملف
                    fileId: fileName
                };

                console.log('📁 مسار الملف:', fileUrl);

            } catch (fileError) {
                console.error('❌ خطأ في حفظ الملف:', fileError);
                return res.status(500).json({
                    success: false,
                    message: 'حدث خطأ في حفظ الملف: ' + fileError.message
                });
            }
        }

        // ✅ إنشاء الرسالة
        const message = new Message({
            conversationId: conversationId,
            senderId: senderId,
            text: text,
            file: fileData,
            read: false
        });

        await message.save();

        // ✅ تحديث المحادثة
        await Conversation.findByIdAndUpdate(conversationId, {
            lastMessage: message._id,
            updatedAt: new Date(),
            $inc: { unreadCount: 1 }
        });

        // ✅ جلب الرسالة مع بيانات المرسل
        const populatedMessage = await Message.findById(message._id)
            .populate('senderId', 'name email role avatar');

        // ✅ إرسال إشعار عبر WebSocket
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
        res.status(500).json({
            success: false,
            message: error.message || 'حدث خطأ في إرسال الرسالة'
        });
    }
});

// ============================================================
// ============================================================
// 🔌 WebSocket للدردشة الفورية
// ============================================================
// ============================================================

// إنشاء خادم HTTP
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// تخزين الاتصالات النشطة
const connections = {
    clients: new Map(), // userId -> WebSocket
    admins: new Map(),  // userId -> WebSocket
    experts: new Map(), // userId -> WebSocket
    all: new Set()      // جميع الاتصالات
};

// ============================================================
// معالجة اتصالات WebSocket
// ============================================================
wss.on('connection', function(ws, req) {
    // استخراج معلومات المستخدم من URL
    const urlParams = new URLSearchParams(req.url.split('?')[1]);
    const userId = urlParams.get('userId');
    const role = urlParams.get('role') || 'client';
    const token = urlParams.get('token');

    if (!userId) {
        ws.close(1008, 'معرف المستخدم مطلوب');
        return;
    }

    // تخزين معلومات المستخدم في الاتصال
    ws.userData = {
        userId: userId,
        role: role,
        connectedAt: new Date().toISOString()
    };

    // تخزين الاتصال حسب الدور
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

    // ✅ إرسال قائمة المحادثات للمستخدم
    sendUserConversations(ws, userId);

    // ✅ إشعار للمديرين بوجود مستخدم جديد
    broadcastToAdmins({
        type: 'user_online',
        userId: userId,
        userName: 'مستخدم',
        role: role,
        timestamp: new Date().toISOString()
    });

    // ============================================================
    // معالجة الرسائل الواردة
    // ============================================================
    ws.on('message', async function(message) {
        try {
            const data = JSON.parse(message);
            console.log(`📩 رسالة من ${userId}:`, data);

            switch(data.type) {
                case 'auth':
                    // تأكيد المصادقة
                    ws.send(JSON.stringify({
                        type: 'auth_confirm',
                        userId: userId,
                        role: role
                    }));
                    break;

                case 'new_message':
                    // رسالة جديدة من مستخدم
                    await handleNewMessage(ws, data, userId, role);
                    break;

                case 'read':
                    // تحديث الرسائل كمقروءة
                    await handleReadMessages(ws, data, userId);
                    break;

                case 'typing':
                    // مؤشر الكتابة
                    broadcastToConversationParticipants(data.conversationId, userId, {
                        type: 'typing',
                        userId: userId,
                        userName: data.userName || 'مستخدم',
                        isTyping: data.isTyping
                    });
                    break;

                case 'heartbeat':
                    // نبضات القلب
                    ws.send(JSON.stringify({
                        type: 'heartbeat_ack',
                        timestamp: new Date().toISOString()
                    }));
                    break;

                default:
                    console.log('📩 نوع رسالة غير معروف:', data.type);
            }

        } catch (error) {
            console.error('❌ خطأ في معالجة الرسالة:', error);
            ws.send(JSON.stringify({
                type: 'error',
                message: 'حدث خطأ في معالجة الرسالة'
            }));
        }
    });

    // ============================================================
    // عند قطع الاتصال
    // ============================================================
    ws.on('close', function() {
        // إزالة الاتصال من القوائم
        connections.all.delete(ws);
        connections.clients.delete(userId);
        connections.admins.delete(userId);
        connections.experts.delete(userId);

        console.log(`👤 مستخدم غير متصل: ${userId}`);

        // إشعار للمديرين بفصل المستخدم
        broadcastToAdmins({
            type: 'user_offline',
            userId: userId,
            userName: 'مستخدم',
            timestamp: new Date().toISOString()
        });
    });

    // ============================================================
    // معالجة الأخطاء
    // ============================================================
    ws.on('error', function(error) {
        console.error(`❌ خطأ في WebSocket للمستخدم ${userId}:`, error);
    });
});

// ============================================================
// دوال مساعدة WebSocket
// ============================================================

// ✅ إرسال رسالة إلى مستخدم معين
function sendToUser(userId, data) {
    // البحث في جميع القوائم
    let ws = connections.clients.get(userId);
    if (!ws) ws = connections.admins.get(userId);
    if (!ws) ws = connections.experts.get(userId);

    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
        return true;
    }
    return false;
}

// ✅ إرسال إلى جميع المديرين
function broadcastToAdmins(data) {
    connections.admins.forEach((ws, userId) => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(data));
        }
    });
}

// ✅ إرسال إلى جميع المشاركين في محادثة (باستثناء المرسل)
function broadcastToConversation(conversationId, senderId, data) {
    // البحث عن المحادثة
    Conversation.findById(conversationId)
        .then(conversation => {
            if (!conversation) return;

            // إرسال إلى جميع المشاركين
            conversation.participants.forEach(participantId => {
                if (participantId.toString() === senderId) return;
                sendToUser(participantId.toString(), data);
            });
        })
        .catch(error => {
            console.error('❌ خطأ في إرسال إلى المحادثة:', error);
        });
}

// ✅ إرسال إلى المشاركين في محادثة (للمؤشرات)
function broadcastToConversationParticipants(conversationId, senderId, data) {
    Conversation.findById(conversationId)
        .then(conversation => {
            if (!conversation) return;
            conversation.participants.forEach(participantId => {
                if (participantId.toString() === senderId) return;
                sendToUser(participantId.toString(), data);
            });
        })
        .catch(error => console.error('❌ خطأ:', error));
}

// ✅ إرسال قائمة المحادثات لمستخدم
async function sendUserConversations(ws, userId) {
    try {
        const conversations = await Conversation.find({
            participants: userId
        })
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
            ws.send(JSON.stringify({
                type: 'conversations',
                data: formatted
            }));
        }

    } catch (error) {
        console.error('❌ خطأ في إرسال المحادثات:', error);
    }
}

// ✅ معالجة رسالة جديدة
async function handleNewMessage(ws, data, userId, role) {
    try {
        const { conversationId, text, file } = data;

        if (!conversationId || !text) {
            ws.send(JSON.stringify({
                type: 'error',
                message: 'معرف المحادثة والنص مطلوبان'
            }));
            return;
        }

        // التحقق من المحادثة
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            ws.send(JSON.stringify({
                type: 'error',
                message: 'المحادثة غير موجودة'
            }));
            return;
        }

        // التحقق من أن المستخدم مشارك
        if (!conversation.participants.includes(userId)) {
            ws.send(JSON.stringify({
                type: 'error',
                message: 'ليس لديك صلاحية'
            }));
            return;
        }

        // حفظ الملف إذا وجد
        let fileData = null;
        if (file) {
            const fileName = `chat_${Date.now()}_${file.name}`;
            const filePath = path.join(chatFilesDir, fileName);
            const base64Data = file.data.split(';base64,').pop();
            const buffer = Buffer.from(base64Data, 'base64');
            fs.writeFileSync(filePath, buffer);

            fileData = {
                name: file.name,
                type: file.type,
                size: file.size,
                path: `/uploads/chat-files/${fileName}`,
                fileId: fileName
            };
        }

        // إنشاء الرسالة
        const message = new Message({
            conversationId: conversationId,
            senderId: userId,
            text: text,
            file: fileData,
            read: false
        });

        await message.save();

        // تحديث المحادثة
        await Conversation.findByIdAndUpdate(conversationId, {
            lastMessage: message._id,
            updatedAt: new Date(),
            $inc: { unreadCount: 1 }
        });

        // جلب الرسالة مع بيانات المرسل
        const populatedMessage = await Message.findById(message._id)
            .populate('senderId', 'name email role avatar');

        // إرسال تأكيد للمرسل
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

        // إرسال إلى جميع المشاركين الآخرين
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

        // إشعار للمديرين إذا كان المرسل عميلاً
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
        ws.send(JSON.stringify({
            type: 'error',
            message: 'حدث خطأ في إرسال الرسالة'
        }));
    }
}

// ✅ معالجة تحديث القراءة
async function handleReadMessages(ws, data, userId) {
    try {
        const { conversationId } = data;
        if (!conversationId) return;

        await Message.updateMany(
            {
                conversationId: conversationId,
                senderId: { $ne: userId },
                read: false
            },
            { read: true }
        );

        await Conversation.findByIdAndUpdate(conversationId, {
            $set: { unreadCount: 0 }
        });

        // إشعار للمرسلين بأن الرسائل قد قُرئت
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
// مسار الصحة
// ============================================================
app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'الخادم يعمل بشكل صحيح 🚀',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// ============================================================
// 1. مسارات المصادقة (AUTH)
// ============================================================

// تسجيل مستخدم جديد
app.post('/api/auth/register', async (req, res) => {
    try {
        const bcrypt = require('bcryptjs');
        const { name, email, password, role } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'البريد الإلكتروني مسجل بالفعل'
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = new User({
            name,
            email,
            password: hashedPassword,
            role: role || 'user',
            isActive: true
        });

        await user.save();

        res.status(201).json({
            success: true,
            message: 'تم إنشاء الحساب بنجاح',
            data: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('❌ خطأ في التسجيل:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// تسجيل الدخول
app.post('/api/auth/login', async (req, res) => {
    try {
        const bcrypt = require('bcryptjs');
        const jwt = require('jsonwebtoken');
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'البريد الإلكتروني وكلمة المرور مطلوبان'
            });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
            });
        }

        if (!user.password) {
            return res.status(500).json({
                success: false,
                message: 'خطأ في بيانات المستخدم، يرجى التواصل مع الدعم'
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
            });
        }

        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET || 'my_super_secret_key_123456',
            { expiresIn: '30d' }
        );

        res.status(200).json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                isActive: user.isActive
            }
        });
    } catch (error) {
        console.error('❌ خطأ في تسجيل الدخول:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// جلب بيانات المستخدم الحالي
app.get('/api/auth/me', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'المستخدم غير موجود'
            });
        }
        res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error('❌ خطأ في جلب بيانات المستخدم:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================
// 2. مسارات الفيديوهات (VIDEOS)
// ============================================================
app.post('/api/videos/upload', protect, authorize('admin'), uploadVideo.single('video'), async (req, res) => {
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

        let duration = '00:00';
        try {
            const ffprobe = require('ffprobe');
            const ffprobeStatic = require('ffprobe-static');
            const videoPath = req.file.path;
            
            const probeResult = await ffprobe(videoPath, { path: ffprobeStatic.path });
            const durationSeconds = probeResult.streams[0]?.duration || 0;
            
            if (durationSeconds > 0) {
                const minutes = Math.floor(durationSeconds / 60);
                const seconds = Math.floor(durationSeconds % 60);
                duration = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            }
        } catch (error) {
            console.log('⚠️ تعذر الحصول على مدة الفيديو، سيتم استخدام القيمة الافتراضية');
        }

        const fileName = req.file.filename;
        const publicPath = `/uploads/videos/${fileName}`;

        const video = new Video({
            title: title,
            subjectId: String(subjectId),
            subjectName: subjectName,
            specialtyName: specialtyName || '',
            universityName: universityName || '',
            description: description || '',
            fileName: fileName,
            filePath: publicPath,
            fileSize: (req.file.size / (1024 * 1024)).toFixed(2) + ' MB',
            fileType: req.file.mimetype,
            duration: duration,
            uploadDate: new Date(),
            views: 0
        });

        await video.save();

        console.log('✅ تم رفع الفيديو:', video.title);
        console.log('✅ المدة:', video.duration);

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

// جلب جميع الفيديوهات
app.get('/api/videos/all', async (req, res) => {
    try {
        const videos = await Video.find().sort({ uploadDate: -1 });
        res.status(200).json({
            success: true,
            count: videos.length,
            data: videos
        });
    } catch (error) {
        console.error('❌ خطأ في جلب الفيديوهات:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// جلب فيديوهات مادة معينة
app.get('/api/videos/subject/:subjectId', async (req, res) => {
    try {
        const videos = await Video.find({ subjectId: parseInt(req.params.subjectId) });
        res.status(200).json({
            success: true,
            count: videos.length,
            data: videos
        });
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
            return res.status(404).json({
                success: false,
                message: 'الفيديو غير موجود'
            });
        }
        res.status(200).json({
            success: true,
            data: video
        });
    } catch (error) {
        console.error('❌ خطأ في جلب الفيديو:', error);
        if (error.name === 'CastError' || error.kind === 'ObjectId') {
            return res.status(404).json({
                success: false,
                message: 'الفيديو غير موجود'
            });
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
            return res.status(404).json({
                success: false,
                message: 'الفيديو غير موجود'
            });
        }
        res.status(200).json({
            success: true,
            data: video
        });
    } catch (error) {
        console.error('❌ خطأ في تحديث المشاهدات:', error);
        if (error.name === 'CastError' || error.kind === 'ObjectId') {
            return res.status(404).json({
                success: false,
                message: 'الفيديو غير موجود'
            });
        }
        res.status(500).json({ success: false, message: error.message });
    }
});

// حذف فيديو (للمدير فقط)
app.delete('/api/videos/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const video = await Video.findById(req.params.id);
        if (!video) {
            return res.status(404).json({
                success: false,
                message: 'الفيديو غير موجود'
            });
        }

        if (video.fileName) {
            const filePath = path.join(videosDir, video.fileName);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`🗑️ تم حذف الملف: ${filePath}`);
            }
        }

        await video.deleteOne();
        res.status(200).json({
            success: true,
            message: 'تم حذف الفيديو بنجاح'
        });
    } catch (error) {
        console.error('❌ خطأ في حذف الفيديو:', error);
        if (error.name === 'CastError' || error.kind === 'ObjectId') {
            return res.status(404).json({
                success: false,
                message: 'الفيديو غير موجود'
            });
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
        res.status(200).json({
            success: true,
            count: models.length,
            data: models
        });
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
        res.status(500).json({ success: false, message: error.message });
    }
});

// رفع نموذج جديد (للمدير فقط)
app.post('/api/models', protect, authorize('admin'), async (req, res) => {
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

        if (!title || !category || !fileName || !fileData || !mainService) {
            return res.status(400).json({
                success: false,
                message: 'يرجى إدخال جميع البيانات المطلوبة (العنوان، التصنيف، اسم الملف، بيانات الملف، والخدمة الرئيسية)'
            });
        }

        console.log('📦 رفع نموذج جديد:');
        console.log('  - العنوان:', title);
        console.log('  - الخدمة الرئيسية:', mainService);
        console.log('  - الخدمة الفرعية:', subService || 'غير محددة');
        console.log('  - التصنيف:', category);

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

        console.log('✅ تم رفع النموذج بنجاح:', model.title);

        res.status(201).json({
            success: true,
            message: 'تم رفع النموذج بنجاح',
            data: model
        });
    } catch (error) {
        console.error('❌ خطأ في رفع النموذج:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message,
            details: error.errors || {}
        });
    }
});

// حذف نموذج (للمدير فقط)
app.delete('/api/models/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const model = await Model.findById(req.params.id);
        if (!model) {
            return res.status(404).json({
                success: false,
                message: 'النموذج غير موجود'
            });
        }
        await model.deleteOne();
        res.status(200).json({
            success: true,
            message: 'تم حذف النموذج بنجاح'
        });
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
            .populate({
                path: 'user',
                select: 'name email'
            })
            .populate({
                path: 'assignedExpert',
                select: 'name email'
            })
            .sort({ createdAt: -1 });
        
        const processedOrders = orders.map(order => {
            const orderObj = order.toObject();
            if (!orderObj.user) {
                orderObj.user = {
                    _id: null,
                    name: 'مستخدم غير مسجل',
                    email: 'لا يوجد بريد إلكتروني'
                };
            }
            if (!orderObj.assignedExpert) {
                orderObj.assignedExpert = {
                    _id: null,
                    name: 'غير معين',
                    email: ''
                };
            }
            return orderObj;
        });
        
        res.status(200).json({
            success: true,
            count: processedOrders.length,
            data: processedOrders
        });
    } catch (error) {
        console.error('❌ خطأ في جلب جميع الطلبات:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// جلب طلبات الخبير
app.get('/api/orders/expert', protect, authorize('expert'), async (req, res) => {
    try {
        const orders = await Order.find({ assignedExpert: req.user.id })
            .populate({
                path: 'user',
                select: 'name email'
            })
            .populate({
                path: 'assignedExpert',
                select: 'name email'
            })
            .sort({ assignedAt: -1, createdAt: -1 });
            
        const processedOrders = orders.map(order => {
            const orderObj = order.toObject();
            if (!orderObj.user) {
                orderObj.user = {
                    _id: null,
                    name: 'مستخدم غير مسجل',
                    email: 'لا يوجد بريد إلكتروني'
                };
            }
            if (!orderObj.assignedExpert) {
                orderObj.assignedExpert = {
                    _id: null,
                    name: 'غير معين',
                    email: ''
                };
            }
            return orderObj;
        });

        res.status(200).json({
            success: true,
            count: processedOrders.length,
            data: processedOrders
        });
    } catch (error) {
        console.error('❌ خطأ في جلب طلبات الخبير:', error);
        if (error.name === 'CastError' || (error.message && error.message.includes('CastError'))) {
            return res.status(200).json({
                success: true,
                count: 0,
                data: []
            });
        }
        res.status(500).json({
            success: false,
            message: error.message || 'حدث خطأ في جلب الطلبات'
        });
    }
});

// جلب طلبات المستخدم
app.get('/api/orders', protect, async (req, res) => {
    try {
        const filter = req.user?.id ? { user: req.user.id } : {};
        const orders = await Order.find(filter)
            .populate({
                path: 'user',
                select: 'name email'
            })
            .sort({ createdAt: -1 });
            
        const processedOrders = orders.map(order => {
            const orderObj = order.toObject();
            if (!orderObj.user) {
                orderObj.user = {
                    _id: null,
                    name: 'مستخدم غير مسجل',
                    email: 'لا يوجد بريد إلكتروني'
                };
            }
            return orderObj;
        });
        
        res.status(200).json({
            success: true,
            count: processedOrders.length,
            data: processedOrders
        });
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
        
        res.status(201).json({
            success: true,
            message: 'تم إنشاء الطلب بنجاح ✅',
            data: order
        });
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
            return res.status(404).json({
                success: false,
                message: 'الطلب غير موجود ❌'
            });
        }

        const isAuthorized = 
            req.user.role === 'admin' || 
            (order.user && req.user.id === order.user._id.toString()) || 
            (req.user.role === 'expert' && order.assignedExpert && req.user.id === order.assignedExpert._id.toString());

        if (!isAuthorized) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية لعرض هذا الطلب'
            });
        }

        res.status(200).json({
            success: true,
            data: order
        });
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
            return res.status(404).json({
                success: false,
                message: 'الطلب غير موجود ❌'
            });
        }

        const isAuthorized = 
            req.user.role === 'admin' || 
            (order.user && req.user.id === order.user.toString());

        if (!isAuthorized) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية لتعديل هذا الطلب'
            });
        }

        if (req.user.role !== 'admin') {
            delete req.body.assignedExpert;
            delete req.body.budget;
        }

        order = await Order.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: 'تم تحديث الطلب بنجاح ✅',
            data: order
        });
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
            return res.status(404).json({
                success: false,
                message: 'الطلب غير موجود ❌'
            });
        }

        const isAuthorized = 
            req.user.role === 'admin' || 
            (order.user && req.user.id === order.user.toString());

        if (!isAuthorized) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية لحذف هذا الطلب'
            });
        }

        if (order.files && order.files.length > 0) {
            for (const file of order.files) {
                if (file.filePath && fs.existsSync(file.filePath)) {
                    try {
                        fs.unlinkSync(file.filePath);
                    } catch (err) {
                        console.error('❌ خطأ في حذف الملف:', err);
                    }
                }
            }
        }

        await order.deleteOne();

        res.status(200).json({
            success: true,
            message: 'تم حذف الطلب بنجاح 🗑️'
        });
    } catch (error) {
        console.error('❌ خطأ في حذف الطلب:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// رفع ملفات للطلب
app.post('/api/orders/:orderId/upload', protect, upload.array('files', 5), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'يرجى رفع ملف واحد على الأقل'
            });
        }

        const order = await Order.findById(req.params.orderId);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'الطلب غير موجود ❌'
            });
        }

        const isAuthorized = 
            req.user.role === 'admin' || 
            (order.user && req.user.id === order.user.toString());

        if (!isAuthorized) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية لرفع ملفات لهذا الطلب'
            });
        }

        const fileData = req.files.map(file => ({
            filename: file.originalname || file.filename,
            filePath: file.path ? file.path.replace(/\\/g, '/') : null,
            fileId: file.filename || `file_${Date.now()}`,
            fileSize: file.size,
            mimeType: file.mimetype,
            uploadDate: new Date()
        }));

        order.files.push(...fileData);
        await order.save();

        res.status(200).json({
            success: true,
            message: `تم رفع ${req.files.length} ملف بنجاح ✅`,
            data: {
                files: fileData,
                order: order
            }
        });
    } catch (error) {
        console.error('❌ خطأ في رفع الملفات:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// جلب ملفات الطلب
app.get('/api/orders/:orderId/files', protect, async (req, res) => {
    try {
        const order = await Order.findById(req.params.orderId);
        
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'الطلب غير موجود'
            });
        }

        const isAuthorized = 
            req.user.role === 'admin' || 
            (order.user && req.user.id === order.user.toString()) ||
            (req.user.role === 'expert' && order.assignedExpert && req.user.id === order.assignedExpert.toString());

        if (!isAuthorized) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية لعرض هذه الملفات'
            });
        }

        res.status(200).json({
            success: true,
            files: order.files || []
        });
    } catch (error) {
        console.error('❌ خطأ في جلب الملفات:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// تحميل ملف معين
app.get('/api/orders/:orderId/files/:fileIndex', protect, async (req, res) => {
    try {
        const order = await Order.findById(req.params.orderId);
        
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'الطلب غير موجود'
            });
        }

        const isAuthorized = 
            req.user.role === 'admin' || 
            (order.user && req.user.id === order.user.toString()) ||
            (req.user.role === 'expert' && order.assignedExpert && req.user.id === order.assignedExpert.toString());

        if (!isAuthorized) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية لتحميل هذا الملف'
            });
        }

        const fileIndex = parseInt(req.params.fileIndex);
        if (isNaN(fileIndex) || fileIndex < 0 || fileIndex >= order.files.length) {
            return res.status(404).json({
                success: false,
                message: 'الملف غير موجود'
            });
        }

        const file = order.files[fileIndex];
        
        const possiblePaths = [];
        
        if (file.filePath) {
            possiblePaths.push(file.filePath);
        }
        
        const possibleNames = [
            file.filename,
            file.fileId,
            `${req.params.orderId}_${file.filename}`,
            `${req.params.orderId}_${file.fileId}`
        ];
        
        if (fs.existsSync(uploadsDir)) {
            const files = fs.readdirSync(uploadsDir);
            for (const f of files) {
                for (const name of possibleNames) {
                    if (f.includes(name) || name.includes(f)) {
                        possiblePaths.push(path.join(uploadsDir, f));
                        break;
                    }
                }
            }
        }
        
        if (fs.existsSync(ordersDir)) {
            const files = fs.readdirSync(ordersDir);
            for (const f of files) {
                for (const name of possibleNames) {
                    if (f.includes(name) || name.includes(f)) {
                        possiblePaths.push(path.join(ordersDir, f));
                        break;
                    }
                }
            }
        }
        
        let foundPath = null;
        for (const p of possiblePaths) {
            if (fs.existsSync(p)) {
                foundPath = p;
                break;
            }
        }
        
        if (!foundPath) {
            return res.status(404).json({
                success: false,
                message: 'الملف غير موجود على الخادم'
            });
        }

        res.download(foundPath, file.filename);
    } catch (error) {
        console.error('❌ خطأ في تحميل الملف:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ في تحميل الملف'
        });
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
            return res.status(404).json({
                success: false,
                message: 'الطلب غير موجود ❌'
            });
        }

        const isAuthorized = 
            req.user.role === 'admin' || 
            (req.user.role === 'expert' && order.assignedExpert && req.user.id === order.assignedExpert.toString());

        if (!isAuthorized) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية لتحديث حالة هذا الطلب'
            });
        }

        order.status = status;
        await order.save();

        const populatedOrder = await Order.findById(order._id)
            .populate('user', 'name email')
            .populate('assignedExpert', 'name email');

        res.status(200).json({
            success: true,
            message: `تم تحديث حالة الطلب إلى ${status} ✅`,
            data: populatedOrder
        });
    } catch (error) {
        console.error('❌ خطأ في تحديث حالة الطلب:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// جلب معلومات الملفات
app.get('/api/orders/:orderId/files-info', protect, async (req, res) => {
    try {
        const order = await Order.findById(req.params.orderId);
        
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'الطلب غير موجود'
            });
        }

        const isAuthorized = 
            req.user.role === 'admin' || 
            (order.user && req.user.id === order.user.toString()) ||
            (req.user.role === 'expert' && order.assignedExpert && req.user.id === order.assignedExpert.toString());

        if (!isAuthorized) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية لعرض معلومات الملفات'
            });
        }

        const filesInfo = (order.files || []).map((file, index) => ({
            index: index,
            filename: file.filename,
            fileId: file.fileId,
            filePath: file.filePath,
            fileSize: file.fileSize,
            mimeType: file.mimeType,
            uploadDate: file.uploadDate,
            exists: file.filePath ? fs.existsSync(file.filePath) : false
        }));

        res.status(200).json({
            success: true,
            count: filesInfo.length,
            data: filesInfo
        });
    } catch (error) {
        console.error('❌ خطأ في جلب معلومات الملفات:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// حذف ملف
app.delete('/api/orders/:orderId/files/:fileIndex', protect, async (req, res) => {
    try {
        const order = await Order.findById(req.params.orderId);
        
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'الطلب غير موجود'
            });
        }

        const isAuthorized = 
            req.user.role === 'admin' || 
            (order.user && req.user.id === order.user.toString());

        if (!isAuthorized) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية لحذف هذا الملف'
            });
        }

        const fileIndex = parseInt(req.params.fileIndex);
        if (isNaN(fileIndex) || fileIndex < 0 || fileIndex >= order.files.length) {
            return res.status(404).json({
                success: false,
                message: 'الملف غير موجود'
            });
        }

        const file = order.files[fileIndex];
        
        if (file.filePath && fs.existsSync(file.filePath)) {
            try {
                fs.unlinkSync(file.filePath);
            } catch (err) {
                console.error('❌ خطأ في حذف الملف من الخادم:', err);
            }
        }

        order.files.splice(fileIndex, 1);
        await order.save();

        res.status(200).json({
            success: true,
            message: 'تم حذف الملف بنجاح 🗑️'
        });
    } catch (error) {
        console.error('❌ خطأ في حذف الملف:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// تعيين خبير للطلب
app.put('/api/orders/:id/assign-expert', protect, authorize('admin'), async (req, res) => {
    try {
        const { expertId, notes } = req.body;
        
        if (!expertId) {
            return res.status(400).json({
                success: false,
                message: 'يرجى اختيار خبير'
            });
        }

        const expert = await User.findById(expertId);
        
        if (!expert) {
            return res.status(404).json({
                success: false,
                message: 'الخبير غير موجود'
            });
        }

        if (expert.role !== 'expert') {
            return res.status(400).json({
                success: false,
                message: 'المستخدم المحدد ليس خبيراً'
            });
        }

        const order = await Order.findByIdAndUpdate(
            req.params.id,
            {
                assignedExpert: expertId,
                assignedAt: new Date(),
                status: 'in-progress',
                expertNotes: notes || ''
            },
            { new: true, runValidators: true }
        );

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'الطلب غير موجود ❌'
            });
        }

        const populatedOrder = await Order.findById(order._id)
            .populate('user', 'name email')
            .populate('assignedExpert', 'name email');

        console.log(`✅ تم تعيين الخبير ${expert.name} للطلب ${order._id}`);

        res.status(200).json({
            success: true,
            message: `تم تعيين الخبير ${expert.name} بنجاح ✅`,
            data: populatedOrder
        });
    } catch (error) {
        console.error('❌ خطأ في تعيين الخبير:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ في تعيين الخبير'
        });
    }
});

// ============================================================
// 4.5 مسارات طلبات خدمات كلية الأعمال (BUSINESS ORDERS)
// ============================================================

// ✅ جلب جميع طلبات كلية الأعمال (للمدير) - مسار مبسط
app.get('/api/business-orders', protect, authorize('admin'), async (req, res) => {
    try {
        const orders = await Order.find({
            $or: [
                { orderType: 'business' },
                { department: { $exists: true, $ne: '' } },
                { service: { $exists: true, $ne: '' } }
            ]
        })
        .populate('userId', 'name email')
        .populate('user', 'name email')
        .populate('assignedExpert', 'name email')
        .sort({ createdAt: -1 });
        
        res.status(200).json({
            success: true,
            count: orders.length,
            data: orders
        });
    } catch (error) {
        console.error('❌ خطأ في جلب طلبات الأعمال:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ✅ جلب طلب معين
app.get('/api/business-orders/:id', protect, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('userId', 'name email')
            .populate('user', 'name email')
            .populate('assignedExpert', 'name email');
        
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'الطلب غير موجود'
            });
        }

        const isAuthorized = 
            req.user.role === 'admin' || 
            (order.userId && req.user.id === order.userId.toString()) ||
            (order.user && req.user.id === order.user.toString()) ||
            (req.user.role === 'expert' && order.assignedExpert && req.user.id === order.assignedExpert.toString());

        if (!isAuthorized) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية لعرض هذا الطلب'
            });
        }

        res.status(200).json({
            success: true,
            data: order
        });
    } catch (error) {
        console.error('❌ خطأ في جلب الطلب:', error);
        if (error.name === 'CastError' || error.kind === 'ObjectId') {
            return res.status(404).json({
                success: false,
                message: 'الطلب غير موجود'
            });
        }
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ✅ إنشاء طلب جديد لخدمات كلية الأعمال (مع دعم الملفات)
app.post('/api/business-orders', async (req, res) => {
    try {
        const {
            name, email, phone, department, service, requestType,
            title, description, organization, deliveryDate, notes, termsAgreed,
            files
        } = req.body;

        // التحقق من الحقول المطلوبة
        const required = { name, email, phone, department, service, requestType, title, description, deliveryDate };
        const missing = Object.entries(required).filter(([k, v]) => !v || v.trim() === '').map(([k]) => k);
        
        if (missing.length > 0) {
            return res.status(400).json({
                success: false,
                message: `الحقول المطلوبة غير مكتملة: ${missing.join('، ')}`,
                missing
            });
        }

        // ✅ حفظ الملفات
        const savedFiles = [];
        if (files && Array.isArray(files) && files.length > 0) {
            console.log(`📁 جاري حفظ ${files.length} ملف...`);
            
            for (const file of files) {
                try {
                    if (!file.fileData || !file.fileData.includes(';base64,')) {
                        console.error(`❌ ملف ${file.filename} غير صالح`);
                        continue;
                    }

                    const base64Data = file.fileData.split(';base64,').pop();
                    const buffer = Buffer.from(base64Data, 'base64');
                    
                    if (buffer.length === 0) {
                        console.error(`❌ ملف ${file.filename} فارغ`);
                        continue;
                    }

                    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                    const ext = path.extname(file.filename);
                    const fileName = 'business-' + uniqueSuffix + ext;
                    const filePath = path.join(businessOrdersDir, fileName);

                    fs.writeFileSync(filePath, buffer);
                    console.log(`✅ تم حفظ الملف: ${fileName} (${(buffer.length / 1024).toFixed(1)} KB)`);

                    savedFiles.push({
                        filename: file.filename,
                        filePath: filePath,
                        fileId: fileName,
                        fileSize: file.fileSize || buffer.length,
                        mimeType: file.fileType || 'application/octet-stream',
                        uploadDate: new Date()
                    });

                } catch (error) {
                    console.error(`❌ خطأ في حفظ الملف ${file.filename}:`, error);
                }
            }
        }

        // ✅ إنشاء الطلب
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

        console.log(`✅ تم إنشاء طلب جديد #${order._id} - ${order.name}`);
        console.log(`📁 عدد الملفات: ${savedFiles.length}`);

        res.status(201).json({
            success: true,
            message: 'تم إرسال الطلب بنجاح ✅',
            data: {
                id: order._id,
                name: order.name,
                service: order.service,
                status: order.status,
                createdAt: order.createdAt,
                filesCount: savedFiles.length,
                files: savedFiles
            }
        });

    } catch (error) {
        console.error('❌ خطأ في إنشاء الطلب:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'حدث خطأ في إنشاء الطلب'
        });
    }
});

// ✅ تحميل ملف من طلبات كلية الأعمال (مع التوكن)
app.get('/api/business-orders/files/:fileId', protect, async (req, res) => {
    try {
        const { fileId } = req.params;

        // البحث عن الطلب الذي يحتوي على هذا الملف
        const order = await Order.findOne({ 'files.fileId': fileId });
        
        if (!order) {
            return res.status(404).json({ success: false, message: 'الملف غير موجود' });
        }

        // التحقق من الصلاحية
        const isAuthorized = 
            req.user.role === 'admin' || 
            (order.userId && req.user.id === order.userId.toString()) ||
            (order.user && req.user.id === order.user.toString());

        if (!isAuthorized) {
            return res.status(403).json({ success: false, message: 'ليس لديك صلاحية' });
        }

        // البحث عن الملف في المجلد
        const filePath = path.join(businessOrdersDir, fileId);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, message: 'الملف غير موجود على الخادم' });
        }

        // البحث عن معلومات الملف
        const fileInfo = order.files.find(f => f.fileId === fileId);
        const filename = fileInfo ? fileInfo.filename : fileId;

        res.download(filePath, filename);

    } catch (error) {
        console.error('❌ خطأ في تحميل الملف:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ✅ تحديث حالة الطلب
app.put('/api/business-orders/:id/status', protect, async (req, res) => {
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
            return res.status(404).json({
                success: false,
                message: 'الطلب غير موجود ❌'
            });
        }

        const isAuthorized = 
            req.user.role === 'admin' || 
            (req.user.role === 'expert' && order.assignedExpert && req.user.id === order.assignedExpert.toString());

        if (!isAuthorized) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية لتحديث حالة هذا الطلب'
            });
        }

        order.status = status;
        order.updatedAt = new Date();
        await order.save();

        res.status(200).json({
            success: true,
            message: `تم تحديث حالة الطلب إلى ${status} ✅`,
            data: order
        });
    } catch (error) {
        console.error('❌ خطأ في تحديث حالة الطلب:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ✅ حذف طلب (للمدير فقط)
app.delete('/api/business-orders/:id', protect, authorize('admin'), async (req, res) => {
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
                const filePath = path.join(businessOrdersDir, file.fileId);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    console.log(`🗑️ تم حذف الملف: ${file.fileId}`);
                }
            }
        }

        await order.deleteOne();

        res.status(200).json({
            success: true,
            message: 'تم حذف الطلب بنجاح 🗑️'
        });
    } catch (error) {
        console.error('❌ خطأ في حذف الطلب:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ✅ تصدير الطلبات إلى CSV
app.get('/api/business-orders/export/csv', protect, authorize('admin'), async (req, res) => {
    try {
        const orders = await Order.find({
            $or: [
                { orderType: 'business' },
                { department: { $exists: true, $ne: '' } }
            ]
        }).sort({ createdAt: -1 });

        if (orders.length === 0) {
            return res.status(404).json({ success: false, message: 'لا توجد طلبات' });
        }

        const headers = ['#', 'الاسم', 'البريد', 'رقم التواصل', 'القسم', 'الخدمة', 'نوع الطلب', 'العنوان', 'الوصف', 'الجهة', 'موعد التسليم', 'الحالة', 'تاريخ الإنشاء', 'الملفات'];
        let csv = '\uFEFF' + headers.join(',') + '\n';

        const statusMap = { pending: 'قيد الانتظار', 'in-progress': 'قيد التنفيذ', completed: 'مكتملة', cancelled: 'ملغية', revision: 'مراجعة' };

        orders.forEach(o => {
            const row = [
                o._id.toString().slice(-6),
                `"${(o.name || '').replace(/"/g, '""')}"`,
                o.email || '',
                o.phone || '',
                `"${(o.department || '').replace(/"/g, '""')}"`,
                `"${(o.service || '').replace(/"/g, '""')}"`,
                `"${(o.requestType || '').replace(/"/g, '""')}"`,
                `"${(o.title || '').replace(/"/g, '""')}"`,
                `"${(o.description || '').replace(/"/g, '""')}"`,
                `"${(o.organization || '').replace(/"/g, '""')}"`,
                o.deliveryDate || '',
                statusMap[o.status] || o.status,
                new Date(o.createdAt).toLocaleDateString('ar-SA'),
                o.files?.length || 0
            ];
            csv += row.join(',') + '\n';
        });

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=طلبات_الأعمال_${new Date().toISOString().split('T')[0]}.csv`);
        res.send(csv);
    } catch (error) {
        console.error('❌ خطأ في تصدير الطلبات:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ✅ إحصائيات الطلبات
app.get('/api/business-orders/stats', protect, authorize('admin'), async (req, res) => {
    try {
        const total = await Order.countDocuments({
            $or: [
                { orderType: 'business' },
                { department: { $exists: true, $ne: '' } }
            ]
        });
        
        const pending = await Order.countDocuments({ 
            status: 'pending',
            $or: [
                { orderType: 'business' },
                { department: { $exists: true, $ne: '' } }
            ]
        });
        
        const inProgress = await Order.countDocuments({ 
            status: 'in-progress',
            $or: [
                { orderType: 'business' },
                { department: { $exists: true, $ne: '' } }
            ]
        });
        
        const completed = await Order.countDocuments({ 
            status: 'completed',
            $or: [
                { orderType: 'business' },
                { department: { $exists: true, $ne: '' } }
            ]
        });
        
        const cancelled = await Order.countDocuments({ 
            status: 'cancelled',
            $or: [
                { orderType: 'business' },
                { department: { $exists: true, $ne: '' } }
            ]
        });

        res.status(200).json({
            success: true,
            data: { total, pending, inProgress, completed, cancelled }
        });
    } catch (error) {
        console.error('❌ خطأ في جلب الإحصائيات:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================
// 5. مسارات المستخدمين (USERS)
// ============================================================

// جلب جميع المستخدمين (للمدير فقط)
app.get('/api/users', protect, authorize('admin'), async (req, res) => {
    try {
        const users = await User.find()
            .select('-password')
            .sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            count: users.length,
            data: users
        });
    } catch (error) {
        console.error('❌ خطأ في جلب المستخدمين:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// جلب جميع الخبراء (للمدير فقط)
app.get('/api/users/experts', protect, authorize('admin'), async (req, res) => {
    try {
        const experts = await User.find({ role: 'expert' })
            .select('-password')
            .sort({ name: 1 });
        res.status(200).json({
            success: true,
            data: experts
        });
    } catch (error) {
        console.error('❌ خطأ في جلب الخبراء:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// جلب مستخدم محدد
app.get('/api/users/:id', protect, async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'المستخدم غير موجود'
            });
        }
        res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error('❌ خطأ في جلب المستخدم:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// تحديث مستخدم (للمدير فقط)
app.put('/api/users/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const { isActive, expertise, bio, role } = req.body;
        const updateData = {};
        if (isActive !== undefined) updateData.isActive = isActive;
        if (expertise !== undefined) updateData.expertise = expertise;
        if (bio !== undefined) updateData.bio = bio;
        if (role !== undefined) updateData.role = role;

        const user = await User.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'المستخدم غير موجود'
            });
        }
        res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error('❌ خطأ في تحديث المستخدم:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// حذف مستخدم (للمدير فقط)
app.delete('/api/users/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'المستخدم غير موجود'
            });
        }
        res.status(200).json({
            success: true,
            message: 'تم حذف المستخدم بنجاح'
        });
    } catch (error) {
        console.error('❌ خطأ في حذف المستخدم:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================
// 6. مسارات الجامعات (UNIVERSITIES)
// ============================================================

// جلب جميع الجامعات
app.get('/api/universities', async (req, res) => {
    try {
        const universities = await University.find().sort({ name: 1 });
        res.status(200).json({
            success: true,
            data: universities
        });
    } catch (error) {
        console.error('❌ خطأ في جلب الجامعات:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// إضافة جامعة جديدة (للمدير فقط)
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
        
        const university = new University({ 
            name, 
            icon: icon || 'fa-university', 
            count: count || 0 
        });
        await university.save();
        
        res.status(201).json({
            success: true,
            message: 'تم إضافة الجامعة بنجاح',
            data: university
        });
    } catch (error) {
        console.error('❌ خطأ في إضافة الجامعة:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// حذف جامعة (للمدير فقط)
app.delete('/api/universities/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const university = await University.findById(req.params.id);
        if (!university) {
            return res.status(404).json({ success: false, message: 'الجامعة غير موجودة' });
        }
        
        await ExplanationMaterial.deleteMany({ universityId: req.params.id });
        await university.deleteOne();
        
        res.status(200).json({
            success: true,
            message: 'تم حذف الجامعة والمواد المرتبطة بها بنجاح'
        });
    } catch (error) {
        console.error('❌ خطأ في حذف الجامعة:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================
// 7. مسارات المواد التعليمية (EXPLANATIONS MATERIALS)
// ============================================================

// جلب جميع المواد
app.get('/api/explanations/materials', async (req, res) => {
    try {
        const materials = await ExplanationMaterial.find()
            .sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            data: materials
        });
    } catch (error) {
        console.error('❌ خطأ في جلب المواد:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// جلب مادة محددة
app.get('/api/explanations/materials/:id', async (req, res) => {
    try {
        const material = await ExplanationMaterial.findById(req.params.id);
        if (!material) {
            return res.status(404).json({
                success: false,
                message: 'المادة غير موجودة'
            });
        }
        res.status(200).json({
            success: true,
            data: material
        });
    } catch (error) {
        console.error('❌ خطأ في جلب المادة:', error);
        if (error.name === 'CastError' || error.kind === 'ObjectId') {
            return res.status(404).json({
                success: false,
                message: 'المادة غير موجودة'
            });
        }
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// إضافة مادة جديدة (للمدير فقط)
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
            title,
            code,
            instructor,
            universityId,
            icon: icon || 'fa-book',
            videos: videos || 0,
            description: description || '',
            isFeatured: isFeatured || false,
            price: price || 99
        });
        await material.save();

        await University.findByIdAndUpdate(universityId, { $inc: { count: 1 } });

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
        const { id } = req.params;
        const updateData = req.body;

        const material = await ExplanationMaterial.findById(id);
        if (!material) {
            return res.status(404).json({
                success: false,
                message: 'المادة غير موجودة'
            });
        }

        Object.keys(updateData).forEach(key => {
            if (updateData[key] !== undefined) {
                material[key] = updateData[key];
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
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// حذف مادة (للمدير فقط)
app.delete('/api/explanations/materials/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const material = await ExplanationMaterial.findById(req.params.id);
        if (!material) {
            return res.status(404).json({ success: false, message: 'المادة غير موجودة' });
        }
        
        await material.deleteOne();
        await University.findByIdAndUpdate(material.universityId, { $inc: { count: -1 } });
        
        res.status(200).json({
            success: true,
            message: 'تم حذف المادة بنجاح'
        });
    } catch (error) {
        console.error('❌ خطأ في حذف المادة:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================
// 8. مسارات الملخصات (SUMMARIES)
// ============================================================

// جلب جميع الملخصات
app.get('/api/summaries/all', async (req, res) => {
    try {
        const summaries = await Summary.find()
            .populate('uploader', 'name email')
            .sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            count: summaries.length,
            data: summaries
        });
    } catch (error) {
        console.error('❌ خطأ في جلب الملخصات:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// جلب ملخص محدد
app.get('/api/summaries/:id', async (req, res) => {
    try {
        const summary = await Summary.findById(req.params.id);
        if (!summary) {
            return res.status(404).json({
                success: false,
                message: 'الملخص غير موجود'
            });
        }
        res.status(200).json({
            success: true,
            data: summary
        });
    } catch (error) {
        console.error('❌ خطأ في جلب الملخص:', error);
        if (error.name === 'CastError' || error.kind === 'ObjectId') {
            return res.status(404).json({
                success: false,
                message: 'الملخص غير موجود'
            });
        }
        res.status(500).json({ success: false, message: error.message });
    }
});

// رفع ملخص جديد (للمدير فقط)
app.post('/api/summaries/upload', protect, authorize('admin'), async (req, res) => {
    try {
        const {
            title,
            subject,
            pages,
            size,
            fileName,
            fileSize,
            fileType,
            fileData,
            date,
            price
        } = req.body;

        if (!title || !subject || !pages || !size || !fileName || !fileData) {
            return res.status(400).json({
                success: false,
                message: 'يرجى إدخال جميع البيانات المطلوبة'
            });
        }

        const summary = new Summary({
            title,
            subject,
            pages: parseInt(pages),
            size,
            fileName,
            fileSize: fileSize || (fileData.length / 1024).toFixed(2) + ' KB',
            fileType: fileType || 'application/pdf',
            fileData,
            date: date || new Date().toISOString().split('T')[0],
            downloads: 0,
            price: price || 49,
            uploader: req.user.id
        });

        await summary.save();

        console.log('✅ تم رفع الملخص:', summary.title);

        res.status(201).json({
            success: true,
            message: 'تم رفع الملخص بنجاح',
            data: summary
        });
    } catch (error) {
        console.error('❌ خطأ في رفع الملخص:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// تحميل ملف الملخص
app.get('/api/summaries/download/:id', async (req, res) => {
    try {
        const summary = await Summary.findById(req.params.id);
        if (!summary) {
            return res.status(404).json({
                success: false,
                message: 'الملخص غير موجود'
            });
        }

        if (!summary.fileData) {
            return res.status(404).json({
                success: false,
                message: 'الملف غير موجود'
            });
        }

        summary.downloads = (summary.downloads || 0) + 1;
        await summary.save();

        res.status(200).json({
            success: true,
            message: 'تم تحميل الملف بنجاح',
            data: {
                fileData: summary.fileData,
                fileName: summary.fileName || 'ملخص.pdf'
            }
        });
    } catch (error) {
        console.error('❌ خطأ في تحميل الملخص:', error);
        if (error.name === 'CastError' || error.kind === 'ObjectId') {
            return res.status(404).json({
                success: false,
                message: 'الملخص غير موجود'
            });
        }
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// حذف ملخص (للمدير فقط)
app.delete('/api/summaries/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const summary = await Summary.findById(req.params.id);
        if (!summary) {
            return res.status(404).json({
                success: false,
                message: 'الملخص غير موجود'
            });
        }

        await summary.deleteOne();
        console.log('🗑️ تم حذف الملخص:', summary.title);

        res.status(200).json({
            success: true,
            message: 'تم حذف الملخص بنجاح'
        });
    } catch (error) {
        console.error('❌ خطأ في حذف الملخص:', error);
        if (error.name === 'CastError' || error.kind === 'ObjectId') {
            return res.status(404).json({
                success: false,
                message: 'الملخص غير موجود'
            });
        }
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================
// 9. مسارات الاشتراكات (SUBSCRIPTIONS)
// ============================================================

// إنشاء طلب اشتراك جديد (للعميل)
app.post('/api/subscriptions', async (req, res) => {
    try {
        const { name, email, phone, subscriptionType, materialId, title, price, paymentMethod, notes } = req.body;

        if (!name || !email || !phone || !subscriptionType || !materialId || !title || !price) {
            return res.status(400).json({
                success: false,
                message: 'جميع الحقول المطلوبة غير مكتملة'
            });
        }

        let user = await User.findOne({ email });
        if (!user) {
            const bcrypt = require('bcryptjs');
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('password123', salt);
            
            user = new User({
                name: name,
                email: email,
                password: hashedPassword,
                role: 'user',
                isActive: true
            });
            await user.save();
        }

        const subscription = new Subscription({
            user: user._id,
            subscriptionType: subscriptionType,
            materialId: materialId,
            title: title,
            price: price,
            phone: phone,
            paymentMethod: paymentMethod || 'card',
            status: 'pending',
            notes: notes || '',
            createdAt: new Date(),
            updatedAt: new Date()
        });

        await subscription.save();

        console.log('✅ تم إنشاء طلب اشتراك جديد:', subscription.title);

        res.status(201).json({
            success: true,
            message: 'تم إرسال طلب الاشتراك بنجاح',
            data: subscription
        });
    } catch (error) {
        console.error('❌ خطأ في إنشاء طلب الاشتراك:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// جلب جميع طلبات الاشتراك (للمدير فقط)
app.get('/api/subscriptions', protect, authorize('admin'), async (req, res) => {
    try {
        const subscriptions = await Subscription.find()
            .populate('user', 'name email')
            .sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            data: subscriptions
        });
    } catch (error) {
        console.error('❌ خطأ في جلب طلبات الاشتراك:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// جلب طلبات اشتراك المستخدم الحالي
app.get('/api/subscriptions/my', protect, async (req, res) => {
    try {
        const subscriptions = await Subscription.find({ user: req.user.id })
            .sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            data: subscriptions
        });
    } catch (error) {
        console.error('❌ خطأ في جلب طلبات اشتراك المستخدم:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// تحديث حالة الاشتراك (للمدير فقط)
app.put('/api/subscriptions/:id/status', protect, authorize('admin'), async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['pending', 'active', 'cancelled'];
        
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'حالة غير صالحة. الحالات المتاحة: pending, active, cancelled'
            });
        }

        const subscription = await Subscription.findByIdAndUpdate(
            req.params.id,
            { status, updatedAt: new Date() },
            { new: true }
        ).populate('user', 'name email');

        if (!subscription) {
            return res.status(404).json({
                success: false,
                message: 'طلب الاشتراك غير موجود'
            });
        }

        if (status === 'active') {
            console.log(`✅ تم تفعيل اشتراك "${subscription.title}" للمستخدم ${subscription.user?.name}`);
        }

        res.status(200).json({
            success: true,
            message: `تم تحديث حالة الاشتراك إلى ${status}`,
            data: subscription
        });
    } catch (error) {
        console.error('❌ خطأ في تحديث حالة الاشتراك:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// حذف طلب اشتراك (للمدير فقط)
app.delete('/api/subscriptions/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const subscription = await Subscription.findById(req.params.id);
        if (!subscription) {
            return res.status(404).json({
                success: false,
                message: 'طلب الاشتراك غير موجود'
            });
        }

        await subscription.deleteOne();
        res.status(200).json({
            success: true,
            message: 'تم حذف طلب الاشتراك بنجاح'
        });
    } catch (error) {
        console.error('❌ خطأ في حذف طلب الاشتراك:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});
// ============================================================
// 🗨️ مسارات الدردشة
// ============================================================

// 1. جلب جميع المحادثات
app.get('/api/chat/conversations', protect, async (req, res) => {
    try {
        const userId = req.user.id;
        const conversations = await Conversation.find({
            participants: userId
        })
        .populate('participants', 'name email role avatar')
        .populate('lastMessage')
        .sort({ updatedAt: -1 });

        const formattedConversations = conversations.map(conv => {
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
                createdAt: conv.createdAt,
                updatedAt: conv.updatedAt
            };
        });

        res.status(200).json({
            success: true,
            data: formattedConversations
        });
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

        // إذا كان userId = 'admin'، نبحث عن أول مدير
        let targetUserId = userId;
        if (userId === 'admin') {
            const admin = await User.findOne({ role: 'admin', isActive: true });
            if (!admin) {
                return res.status(404).json({
                    success: false,
                    message: 'لا يوجد مدير متاح للمراسلة'
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
            return res.status(404).json({
                success: false,
                message: 'المستخدم غير موجود'
            });
        }

        // التحقق من وجود محادثة سابقة
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

// 3. جلب رسائل محادثة
app.get('/api/chat/conversations/:id/messages', protect, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const conversation = await Conversation.findById(id);
        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: 'المحادثة غير موجودة'
            });
        }

        if (!conversation.participants.includes(userId)) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية لعرض هذه المحادثة'
            });
        }

        const messages = await Message.find({ conversationId: id })
            .populate('senderId', 'name email role avatar')
            .sort({ createdAt: 1 });

        // تحديث الرسائل غير المقروءة
        await Message.updateMany(
            {
                conversationId: id,
                senderId: { $ne: userId },
                read: false
            },
            { read: true }
        );

        await Conversation.findByIdAndUpdate(id, {
            $set: { unreadCount: 0 }
        });

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

        res.status(200).json({
            success: true,
            data: formattedMessages
        });
    } catch (error) {
        console.error('❌ خطأ في جلب الرسائل:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================
// 10. معالجة 404
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
app.listen(PORT, () => {
    console.log(`✅ الخادم يعمل على http://localhost:${PORT}`);
    console.log(`📁 مجلد الفيديوهات: ${videosDir}`);
    console.log(`📁 مجلد الطلبات: ${ordersDir}`);
    console.log(`📁 مجلد الملخصات: ${summariesDir}`);
    console.log(`📁 مجلد طلبات الأعمال: ${businessOrdersDir}`);
    console.log(`🔌 WebSocket جاهز على ws://localhost:${PORT}`);
    console.log(`📁 مجلد chat-files: ${chatFilesDir}`);
    console.log(`🌐 بيئة التشغيل: ${process.env.NODE_ENV || 'development'}`);
});