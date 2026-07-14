// ============================================================
// نظام الدردشة العائم - Chat Widget
// النسخة النهائية - بدون ردود تلقائية
// ============================================================

(function() {
    'use strict';

    // ============================================================
    // التكوين الأساسي
    // ============================================================
    const CONFIG = {
        apiUrl: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
            ? 'http://localhost:5000/api' 
            : 'https://irteqa.onrender.com/api',
        maxFileSize: 20 * 1024 * 1024,
        allowedFileTypes: [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'video/mp4', 'video/avi', 'video/mov', 'video/webm',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'application/zip', 'application/x-zip-compressed',
            'text/plain'
        ]
    };

    // ============================================================
    // الحالة العامة
    // ============================================================
    let state = {
        messages: [],
        conversations: [],
        unreadCount: 0,
        isOpen: false,
        isInitialized: false,
        pendingFile: null,
        user: {
            id: null,
            name: 'زائر',
            role: 'client',
            avatar: 'ز'
        },
        currentConversationId: null,
        isConnected: false,
        ws: null,
        reconnectCount: 0,
        isAdmin: false // تحديد إذا كان المستخدم مديراً
    };

    // ============================================================
    // DOM Elements
    // ============================================================
    let elements = {};

    // ============================================================
    // جلب التوكن والمستخدم
    // ============================================================
    function getToken() {
        return localStorage.getItem('token') || '';
    }

    function getUser() {
        try {
            const userData = JSON.parse(localStorage.getItem('user') || 'null');
            if (userData) {
                return {
                    id: userData.id || userData._id || null,
                    name: userData.name || 'مستخدم',
                    role: userData.role || 'client',
                    email: userData.email || '',
                    avatar: userData.name ? userData.name.charAt(0) : 'م'
                };
            }
        } catch (e) {
            console.warn('⚠️ فشل جلب بيانات المستخدم:', e);
        }
        // إذا لم يكن هناك مستخدم مسجل، نستخدم زائر
        return {
            id: 'guest_' + Date.now(),
            name: 'زائر',
            role: 'client',
            avatar: 'ز'
        };
    }

    // ============================================================
    // تهيئة الدردشة
    // ============================================================
    function init() {
        if (state.isInitialized) return;
        
        // جلب بيانات المستخدم
        const user = getUser();
        state.user = { ...state.user, ...user };
        state.isAdmin = state.user.role === 'admin' || state.user.role === 'expert';
        
        // إنشاء عناصر الدردشة
        createWidgetElements();
        
        // تحميل المحادثات
        loadConversations();
        
        // إعداد المستمعات
        setupEventListeners();
        
        state.isInitialized = true;
        
        console.log('💬 نظام الدردشة العائم جاهز!');
        console.log('👤 المستخدم:', state.user);
        console.log('👑 مدير:', state.isAdmin);
    }

    // ============================================================
    // إنشاء عناصر الدردشة
    // ============================================================
    function createWidgetElements() {
        // ✅ زر الدردشة
        const btn = document.createElement('button');
        btn.className = 'chat-widget-btn';
        btn.id = 'chatWidgetBtn';
        btn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" height="32" width="32" viewBox="0 0 512 512"><!--!Font Awesome Free v7.3.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2026 Fonticons, Inc.--><path fill="rgb(255, 212, 59)" d="M256 480c141.4 0 256-107.5 256-240S397.4 0 256 0 0 107.5 0 240c0 54.3 19.2 104.3 51.6 144.5L2.8 476.8c-4.8 9-3.3 20 3.6 27.5s17.8 9.8 27.1 5.8l118.4-50.7C183.7 472.6 218.9 480 256 480zM128 208a32 32 0 1 1 0 64 32 32 0 1 1 0-64zm128 0a32 32 0 1 1 0 64 32 32 0 1 1 0-64zm96 32a32 32 0 1 1 64 0 32 32 0 1 1 -64 0z"/></svg>
            <span class="chat-widget-badge" id="widgetBadge" style="display:none;">0</span>
        `;
        document.body.appendChild(btn);
        elements.btn = btn;

        // ✅ نافذة الدردشة
        const popup = document.createElement('div');
        popup.className = 'chat-widget-popup';
        popup.id = 'chatWidgetPopup';
        
        popup.innerHTML = `
            <div class="chat-widget-header">
                <div class="info">
                    <div class="avatar" id="widgetAvatar">${state.isAdmin ? 'م' : 'ا'}</div>
                    <div class="details">
                        <div class="name" id="widgetName">${state.isAdmin ? 'لوحة الإدارة' : 'الدعم الفني'}</div>
                        <div class="status" id="widgetStatus">
                            <span class="dot online"></span> متصل الآن
                        </div>
                    </div>
                </div>
                <div class="header-actions">
                    <button class="minimize-btn" onclick="window.chatWidget.minimize()" title="تصغير">
                        <i class="fas fa-minus"></i>
                    </button>
                    <button class="close-btn" onclick="window.chatWidget.close()" title="إغلاق">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>

            <div class="chat-widget-body">
                <!-- قائمة المحادثات -->
                <div class="chat-conversations" id="chatConversations" style="${state.isAdmin ? '' : 'display:none;'}">
                    <div class="conv-header">
                        <span>المحادثات</span>
                        <span class="conv-count" id="convCount">0</span>
                    </div>
                    <div class="conv-list" id="convList">
                        <div class="conv-empty">
                            <svg xmlns="http://www.w3.org/2000/svg" height="32" width="36" viewBox="0 0 576 512"><!--!Font Awesome Free v7.3.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2026 Fonticons, Inc.--><path fill="rgb(255, 212, 59)" d="M76.2 258.7c6.1-15.2 4-32.6-5.6-45.9-14.5-20.1-22.6-43.7-22.6-68.8 0-66.8 60.5-128 144-128s144 61.2 144 128-60.5 128-144 128c-15.9 0-31.1-2.3-45.3-6.5-10.3-3.1-21.4-2.5-31.4 1.5l-50.4 20.2 11.4-28.5zM0 144c0 35.8 11.6 69.1 31.7 96.8L1.9 315.2c-1.3 3.2-1.9 6.6-1.9 10 0 14.8 12 26.8 26.8 26.8 3.4 0 6.8-.7 10-1.9l96.3-38.5c18.6 5.5 38.4 8.4 58.9 8.4 106 0 192-78.8 192-176S298-32 192-32 0 46.8 0 144zM384 512c20.6 0 40.3-3 58.9-8.4l96.3 38.5c3.2 1.3 6.6 1.9 10 1.9 14.8 0 26.8-12 26.8-26.8 0-3.4-.7-6.8-1.9-10l-29.7-74.4c20-27.8 31.7-61.1 31.7-96.8 0-82.4-61.7-151.5-145-170.7-1.6 16.3-5.1 31.9-10.1 46.9 63.9 14.8 107.2 67.3 107.2 123.9 0 25.1-8.1 48.7-22.6 68.8-9.6 13.3-11.7 30.6-5.6 45.9l11.4 28.5-50.4-20.2c-10-4-21.1-4.5-31.4-1.5-14.2 4.2-29.4 6.5-45.3 6.5-72.2 0-127.1-45.7-140.7-101.2-15.6 3.2-31.7 5-48.1 5.2 16.4 81.9 94.7 144 188.8 144z"/></svg>
                            <p>لا توجد محادثات</p>
                        </div>
                    </div>
                </div>

                <!-- منطقة الرسائل -->
                <div class="chat-messages-wrapper">
                    <div class="chat-messages" id="widgetMessages">
                        <div class="widget-empty-state">
                            <svg xmlns="http://www.w3.org/2000/svg" height="32" width="32" viewBox="0 0 512 512"><!--!Font Awesome Free v7.3.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2026 Fonticons, Inc.--><path fill="rgb(116, 192, 252)" d="M0 240c0 54.4 19.3 104.6 51.9 144.9L3.1 474.3c-2 3.7-3.1 7.9-3.1 12.2 0 14.1 11.4 25.5 25.5 25.5 4 0 7.8-.6 11.5-2.1L153.4 460c31.4 12.9 66.1 20 102.6 20 141.4 0 256-107.5 256-240S397.4 0 256 0 0 107.5 0 240zM94 407.9c9.3-17.1 7.4-38.1-4.8-53.2-26.1-32.3-41.2-71.9-41.2-114.7 0-103.2 90.2-192 208-192s208 88.8 208 192-90.2 192-208 192c-30.2 0-58.7-5.9-84.3-16.4-11.9-4.9-25.3-4.8-37.1 .3L76 440.9 94 407.9zM144 272a32 32 0 1 0 0-64 32 32 0 1 0 0 64zm144-32a32 32 0 1 0 -64 0 32 32 0 1 0 64 0zm80 32a32 32 0 1 0 0-64 32 32 0 1 0 0 64z"/></svg>
                            <p>${state.isAdmin ? 'اختر محادثة للبدء' : 'مرحباً! كيف يمكنني مساعدتك؟'}</p>
                            <span>${state.isAdmin ? 'سيظهر العملاء هنا عند مراسلتك' : 'اكتب رسالتك وسيتم الرد عليك من قبل الدعم الفني'}</span>
                        </div>
                    </div>

                    <div class="chat-widget-input">
                        <button class="attach-btn" onclick="window.chatWidget.attachFile()" title="إرفاق ملف">
                            <svg xmlns="http://www.w3.org/2000/svg" height="24" width="24" viewBox="0 0 512 512"><!--!Font Awesome Free v7.3.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2026 Fonticons, Inc.--><path fill="rgb(99, 230, 190)" d="M224.6 12.8c56.2-56.2 147.4-56.2 203.6 0s56.2 147.4 0 203.6l-164 164c-34.4 34.4-90.1 34.4-124.5 0s-34.4-90.1 0-124.5L292.5 103.3c12.5-12.5 32.8-12.5 45.3 0s12.5 32.8 0 45.3L185 301.3c-9.4 9.4-9.4 24.6 0 33.9s24.6 9.4 33.9 0l164-164c31.2-31.2 31.2-81.9 0-113.1s-81.9-31.2-113.1 0l-164 164c-53.1 53.1-53.1 139.2 0 192.3s139.2 53.1 192.3 0L428.3 284.3c12.5-12.5 32.8-12.5 45.3 0s12.5 32.8 0 45.3L343.4 459.6c-78.1 78.1-204.7 78.1-282.8 0s-78.1-204.7 0-282.8l164-164z"/></svg>
                        </button>
                        <input type="text" id="widgetInput" placeholder="${state.isAdmin ? 'اكتب ردك...' : 'اكتب رسالتك...'}" autocomplete="off" />
                        <button class="send-btn" id="widgetSendBtn" disabled onclick="window.chatWidget.sendMessage()">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </div>
                </div>
            </div>

            <input type="file" id="widgetFileInput" style="display:none" 
                   accept=".jpg,.jpeg,.png,.gif,.mp4,.avi,.mov,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar" 
                   multiple />
        `;
        document.body.appendChild(popup);
        elements.popup = popup;

        // تخزين المراجع
        elements.messages = document.getElementById('widgetMessages');
        elements.conversationsList = document.getElementById('convList');
        elements.input = document.getElementById('widgetInput');
        elements.sendBtn = document.getElementById('widgetSendBtn');
        elements.badge = document.getElementById('widgetBadge');
        elements.fileInput = document.getElementById('widgetFileInput');
        elements.avatar = document.getElementById('widgetAvatar');
        elements.name = document.getElementById('widgetName');
        elements.status = document.getElementById('widgetStatus');

        // ✅ ربط الدوال بـ window
        window.chatWidget = {
            init: init,
            open: openChat,
            close: closeChat,
            toggle: toggleChat,
            minimize: minimizeChat,
            sendMessage: sendMessage,
            attachFile: triggerFileUpload,
            downloadFile: downloadFile,
            openConversation: openConversation,
            getUnreadCount: getUnreadCount,
            markAsRead: markAsRead,
            getMessages: getMessages,
            refresh: loadConversations,
            isAdmin: state.isAdmin
        };
    }

    // ============================================================
    // تحميل المحادثات من الخادم
    // ============================================================
    async function loadConversations() {
        try {
            const token = getToken();
            if (!token) {
                renderConversations();
                return;
            }

            const response = await fetch(`${CONFIG.apiUrl}/chat/conversations`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`خطأ ${response.status}`);
            }

            const data = await response.json();
            if (data.success) {
                state.conversations = data.data || [];
                renderConversations();
                updateBadge();
                
                // إذا كان مديراً ووجدت محادثات، افتح الأولى
                if (state.isAdmin && state.conversations.length > 0 && !state.currentConversationId) {
                    openConversation(state.conversations[0].id);
                }
            }
        } catch (error) {
            console.error('❌ فشل تحميل المحادثات:', error);
        }
    }

    // ============================================================
    // تحميل رسائل محادثة
    // ============================================================
    async function loadMessages(conversationId) {
        try {
            const token = getToken();
            if (!token) {
                showToast('❌ يرجى تسجيل الدخول', 'error');
                return;
            }

            const response = await fetch(`${CONFIG.apiUrl}/chat/conversations/${conversationId}/messages`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`خطأ ${response.status}`);
            }

            const data = await response.json();
            if (data.success) {
                state.messages = data.data || [];
                state.currentConversationId = conversationId;
                renderMessages();
                scrollToBottom();
            }
        } catch (error) {
            console.error('❌ فشل تحميل الرسائل:', error);
        }
    }

    // ============================================================
    // عرض المحادثات
    // ============================================================
    function renderConversations() {
        const container = elements.conversationsList;
        if (!container) return;

        // إذا لم يكن المستخدم مديراً، نخفي قائمة المحادثات
        if (!state.isAdmin) {
            document.getElementById('chatConversations').style.display = 'none';
            return;
        }

        document.getElementById('chatConversations').style.display = 'flex';

        if (state.conversations.length === 0) {
            container.innerHTML = `
                <div class="conv-empty">
                    <svg xmlns="http://www.w3.org/2000/svg" height="32" width="36" viewBox="0 0 576 512"><!--!Font Awesome Free v7.3.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2026 Fonticons, Inc.--><path fill="rgb(255, 212, 59)" d="M76.2 258.7c6.1-15.2 4-32.6-5.6-45.9-14.5-20.1-22.6-43.7-22.6-68.8 0-66.8 60.5-128 144-128s144 61.2 144 128-60.5 128-144 128c-15.9 0-31.1-2.3-45.3-6.5-10.3-3.1-21.4-2.5-31.4 1.5l-50.4 20.2 11.4-28.5zM0 144c0 35.8 11.6 69.1 31.7 96.8L1.9 315.2c-1.3 3.2-1.9 6.6-1.9 10 0 14.8 12 26.8 26.8 26.8 3.4 0 6.8-.7 10-1.9l96.3-38.5c18.6 5.5 38.4 8.4 58.9 8.4 106 0 192-78.8 192-176S298-32 192-32 0 46.8 0 144zM384 512c20.6 0 40.3-3 58.9-8.4l96.3 38.5c3.2 1.3 6.6 1.9 10 1.9 14.8 0 26.8-12 26.8-26.8 0-3.4-.7-6.8-1.9-10l-29.7-74.4c20-27.8 31.7-61.1 31.7-96.8 0-82.4-61.7-151.5-145-170.7-1.6 16.3-5.1 31.9-10.1 46.9 63.9 14.8 107.2 67.3 107.2 123.9 0 25.1-8.1 48.7-22.6 68.8-9.6 13.3-11.7 30.6-5.6 45.9l11.4 28.5-50.4-20.2c-10-4-21.1-4.5-31.4-1.5-14.2 4.2-29.4 6.5-45.3 6.5-72.2 0-127.1-45.7-140.7-101.2-15.6 3.2-31.7 5-48.1 5.2 16.4 81.9 94.7 144 188.8 144z"/></svg>
                    <p>لا توجد محادثات</p>
                    <span style="font-size:0.75rem;color:var(--text-muted);">سيظهر العملاء هنا عند مراسلتك</span>
                </div>
            `;
            document.getElementById('convCount').textContent = '0';
            return;
        }

        let html = '';
        state.conversations.forEach(conv => {
            const isActive = conv.id === state.currentConversationId;
            const unread = conv.unreadCount || 0;
            const lastMsg = conv.lastMessage || 'لا توجد رسائل';
            
            const otherUser = conv.otherUser || {};
            const userName = otherUser.name || 'مستخدم';
            const userAvatar = otherUser.avatar || userName.charAt(0) || 'م';
            const userRole = otherUser.role || 'client';
            
            const roleColors = {
                admin: 'admin',
                client: 'client',
                expert: 'expert'
            };
            
            const roleLabels = {
                admin: 'مدير',
                client: 'عميل',
                expert: 'خبير'
            };

            html += `
                <div class="conv-item ${isActive ? 'active' : ''}" onclick="window.chatWidget.openConversation('${conv.id}')">
                    <div class="avatar ${roleColors[userRole] || 'client'}">${userAvatar}</div>
                    <div class="info">
                        <div class="name">
                            ${userName}
                            <span class="role">${roleLabels[userRole] || 'مستخدم'}</span>
                        </div>
                        <div class="last-msg">${lastMsg}</div>
                    </div>
                    ${unread > 0 ? `<div class="unread">${unread}</div>` : ''}
                </div>
            `;
        });

        container.innerHTML = html;
        document.getElementById('convCount').textContent = state.conversations.length;
    }

    // ============================================================
    // فتح محادثة
    // ============================================================
    function openConversation(conversationId) {
        if (state.currentConversationId === conversationId) return;
        
        // تحديث الإشعارات
        const conv = state.conversations.find(c => c.id === conversationId);
        if (conv) {
            conv.unreadCount = 0;
            renderConversations();
            updateBadge();
        }
        
        loadMessages(conversationId);
    }

    // ============================================================
    // عرض الرسائل
    // ============================================================
    function renderMessages() {
        const container = elements.messages;
        if (!container) return;

        container.innerHTML = '';

        if (state.messages.length === 0) {
            container.innerHTML = `
                <div class="widget-empty-state">
                    <svg xmlns="http://www.w3.org/2000/svg" height="32" width="32" viewBox="0 0 512 512"><!--!Font Awesome Free v7.3.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2026 Fonticons, Inc.--><path fill="rgb(116, 192, 252)" d="M0 240c0 54.4 19.3 104.6 51.9 144.9L3.1 474.3c-2 3.7-3.1 7.9-3.1 12.2 0 14.1 11.4 25.5 25.5 25.5 4 0 7.8-.6 11.5-2.1L153.4 460c31.4 12.9 66.1 20 102.6 20 141.4 0 256-107.5 256-240S397.4 0 256 0 0 107.5 0 240zM94 407.9c9.3-17.1 7.4-38.1-4.8-53.2-26.1-32.3-41.2-71.9-41.2-114.7 0-103.2 90.2-192 208-192s208 88.8 208 192-90.2 192-208 192c-30.2 0-58.7-5.9-84.3-16.4-11.9-4.9-25.3-4.8-37.1 .3L76 440.9 94 407.9zM144 272a32 32 0 1 0 0-64 32 32 0 1 0 0 64zm144-32a32 32 0 1 0 -64 0 32 32 0 1 0 64 0zm80 32a32 32 0 1 0 0-64 32 32 0 1 0 0 64z"/></svg>
                    <p>${state.isAdmin ? 'لا توجد رسائل في هذه المحادثة' : 'مرحباً! كيف يمكنني مساعدتك؟'}</p>
                    <span>${state.isAdmin ? 'انتظر ردود العملاء' : 'اكتب رسالتك وسيتم الرد عليك'}</span>
                </div>
            `;
            return;
        }

        state.messages.forEach((msg) => {
            const div = document.createElement('div');
            const isOwn = msg.senderId === state.user.id;
            div.className = `msg ${isOwn ? 'sent' : 'received'}`;

            let content = msg.text || '';

            if (msg.file) {
                const isImage = msg.file.type && msg.file.type.startsWith('image/');
                if (isImage) {
                    content += `<img src="${msg.file.data}" class="msg-image" 
                               onclick="window.open('${msg.file.data}', '_blank')" />`;
                } else {
                    const iconMap = {
                        'pdf': 'fa-file-pdf',
                        'doc': 'fa-file-word',
                        'docx': 'fa-file-word',
                        'xls': 'fa-file-excel',
                        'xlsx': 'fa-file-excel',
                        'ppt': 'fa-file-powerpoint',
                        'pptx': 'fa-file-powerpoint',
                        'zip': 'fa-file-archive',
                        'rar': 'fa-file-archive',
                        'mp4': 'fa-file-video',
                        'txt': 'fa-file-alt'
                    };
                    const ext = msg.file.name.split('.').pop().toLowerCase();
                    const icon = iconMap[ext] || 'fa-file';
                    const fileSize = msg.file.size ? (msg.file.size / 1024).toFixed(1) : '0';

                    content += `
                        <div class="file-attachment" onclick="window.chatWidget.downloadFile('${msg.file.name}', '${msg.file.data}')">
                            <i class="fas ${icon}"></i>
                            <span class="file-name">${msg.file.name}</span>
                            <span class="file-size">${fileSize} KB</span>
                            <i class="fas fa-download"></i>
                        </div>
                    `;
                }
            }

            const senderName = msg.senderName || (isOwn ? 'أنت' : 'المرسل');
            const time = new Date(msg.createdAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
            content += `<span class="time">${senderName} • ${time}</span>`;
            div.innerHTML = content;
            container.appendChild(div);
        });

        scrollToBottom();
    }

    // ============================================================
    // إرسال رسالة
    // ============================================================
    async function sendMessage() {
        const text = elements.input.value.trim();
        if (!text && !state.pendingFile) return;

        const token = getToken();
        if (!token) {
            showToast('❌ يرجى تسجيل الدخول لإرسال رسالة', 'error');
            return;
        }

        // إذا لم تكن هناك محادثة مفتوحة
        if (!state.currentConversationId) {
            // إذا كان المستخدم مديراً، لا يمكنه بدء محادثة جديدة بدون عميل محدد
            if (state.isAdmin) {
                showToast('❌ اختر محادثة من القائمة أولاً', 'error');
                return;
            }
            
            // العميل يبدأ محادثة جديدة مع المدير
            const adminId = await createConversationWithAdmin();
            if (!adminId) {
                showToast('❌ لا يمكن إنشاء محادثة جديدة', 'error');
                return;
            }
            state.currentConversationId = adminId;
        }

        // تحويل الملف إلى Base64
        let fileData = null;
        if (state.pendingFile) {
            fileData = {
                name: state.pendingFile.name,
                type: state.pendingFile.type,
                size: state.pendingFile.size,
                data: state.pendingFile.data
            };
        }

        const messageData = {
            conversationId: state.currentConversationId,
            text: text || '📎 ملف مرفق',
            file: fileData
        };

        try {
            const response = await fetch(`${CONFIG.apiUrl}/chat/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(messageData)
            });

            if (!response.ok) {
                throw new Error(`خطأ ${response.status}`);
            }

            const data = await response.json();
            if (data.success) {
                // إضافة الرسالة محلياً
                const newMsg = {
                    id: data.data.id,
                    senderId: state.user.id,
                    senderName: state.user.name,
                    text: data.data.text,
                    file: data.data.file || null,
                    createdAt: data.data.createdAt
                };
                state.messages.push(newMsg);
                renderMessages();
                scrollToBottom();
                
                // تحديث آخر رسالة في المحادثة
                const conv = state.conversations.find(c => c.id === state.currentConversationId);
                if (conv) {
                    conv.lastMessage = text || '📎 ملف مرفق';
                    renderConversations();
                }
                
                // تنظيف
                state.pendingFile = null;
                elements.input.value = '';
                elements.sendBtn.disabled = true;
                
                showToast('✅ تم إرسال الرسالة', 'success');
                
                // بعد إرسال الرسالة، تأكد من تحديث قائمة المحادثات للمدير
                if (!state.isAdmin) {
                    // تحديث المحادثات بعد ثانيتين لظهورها عند المدير
                    setTimeout(() => {
                        loadConversations();
                    }, 2000);
                }
            }
        } catch (error) {
            console.error('❌ فشل إرسال الرسالة:', error);
            showToast('❌ فشل إرسال الرسالة', 'error');
        }
    }

    // ============================================================
    // إنشاء محادثة مع المدير
    // ============================================================
    async function createConversationWithAdmin() {
        try {
            const token = getToken();
            
            const response = await fetch(`${CONFIG.apiUrl}/chat/conversations`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    userId: 'admin', // يبحث عن أول مدير في النظام
                    userRole: 'admin'
                })
            });
            
            if (!response.ok) {
                throw new Error(`خطأ ${response.status}`);
            }
            
            const data = await response.json();
            if (data.success) {
                // إضافة المحادثة الجديدة إلى القائمة
                const newConv = {
                    id: data.data._id,
                    otherUser: {
                        name: 'الدعم الفني',
                        role: 'admin',
                        avatar: 'ا'
                    },
                    lastMessage: 'مرحباً! كيف يمكنني مساعدتك؟',
                    unreadCount: 0
                };
                state.conversations.unshift(newConv);
                renderConversations();
                return data.data._id;
            }
        } catch (error) {
            console.error('❌ فشل إنشاء المحادثة:', error);
        }
        return null;
    }

    // ============================================================
    // دوال مساعدة
    // ============================================================
    function toggleChat() {
        state.isOpen ? closeChat() : openChat();
    }

    function openChat() {
        state.isOpen = true;
        elements.popup.classList.add('open');
        elements.popup.classList.remove('minimized');
        
        // تحديث المحادثات
        loadConversations();
        
        // إذا كان العميل وليس لديه محادثة، نعرض رسالة ترحيب
        if (!state.isAdmin && state.conversations.length === 0) {
            // نعرض رسالة ترحيب في منطقة الرسائل
            const container = elements.messages;
            container.innerHTML = `
                <div class="widget-empty-state">
                    <svg xmlns="http://www.w3.org/2000/svg" height="32" width="32" viewBox="0 0 512 512"><!--!Font Awesome Free v7.3.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2026 Fonticons, Inc.--><path fill="rgb(116, 192, 252)" d="M0 240c0 54.4 19.3 104.6 51.9 144.9L3.1 474.3c-2 3.7-3.1 7.9-3.1 12.2 0 14.1 11.4 25.5 25.5 25.5 4 0 7.8-.6 11.5-2.1L153.4 460c31.4 12.9 66.1 20 102.6 20 141.4 0 256-107.5 256-240S397.4 0 256 0 0 107.5 0 240zM94 407.9c9.3-17.1 7.4-38.1-4.8-53.2-26.1-32.3-41.2-71.9-41.2-114.7 0-103.2 90.2-192 208-192s208 88.8 208 192-90.2 192-208 192c-30.2 0-58.7-5.9-84.3-16.4-11.9-4.9-25.3-4.8-37.1 .3L76 440.9 94 407.9zM144 272a32 32 0 1 0 0-64 32 32 0 1 0 0 64zm144-32a32 32 0 1 0 -64 0 32 32 0 1 0 64 0zm80 32a32 32 0 1 0 0-64 32 32 0 1 0 0 64z"/></svg>
                    <p>مرحباً! كيف يمكنني مساعدتك؟</p>
                    <span>اكتب رسالتك وسيتم الرد عليك من قبل الدعم الفني</span>
                </div>
            `;
        }
        
        setTimeout(() => {
            elements.input.focus();
        }, 300);
    }

    function closeChat() {
        state.isOpen = false;
        elements.popup.classList.remove('open');
        elements.popup.classList.remove('minimized');
    }

    function minimizeChat() {
        elements.popup.classList.toggle('minimized');
    }

    function triggerFileUpload() {
        elements.fileInput.click();
    }

    function downloadFile(name, data) {
        const link = document.createElement('a');
        link.href = data;
        link.download = name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast(`✅ تم تنزيل الملف: ${name}`, 'success');
    }

    function getUnreadCount() {
        let total = 0;
        state.conversations.forEach(conv => {
            total += (conv.unreadCount || 0);
        });
        return total;
    }

    function markAsRead() {
        state.conversations.forEach(conv => {
            conv.unreadCount = 0;
        });
        updateBadge();
        renderConversations();
    }

    function getMessages() {
        return state.messages;
    }

    function updateBadge() {
        const badge = elements.badge;
        if (!badge) return;

        const totalUnread = getUnreadCount();
        if (totalUnread > 0) {
            badge.style.display = 'flex';
            badge.textContent = totalUnread > 99 ? '99+' : totalUnread;
        } else {
            badge.style.display = 'none';
        }
    }

    function scrollToBottom() {
        setTimeout(() => {
            elements.messages.scrollTop = elements.messages.scrollHeight;
        }, 50);
    }

    // ============================================================
    // مستمعي الأحداث
    // ============================================================
    function setupEventListeners() {
        elements.btn.addEventListener('click', toggleChat);

        elements.input.addEventListener('input', function() {
            elements.sendBtn.disabled = !this.value.trim() && !state.pendingFile;
        });

        elements.input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        elements.fileInput.addEventListener('change', function(event) {
            const files = event.target.files;
            if (!files || files.length === 0) return;

            const file = files[0];
            const reader = new FileReader();

            reader.onload = function(e) {
                state.pendingFile = {
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    data: e.target.result
                };

                elements.input.value = `📎 ${file.name}`;
                elements.input.focus();
                elements.sendBtn.disabled = false;
                showToast(`✅ تم رفع الملف: ${file.name}`, 'success');
            };

            reader.readAsDataURL(file);
            event.target.value = '';
        });

        // تحديث الإشعارات كل 10 ثوانٍ
        setInterval(() => {
            if (state.isOpen) {
                loadConversations();
            } else {
                updateBadge();
            }
        }, 10000);
    }

    // ============================================================
    // Toast
    // ============================================================
    function showToast(message, type = 'success') {
        const existing = document.querySelector('.widget-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = 'widget-toast';
        toast.textContent = message;
        
        const colors = {
            success: 'linear-gradient(135deg, #10B981, #059669)',
            error: 'linear-gradient(135deg, #EF4444, #DC2626)',
            warning: 'linear-gradient(135deg, #F59E0B, #D97706)',
            info: 'linear-gradient(135deg, #3B82F6, #2563EB)'
        };

        Object.assign(toast.style, {
            position: 'fixed',
            bottom: '310px',
            left: '100px',
            padding: '10px 20px',
            borderRadius: '12px',
            color: '#fff',
            fontWeight: '600',
            zIndex: '9999',
            fontFamily: "'Cairo', sans-serif",
            fontSize: '0.85rem',
            background: colors[type] || colors.info,
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
            maxWidth: '300px',
            direction: 'rtl'
        });

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-10px)';
            toast.style.transition = 'all 0.5s ease';
            setTimeout(() => toast.remove(), 500);
        }, 3000);
    }

    // ============================================================
    // التهيئة
    // ============================================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // ============================================================
    // تصدير
    // ============================================================
    window.ChatWidget = {
        init: init,
        open: openChat,
        close: closeChat,
        toggle: toggleChat,
        minimize: minimizeChat,
        sendMessage: sendMessage,
        attachFile: triggerFileUpload,
        downloadFile: downloadFile,
        openConversation: openConversation,
        getUnreadCount: getUnreadCount,
        markAsRead: markAsRead,
        getMessages: getMessages,
        refresh: loadConversations,
        isAdmin: state.isAdmin,
        state: state
    };

    console.log('💬 Chat Widget initialized successfully!');
    console.log('👤 المستخدم:', state.user);
    console.log('👑 مدير:', state.isAdmin);

})();// ============================================================
// نظام الدردشة العائم - Chat Widget
// النسخة النهائية - مع دعم GridFS
// ============================================================

(function() {
    'use strict';

    // ============================================================
    // التكوين الأساسي
    // ============================================================
    const CONFIG = {
        apiUrl: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
            ? 'http://localhost:5000/api' 
            : 'https://irteqa.onrender.com/api',
        maxFileSize: 20 * 1024 * 1024,
        allowedFileTypes: [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'video/mp4', 'video/avi', 'video/mov', 'video/webm',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'application/zip', 'application/x-zip-compressed',
            'text/plain'
        ]
    };

    // ============================================================
    // الحالة العامة
    // ============================================================
    let state = {
        messages: [],
        conversations: [],
        unreadCount: 0,
        isOpen: false,
        isInitialized: false,
        pendingFile: null,
        user: {
            id: null,
            name: 'زائر',
            role: 'client',
            avatar: 'ز'
        },
        currentConversationId: null,
        isConnected: false,
        ws: null,
        reconnectCount: 0,
        isAdmin: false
    };

    // ============================================================
    // DOM Elements
    // ============================================================
    let elements = {};

    // ============================================================
    // جلب التوكن والمستخدم
    // ============================================================
    function getToken() {
        return localStorage.getItem('token') || '';
    }

    function getUser() {
        try {
            const userData = JSON.parse(localStorage.getItem('user') || 'null');
            if (userData) {
                return {
                    id: userData.id || userData._id || null,
                    name: userData.name || 'مستخدم',
                    role: userData.role || 'client',
                    email: userData.email || '',
                    avatar: userData.name ? userData.name.charAt(0) : 'م'
                };
            }
        } catch (e) {
            console.warn('⚠️ فشل جلب بيانات المستخدم:', e);
        }
        return {
            id: 'guest_' + Date.now(),
            name: 'زائر',
            role: 'client',
            avatar: 'ز'
        };
    }

    // ============================================================
    // تهيئة الدردشة
    // ============================================================
    function init() {
        if (state.isInitialized) return;
        
        const user = getUser();
        state.user = { ...state.user, ...user };
        state.isAdmin = state.user.role === 'admin' || state.user.role === 'expert';
        
        createWidgetElements();
        loadConversations();
        setupEventListeners();
        
        state.isInitialized = true;
        
        console.log('💬 نظام الدردشة العائم جاهز!');
        console.log('👤 المستخدم:', state.user);
        console.log('👑 مدير:', state.isAdmin);
    }

    // ============================================================
    // إنشاء عناصر الدردشة مع SVG بدلاً من Font Awesome
    // ============================================================
    function createWidgetElements() {
        // ✅ زر الدردشة
        const btn = document.createElement('button');
        btn.className = 'chat-widget-btn';
        btn.id = 'chatWidgetBtn';
        btn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" height="32" width="32" viewBox="0 0 512 512"><path fill="rgb(255, 212, 59)" d="M256 480c141.4 0 256-107.5 256-240S397.4 0 256 0 0 107.5 0 240c0 54.3 19.2 104.3 51.6 144.5L2.8 476.8c-4.8 9-3.3 20 3.6 27.5s17.8 9.8 27.1 5.8l118.4-50.7C183.7 472.6 218.9 480 256 480zM128 208a32 32 0 1 1 0 64 32 32 0 1 1 0-64zm128 0a32 32 0 1 1 0 64 32 32 0 1 1 0-64zm96 32a32 32 0 1 1 64 0 32 32 0 1 1 -64 0z"/></svg>
            <span class="chat-widget-badge" id="widgetBadge" style="display:none;">0</span>
        `;
        document.body.appendChild(btn);
        elements.btn = btn;

        // ✅ نافذة الدردشة
        const popup = document.createElement('div');
        popup.className = 'chat-widget-popup';
        popup.id = 'chatWidgetPopup';
        
        popup.innerHTML = `
            <div class="chat-widget-header">
                <div class="info">
                    <div class="avatar" id="widgetAvatar">${state.isAdmin ? 'م' : 'ا'}</div>
                    <div class="details">
                        <div class="name" id="widgetName">${state.isAdmin ? 'لوحة الإدارة' : 'الدعم الفني'}</div>
                        <div class="status" id="widgetStatus">
                            <span class="dot online"></span> متصل الآن
                        </div>
                    </div>
                </div>
                <div class="header-actions">
                    <button class="minimize-btn" onclick="window.chatWidget.minimize()" title="تصغير">
                        <svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" viewBox="0 0 448 512"><path fill="rgb(116, 192, 252)" d="M0 256a32 32 0 0 1 32-32l384 0a32 32 0 0 1 0 64L32 288a32 32 0 0 1-32-32z"/></svg>
                    </button>
                    <button class="close-btn" onclick="window.chatWidget.close()" title="إغلاق">
                        <svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" viewBox="0 0 384 512"><path fill="rgb(116, 192, 252)" d="M376.6 84.5c11.3-13.6 9.5-33.8-4.1-45.1s-33.8-9.5-45.1 4.1L192 206 56.6 43.5C45.3 29.9 25.1 28.1 11.5 39.4S-3.9 70.9 7.4 84.5L150.3 256 7.4 427.5c-11.3 13.6-9.5 33.8 4.1 45.1s33.8 9.5 45.1-4.1L192 306 327.4 468.5c11.3 13.6 31.5 15.4 45.1 4.1s15.4-31.5 4.1-45.1L233.7 256 376.6 84.5z"/></svg>
                    </button>
                </div>
            </div>

            <div class="chat-widget-body">
                <div class="chat-conversations" id="chatConversations" style="${state.isAdmin ? '' : 'display:none;'}">
                    <div class="conv-header">
                        <span>المحادثات</span>
                        <span class="conv-count" id="convCount">0</span>
                    </div>
                    <div class="conv-list" id="convList">
                        <div class="conv-empty">
                            <svg xmlns="http://www.w3.org/2000/svg" height="32" width="36" viewBox="0 0 576 512"><path fill="rgb(255, 212, 59)" d="M76.2 258.7c6.1-15.2 4-32.6-5.6-45.9-14.5-20.1-22.6-43.7-22.6-68.8 0-66.8 60.5-128 144-128s144 61.2 144 128-60.5 128-144 128c-15.9 0-31.1-2.3-45.3-6.5-10.3-3.1-21.4-2.5-31.4 1.5l-50.4 20.2 11.4-28.5zM0 144c0 35.8 11.6 69.1 31.7 96.8L1.9 315.2c-1.3 3.2-1.9 6.6-1.9 10 0 14.8 12 26.8 26.8 26.8 3.4 0 6.8-.7 10-1.9l96.3-38.5c18.6 5.5 38.4 8.4 58.9 8.4 106 0 192-78.8 192-176S298-32 192-32 0 46.8 0 144zM384 512c20.6 0 40.3-3 58.9-8.4l96.3 38.5c3.2 1.3 6.6 1.9 10 1.9 14.8 0 26.8-12 26.8-26.8 0-3.4-.7-6.8-1.9-10l-29.7-74.4c20-27.8 31.7-61.1 31.7-96.8 0-82.4-61.7-151.5-145-170.7-1.6 16.3-5.1 31.9-10.1 46.9 63.9 14.8 107.2 67.3 107.2 123.9 0 25.1-8.1 48.7-22.6 68.8-9.6 13.3-11.7 30.6-5.6 45.9l11.4 28.5-50.4-20.2c-10-4-21.1-4.5-31.4-1.5-14.2 4.2-29.4 6.5-45.3 6.5-72.2 0-127.1-45.7-140.7-101.2-15.6 3.2-31.7 5-48.1 5.2 16.4 81.9 94.7 144 188.8 144z"/></svg>
                            <p>لا توجد محادثات</p>
                        </div>
                    </div>
                </div>

                <div class="chat-messages-wrapper">
                    <div class="chat-messages" id="widgetMessages">
                        <div class="widget-empty-state">
                            <svg xmlns="http://www.w3.org/2000/svg" height="32" width="32" viewBox="0 0 512 512"><path fill="rgb(116, 192, 252)" d="M0 240c0 54.4 19.3 104.6 51.9 144.9L3.1 474.3c-2 3.7-3.1 7.9-3.1 12.2 0 14.1 11.4 25.5 25.5 25.5 4 0 7.8-.6 11.5-2.1L153.4 460c31.4 12.9 66.1 20 102.6 20 141.4 0 256-107.5 256-240S397.4 0 256 0 0 107.5 0 240zM94 407.9c9.3-17.1 7.4-38.1-4.8-53.2-26.1-32.3-41.2-71.9-41.2-114.7 0-103.2 90.2-192 208-192s208 88.8 208 192-90.2 192-208 192c-30.2 0-58.7-5.9-84.3-16.4-11.9-4.9-25.3-4.8-37.1 .3L76 440.9 94 407.9zM144 272a32 32 0 1 0 0-64 32 32 0 1 0 0 64zm144-32a32 32 0 1 0 -64 0 32 32 0 1 0 64 0zm80 32a32 32 0 1 0 0-64 32 32 0 1 0 0 64z"/></svg>
                            <p>${state.isAdmin ? 'اختر محادثة للبدء' : 'مرحباً! كيف يمكنني مساعدتك؟'}</p>
                            <span>${state.isAdmin ? 'سيظهر العملاء هنا عند مراسلتك' : 'اكتب رسالتك وسيتم الرد عليك من قبل الدعم الفني'}</span>
                        </div>
                    </div>

                    <div class="chat-widget-input">
                        <button class="attach-btn" onclick="window.chatWidget.attachFile()" title="إرفاق ملف">
                            <svg xmlns="http://www.w3.org/2000/svg" height="24" width="24" viewBox="0 0 512 512"><path fill="rgb(99, 230, 190)" d="M224.6 12.8c56.2-56.2 147.4-56.2 203.6 0s56.2 147.4 0 203.6l-164 164c-34.4 34.4-90.1 34.4-124.5 0s-34.4-90.1 0-124.5L292.5 103.3c12.5-12.5 32.8-12.5 45.3 0s12.5 32.8 0 45.3L185 301.3c-9.4 9.4-9.4 24.6 0 33.9s24.6 9.4 33.9 0l164-164c31.2-31.2 31.2-81.9 0-113.1s-81.9-31.2-113.1 0l-164 164c-53.1 53.1-53.1 139.2 0 192.3s139.2 53.1 192.3 0L428.3 284.3c12.5-12.5 32.8-12.5 45.3 0s12.5 32.8 0 45.3L343.4 459.6c-78.1 78.1-204.7 78.1-282.8 0s-78.1-204.7 0-282.8l164-164z"/></svg>
                        </button>
                        <input type="text" id="widgetInput" placeholder="${state.isAdmin ? 'اكتب ردك...' : 'اكتب رسالتك...'}" autocomplete="off" />
                        <button class="send-btn" id="widgetSendBtn" disabled onclick="window.chatWidget.sendMessage()">
                            <svg xmlns="http://www.w3.org/2000/svg" height="24" width="27" viewBox="0 0 576 512"><path fill="rgb(99, 230, 190)" d="M290.5 287.7L491.4 86.9 359 456.3 290.5 287.7zM457.4 53L256.6 253.8 88 185.3 457.4 53zM38.1 216.8l205.8 83.6 83.6 205.8c5.3 13.1 18.1 21.7 32.3 21.7 14.7 0 27.8-9.2 32.8-23.1L570.6 8c3.5-9.8 1-20.6-6.3-28s-18.2-9.8-28-6.3L39.4 151.7c-13.9 5-23.1 18.1-23.1 32.8 0 14.2 8.6 27 21.7 32.3z"/></svg>
                        </button>
                    </div>
                </div>
            </div>

            <input type="file" id="widgetFileInput" style="display:none" 
                   accept=".jpg,.jpeg,.png,.gif,.mp4,.avi,.mov,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar" 
                   multiple />
        `;
        document.body.appendChild(popup);
        elements.popup = popup;

        elements.messages = document.getElementById('widgetMessages');
        elements.conversationsList = document.getElementById('convList');
        elements.input = document.getElementById('widgetInput');
        elements.sendBtn = document.getElementById('widgetSendBtn');
        elements.badge = document.getElementById('widgetBadge');
        elements.fileInput = document.getElementById('widgetFileInput');
        elements.avatar = document.getElementById('widgetAvatar');
        elements.name = document.getElementById('widgetName');
        elements.status = document.getElementById('widgetStatus');

        window.chatWidget = {
            init: init,
            open: openChat,
            close: closeChat,
            toggle: toggleChat,
            minimize: minimizeChat,
            sendMessage: sendMessage,
            attachFile: triggerFileUpload,
            downloadFile: downloadFile,
            openConversation: openConversation,
            getUnreadCount: getUnreadCount,
            markAsRead: markAsRead,
            getMessages: getMessages,
            refresh: loadConversations,
            isAdmin: state.isAdmin
        };
    }

    // ============================================================
    // تحميل المحادثات من الخادم
    // ============================================================
    async function loadConversations() {
        try {
            const token = getToken();
            if (!token) {
                renderConversations();
                return;
            }

            const response = await fetch(`${CONFIG.apiUrl}/chat/conversations`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`خطأ ${response.status}`);
            }

            const data = await response.json();
            if (data.success) {
                state.conversations = data.data || [];
                renderConversations();
                updateBadge();
                
                if (state.isAdmin && state.conversations.length > 0 && !state.currentConversationId) {
                    openConversation(state.conversations[0].id);
                }
            }
        } catch (error) {
            console.error('❌ فشل تحميل المحادثات:', error);
        }
    }

    // ============================================================
    // تحميل رسائل محادثة مع GridFS
    // ============================================================
    async function loadMessages(conversationId) {
        try {
            const token = getToken();
            if (!token) {
                showToast('❌ يرجى تسجيل الدخول', 'error');
                return;
            }

            const response = await fetch(`${CONFIG.apiUrl}/chat/conversations/${conversationId}/messages`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`خطأ ${response.status}`);
            }

            const data = await response.json();
            if (data.success) {
                state.messages = data.data || [];
                state.currentConversationId = conversationId;
                renderMessages();
                scrollToBottom();
            }
        } catch (error) {
            console.error('❌ فشل تحميل الرسائل:', error);
        }
    }

    // ============================================================
    // عرض المحادثات
    // ============================================================
    function renderConversations() {
        const container = elements.conversationsList;
        if (!container) return;

        if (!state.isAdmin) {
            document.getElementById('chatConversations').style.display = 'none';
            return;
        }

        document.getElementById('chatConversations').style.display = 'flex';

        if (state.conversations.length === 0) {
            container.innerHTML = `
                <div class="conv-empty">
                    <svg xmlns="http://www.w3.org/2000/svg" height="32" width="36" viewBox="0 0 576 512"><path fill="rgb(255, 212, 59)" d="M76.2 258.7c6.1-15.2 4-32.6-5.6-45.9-14.5-20.1-22.6-43.7-22.6-68.8 0-66.8 60.5-128 144-128s144 61.2 144 128-60.5 128-144 128c-15.9 0-31.1-2.3-45.3-6.5-10.3-3.1-21.4-2.5-31.4 1.5l-50.4 20.2 11.4-28.5zM0 144c0 35.8 11.6 69.1 31.7 96.8L1.9 315.2c-1.3 3.2-1.9 6.6-1.9 10 0 14.8 12 26.8 26.8 26.8 3.4 0 6.8-.7 10-1.9l96.3-38.5c18.6 5.5 38.4 8.4 58.9 8.4 106 0 192-78.8 192-176S298-32 192-32 0 46.8 0 144zM384 512c20.6 0 40.3-3 58.9-8.4l96.3 38.5c3.2 1.3 6.6 1.9 10 1.9 14.8 0 26.8-12 26.8-26.8 0-3.4-.7-6.8-1.9-10l-29.7-74.4c20-27.8 31.7-61.1 31.7-96.8 0-82.4-61.7-151.5-145-170.7-1.6 16.3-5.1 31.9-10.1 46.9 63.9 14.8 107.2 67.3 107.2 123.9 0 25.1-8.1 48.7-22.6 68.8-9.6 13.3-11.7 30.6-5.6 45.9l11.4 28.5-50.4-20.2c-10-4-21.1-4.5-31.4-1.5-14.2 4.2-29.4 6.5-45.3 6.5-72.2 0-127.1-45.7-140.7-101.2-15.6 3.2-31.7 5-48.1 5.2 16.4 81.9 94.7 144 188.8 144z"/></svg>
                    <p>لا توجد محادثات</p>
                    <span style="font-size:0.75rem;color:var(--text-muted);">سيظهر العملاء هنا عند مراسلتك</span>
                </div>
            `;
            document.getElementById('convCount').textContent = '0';
            return;
        }

        let html = '';
        state.conversations.forEach(conv => {
            const isActive = conv.id === state.currentConversationId;
            const unread = conv.unreadCount || 0;
            const lastMsg = conv.lastMessage || 'لا توجد رسائل';
            
            const otherUser = conv.otherUser || {};
            const userName = otherUser.name || 'مستخدم';
            const userAvatar = otherUser.avatar || userName.charAt(0) || 'م';
            const userRole = otherUser.role || 'client';
            
            const roleColors = {
                admin: 'admin',
                client: 'client',
                expert: 'expert'
            };
            
            const roleLabels = {
                admin: 'مدير',
                client: 'عميل',
                expert: 'خبير'
            };

            html += `
                <div class="conv-item ${isActive ? 'active' : ''}" onclick="window.chatWidget.openConversation('${conv.id}')">
                    <div class="avatar ${roleColors[userRole] || 'client'}">${userAvatar}</div>
                    <div class="info">
                        <div class="name">
                            ${userName}
                            <span class="role">${roleLabels[userRole] || 'مستخدم'}</span>
                        </div>
                        <div class="last-msg">${lastMsg}</div>
                    </div>
                    ${unread > 0 ? `<div class="unread">${unread}</div>` : ''}
                </div>
            `;
        });

        container.innerHTML = html;
        document.getElementById('convCount').textContent = state.conversations.length;
    }

    // ============================================================
    // فتح محادثة
    // ============================================================
    function openConversation(conversationId) {
        if (state.currentConversationId === conversationId) return;
        
        const conv = state.conversations.find(c => c.id === conversationId);
        if (conv) {
            conv.unreadCount = 0;
            renderConversations();
            updateBadge();
        }
        
        loadMessages(conversationId);
    }

    // ============================================================
    // عرض الرسائل مع دعم GridFS
    // ============================================================
    function renderMessages() {
        const container = elements.messages;
        if (!container) return;

        container.innerHTML = '';

        if (state.messages.length === 0) {
            container.innerHTML = `
                <div class="widget-empty-state">
                    <svg xmlns="http://www.w3.org/2000/svg" height="32" width="32" viewBox="0 0 512 512"><path fill="rgb(116, 192, 252)" d="M0 240c0 54.4 19.3 104.6 51.9 144.9L3.1 474.3c-2 3.7-3.1 7.9-3.1 12.2 0 14.1 11.4 25.5 25.5 25.5 4 0 7.8-.6 11.5-2.1L153.4 460c31.4 12.9 66.1 20 102.6 20 141.4 0 256-107.5 256-240S397.4 0 256 0 0 107.5 0 240zM94 407.9c9.3-17.1 7.4-38.1-4.8-53.2-26.1-32.3-41.2-71.9-41.2-114.7 0-103.2 90.2-192 208-192s208 88.8 208 192-90.2 192-208 192c-30.2 0-58.7-5.9-84.3-16.4-11.9-4.9-25.3-4.8-37.1 .3L76 440.9 94 407.9zM144 272a32 32 0 1 0 0-64 32 32 0 1 0 0 64zm144-32a32 32 0 1 0 -64 0 32 32 0 1 0 64 0zm80 32a32 32 0 1 0 0-64 32 32 0 1 0 0 64z"/></svg>
                    <p>${state.isAdmin ? 'لا توجد رسائل في هذه المحادثة' : 'مرحباً! كيف يمكنني مساعدتك؟'}</p>
                    <span>${state.isAdmin ? 'انتظر ردود العملاء' : 'اكتب رسالتك وسيتم الرد عليك'}</span>
                </div>
            `;
            return;
        }

        const baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
            ? 'http://localhost:5000'
            : 'https://irteqa.onrender.com';

        state.messages.forEach((msg) => {
            const div = document.createElement('div');
            const isOwn = msg.senderId === state.user.id;
            div.className = `msg ${isOwn ? 'sent' : 'received'}`;

            let content = msg.text || '';

            // ✅ عرض الملف من GridFS
            if (msg.file && msg.file.name) {
                const isImage = msg.file.type && msg.file.type.startsWith('image/');
                const isVideo = msg.file.type && msg.file.type.startsWith('video/');
                
                // ✅ بناء URL الملف الصحيح
                let fileUrl = msg.file.url || msg.file.path || msg.file.data || '';
                
                // إذا كان الملف في GridFS ولدينا fileId
                if (msg.file.fileId && !fileUrl) {
                    fileUrl = `${baseUrl}/api/chat/files/${msg.file.fileId}`;
                }
                
                // إذا كان الملف محلياً
                if (!fileUrl && msg.file.path) {
                    fileUrl = `${baseUrl}${msg.file.path}`;
                }

                if (isImage) {
                    content += `
                        <img src="${fileUrl}" class="msg-image" 
                             onclick="window.open('${fileUrl}', '_blank')" 
                             onerror="this.style.display='none'; console.error('❌ فشل تحميل الصورة')" 
                             alt="${msg.file.name}" />
                    `;
                } else if (isVideo) {
                    content += `
                        <video controls class="msg-video" onclick="this.paused ? this.play() : this.pause()">
                            <source src="${fileUrl}" type="${msg.file.type}" />
                            متصفحك لا يدعم تشغيل الفيديو
                        </video>
                    `;
                } else {
                    const iconMap = {
                        'pdf': 'fa-file-pdf',
                        'doc': 'fa-file-word',
                        'docx': 'fa-file-word',
                        'xls': 'fa-file-excel',
                        'xlsx': 'fa-file-excel',
                        'ppt': 'fa-file-powerpoint',
                        'pptx': 'fa-file-powerpoint',
                        'zip': 'fa-file-archive',
                        'rar': 'fa-file-archive',
                        'mp4': 'fa-file-video',
                        'txt': 'fa-file-alt'
                    };
                    const ext = msg.file.name.split('.').pop().toLowerCase();
                    const icon = iconMap[ext] || 'fa-file';
                    const fileSize = msg.file.size ? (msg.file.size / 1024).toFixed(1) : '0';

                    content += `
                        <div class="file-attachment" onclick="window.chatWidget.downloadFile('${msg.file.name}', '${fileUrl}')">
                            <i class="fas ${icon}"></i>
                            <span class="file-name">${msg.file.name}</span>
                            <span class="file-size">${fileSize} KB</span>
                            <i class="fas fa-download"></i>
                        </div>
                    `;
                }
            }

            const senderName = msg.senderName || (isOwn ? 'أنت' : 'المرسل');
            const time = new Date(msg.createdAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
            content += `<span class="time">${senderName} • ${time}</span>`;
            div.innerHTML = content;
            container.appendChild(div);
        });

        scrollToBottom();
    }

    // ============================================================
    // إرسال رسالة مع دعم GridFS
    // ============================================================
    async function sendMessage() {
        const text = elements.input.value.trim();
        if (!text && !state.pendingFile) return;

        const token = getToken();
        if (!token) {
            showToast('❌ يرجى تسجيل الدخول لإرسال رسالة', 'error');
            return;
        }

        if (!state.currentConversationId) {
            if (state.isAdmin) {
                showToast('❌ اختر محادثة من القائمة أولاً', 'error');
                return;
            }
            
            const adminId = await createConversationWithAdmin();
            if (!adminId) {
                showToast('❌ لا يمكن إنشاء محادثة جديدة', 'error');
                return;
            }
            state.currentConversationId = adminId;
        }

        let fileData = null;
        if (state.pendingFile) {
            fileData = {
                name: state.pendingFile.name,
                type: state.pendingFile.type,
                size: state.pendingFile.size,
                data: state.pendingFile.data
            };
        }

        const messageData = {
            conversationId: state.currentConversationId,
            text: text || '📎 ملف مرفق',
            file: fileData
        };

        try {
            const response = await fetch(`${CONFIG.apiUrl}/chat/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(messageData)
            });

            if (!response.ok) {
                throw new Error(`خطأ ${response.status}`);
            }

            const data = await response.json();
            if (data.success) {
                const newMsg = {
                    id: data.data.id,
                    senderId: state.user.id,
                    senderName: state.user.name,
                    text: data.data.text,
                    file: data.data.file || null,
                    createdAt: data.data.createdAt
                };
                state.messages.push(newMsg);
                renderMessages();
                scrollToBottom();
                
                const conv = state.conversations.find(c => c.id === state.currentConversationId);
                if (conv) {
                    conv.lastMessage = text || '📎 ملف مرفق';
                    renderConversations();
                }
                
                state.pendingFile = null;
                elements.input.value = '';
                elements.sendBtn.disabled = true;
                
                showToast('✅ تم إرسال الرسالة', 'success');
                
                if (!state.isAdmin) {
                    setTimeout(() => {
                        loadConversations();
                    }, 2000);
                }
            }
        } catch (error) {
            console.error('❌ فشل إرسال الرسالة:', error);
            showToast('❌ فشل إرسال الرسالة', 'error');
        }
    }

    // ============================================================
    // إنشاء محادثة مع المدير
    // ============================================================
    async function createConversationWithAdmin() {
        try {
            const token = getToken();
            
            const response = await fetch(`${CONFIG.apiUrl}/chat/conversations`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    userId: 'admin',
                    userRole: 'admin'
                })
            });
            
            if (!response.ok) {
                throw new Error(`خطأ ${response.status}`);
            }
            
            const data = await response.json();
            if (data.success) {
                const newConv = {
                    id: data.data._id,
                    otherUser: {
                        name: 'الدعم الفني',
                        role: 'admin',
                        avatar: 'ا'
                    },
                    lastMessage: 'مرحباً! كيف يمكنني مساعدتك؟',
                    unreadCount: 0
                };
                state.conversations.unshift(newConv);
                renderConversations();
                return data.data._id;
            }
        } catch (error) {
            console.error('❌ فشل إنشاء المحادثة:', error);
        }
        return null;
    }

    // ============================================================
    // دوال مساعدة
    // ============================================================
    function toggleChat() {
        state.isOpen ? closeChat() : openChat();
    }

    function openChat() {
        state.isOpen = true;
        elements.popup.classList.add('open');
        elements.popup.classList.remove('minimized');
        loadConversations();
        
        if (!state.isAdmin && state.conversations.length === 0) {
            const container = elements.messages;
            container.innerHTML = `
                <div class="widget-empty-state">
                    <svg xmlns="http://www.w3.org/2000/svg" height="32" width="32" viewBox="0 0 512 512"><path fill="rgb(116, 192, 252)" d="M0 240c0 54.4 19.3 104.6 51.9 144.9L3.1 474.3c-2 3.7-3.1 7.9-3.1 12.2 0 14.1 11.4 25.5 25.5 25.5 4 0 7.8-.6 11.5-2.1L153.4 460c31.4 12.9 66.1 20 102.6 20 141.4 0 256-107.5 256-240S397.4 0 256 0 0 107.5 0 240zM94 407.9c9.3-17.1 7.4-38.1-4.8-53.2-26.1-32.3-41.2-71.9-41.2-114.7 0-103.2 90.2-192 208-192s208 88.8 208 192-90.2 192-208 192c-30.2 0-58.7-5.9-84.3-16.4-11.9-4.9-25.3-4.8-37.1 .3L76 440.9 94 407.9zM144 272a32 32 0 1 0 0-64 32 32 0 1 0 0 64zm144-32a32 32 0 1 0 -64 0 32 32 0 1 0 64 0zm80 32a32 32 0 1 0 0-64 32 32 0 1 0 0 64z"/></svg>
                    <p>مرحباً! كيف يمكنني مساعدتك؟</p>
                    <span>اكتب رسالتك وسيتم الرد عليك من قبل الدعم الفني</span>
                </div>
            `;
        }
        
        setTimeout(() => {
            elements.input.focus();
        }, 300);
    }

    function closeChat() {
        state.isOpen = false;
        elements.popup.classList.remove('open');
        elements.popup.classList.remove('minimized');
    }

    function minimizeChat() {
        elements.popup.classList.toggle('minimized');
    }

    function triggerFileUpload() {
        elements.fileInput.click();
    }

    function downloadFile(name, data) {
        if (!data) {
            showToast('❌ لا توجد بيانات للتحميل', 'error');
            return;
        }
        
        try {
            const link = document.createElement('a');
            link.href = data;
            link.download = name || 'ملف';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showToast(`✅ تم تنزيل الملف: ${name}`, 'success');
        } catch (error) {
            console.error('❌ خطأ في تنزيل الملف:', error);
            showToast('❌ حدث خطأ في تنزيل الملف', 'error');
        }
    }

    function getUnreadCount() {
        let total = 0;
        state.conversations.forEach(conv => {
            total += (conv.unreadCount || 0);
        });
        return total;
    }

    function markAsRead() {
        state.conversations.forEach(conv => {
            conv.unreadCount = 0;
        });
        updateBadge();
        renderConversations();
    }

    function getMessages() {
        return state.messages;
    }

    function updateBadge() {
        const badge = elements.badge;
        if (!badge) return;

        const totalUnread = getUnreadCount();
        if (totalUnread > 0) {
            badge.style.display = 'flex';
            badge.textContent = totalUnread > 99 ? '99+' : totalUnread;
        } else {
            badge.style.display = 'none';
        }
    }

    function scrollToBottom() {
        setTimeout(() => {
            elements.messages.scrollTop = elements.messages.scrollHeight;
        }, 50);
    }

    // ============================================================
    // مستمعي الأحداث
    // ============================================================
    function setupEventListeners() {
        elements.btn.addEventListener('click', toggleChat);

        elements.input.addEventListener('input', function() {
            elements.sendBtn.disabled = !this.value.trim() && !state.pendingFile;
        });

        elements.input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        elements.fileInput.addEventListener('change', function(event) {
            const files = event.target.files;
            if (!files || files.length === 0) return;

            const file = files[0];
            
            if (file.size > CONFIG.maxFileSize) {
                showToast(`❌ حجم الملف كبير جداً. الحد الأقصى ${CONFIG.maxFileSize/1024/1024}MB`, 'error');
                event.target.value = '';
                return;
            }

            const reader = new FileReader();

            reader.onload = function(e) {
                state.pendingFile = {
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    data: e.target.result
                };

                elements.input.value = `📎 ${file.name}`;
                elements.input.focus();
                elements.sendBtn.disabled = false;
                showToast(`✅ تم رفع الملف: ${file.name}`, 'success');
            };

            reader.readAsDataURL(file);
            event.target.value = '';
        });

        setInterval(() => {
            if (state.isOpen) {
                loadConversations();
            } else {
                updateBadge();
            }
        }, 10000);
    }

    // ============================================================
    // Toast
    // ============================================================
    function showToast(message, type = 'success') {
        const existing = document.querySelector('.widget-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = 'widget-toast';
        toast.textContent = message;
        
        const colors = {
            success: 'linear-gradient(135deg, #10B981, #059669)',
            error: 'linear-gradient(135deg, #EF4444, #DC2626)',
            warning: 'linear-gradient(135deg, #F59E0B, #D97706)',
            info: 'linear-gradient(135deg, #3B82F6, #2563EB)'
        };

        Object.assign(toast.style, {
            position: 'fixed',
            bottom: '310px',
            left: '100px',
            padding: '10px 20px',
            borderRadius: '12px',
            color: '#fff',
            fontWeight: '600',
            zIndex: '9999',
            fontFamily: "'Cairo', sans-serif",
            fontSize: '0.85rem',
            background: colors[type] || colors.info,
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
            maxWidth: '300px',
            direction: 'rtl'
        });

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-10px)';
            toast.style.transition = 'all 0.5s ease';
            setTimeout(() => toast.remove(), 500);
        }, 3000);
    }

    // ============================================================
    // التهيئة
    // ============================================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // ============================================================
    // تصدير
    // ============================================================
    window.ChatWidget = {
        init: init,
        open: openChat,
        close: closeChat,
        toggle: toggleChat,
        minimize: minimizeChat,
        sendMessage: sendMessage,
        attachFile: triggerFileUpload,
        downloadFile: downloadFile,
        openConversation: openConversation,
        getUnreadCount: getUnreadCount,
        markAsRead: markAsRead,
        getMessages: getMessages,
        refresh: loadConversations,
        isAdmin: state.isAdmin,
        state: state
    };

    console.log('💬 Chat Widget initialized successfully!');
    console.log('👤 المستخدم:', state.user);
    console.log('👑 مدير:', state.isAdmin);

})();