// backend/models/Order.js
const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    // ============================================================
    // الحقول الموجودة مسبقاً (للتوافق مع النظام الحالي)
    // ============================================================
    serviceType: {
        type: String,
        required: true,
        default: 'خدمة'
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    deadline: {
        type: Date,
        required: true
    },
    budget: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['pending', 'in-progress', 'completed', 'revision', 'cancelled'],
        default: 'pending'
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    assignedExpert: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    expertNotes: {
        type: String,
        default: ''
    },
    adminNotes: {
        type: String,
        default: ''
    },
    files: [{
        filename: String,
        filePath: String,
        fileId: String,
        fileSize: Number,
        mimeType: String,
        uploadDate: {
            type: Date,
            default: Date.now
        }
    }],
    assignedAt: {
        type: Date,
        default: null
    },

    // ============================================================
    // ✅ الحقول الجديدة لخدمات كلية الأعمال
    // ============================================================
    
    // معلومات العميل
    name: {
        type: String,
        required: false
    },
    email: {
        type: String,
        required: false
    },
    phone: {
        type: String,
        required: false
    },
    
    // معلومات الطلب الأكاديمي
    department: {
        type: String,
        required: false
    },
    service: {
        type: String,
        required: false
    },
    requestType: {
        type: String,
        required: false
    },
    organization: {
        type: String,
        default: ''
    },
    deliveryDate: {
        type: String,
        default: ''
    },
    notes: {
        type: String,
        default: ''
    },
    
    // الموافقة على الشروط
    termsAgreed: {
        type: Boolean,
        default: true
    },
    
    // معرف المستخدم (مرجع)
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    
    // تحديد نوع الطلب (للتمييز بين الطلبات العادية وطلبات الأعمال)
    orderType: {
        type: String,
        enum: ['general', 'business'],
        default: 'general'
    }
}, {
    timestamps: true
});

// ============================================================
// ✅ إنشاء فهارس للبحث السريع
// ============================================================

// فهرس النص الكامل للبحث (اسم، بريد، خدمة، عنوان، قسم)
OrderSchema.index({ 
    name: 'text', 
    email: 'text', 
    service: 'text', 
    title: 'text',
    department: 'text'
});

// فهارس للتصفية السريعة
OrderSchema.index({ status: 1 });
OrderSchema.index({ department: 1 });
OrderSchema.index({ orderType: 1 });
OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ userId: 1 });
OrderSchema.index({ assignedExpert: 1 });

// ============================================================
// ✅ دوال مساعدة (Methods)
// ============================================================

// جلب اسم العميل (يتحقق من الحقول المختلفة)
OrderSchema.methods.getCustomerName = function() {
    return this.name || (this.user && this.user.name) || 'مستخدم غير مسجل';
};

// جلب بريد العميل
OrderSchema.methods.getCustomerEmail = function() {
    return this.email || (this.user && this.user.email) || 'لا يوجد بريد';
};

// جلب رقم العميل
OrderSchema.methods.getCustomerPhone = function() {
    return this.phone || 'لا يوجد رقم';
};

// التحقق من وجود ملفات
OrderSchema.methods.hasFiles = function() {
    return this.files && this.files.length > 0;
};

// جلب عدد الملفات
OrderSchema.methods.getFileCount = function() {
    return this.files ? this.files.length : 0;
};

// ============================================================
// ✅ دوال ثابتة (Statics)
// ============================================================

// جلب طلبات الأعمال فقط
OrderSchema.statics.findBusinessOrders = function() {
    return this.find({ orderType: 'business' }).sort({ createdAt: -1 });
};

// جلب طلبات الأعمال حسب الحالة
OrderSchema.statics.findBusinessOrdersByStatus = function(status) {
    return this.find({ orderType: 'business', status: status }).sort({ createdAt: -1 });
};

// جلب طلبات مستخدم معين
OrderSchema.statics.findByUser = function(userId) {
    return this.find({ 
        $or: [
            { userId: userId },
            { user: userId }
        ]
    }).sort({ createdAt: -1 });
};

// جلب إحصائيات الطلبات
OrderSchema.statics.getStats = async function() {
    const stats = await this.aggregate([
        { $match: { orderType: 'business' } },
        { 
            $group: {
                _id: '$status',
                count: { $sum: 1 }
            }
        }
    ]);
    
    const result = {
        total: 0,
        pending: 0,
        'in-progress': 0,
        completed: 0,
        cancelled: 0,
        revision: 0
    };
    
    stats.forEach(stat => {
        result[stat._id] = stat.count;
        result.total += stat.count;
    });
    
    return result;
};

// جلب إحصائيات الأقسام
OrderSchema.statics.getDepartmentStats = async function() {
    return this.aggregate([
        { $match: { orderType: 'business', department: { $exists: true, $ne: '' } } },
        { 
            $group: {
                _id: '$department',
                count: { $sum: 1 }
            }
        },
        { $sort: { count: -1 } }
    ]);
};

// جلب إحصائيات الخدمات
OrderSchema.statics.getServiceStats = async function() {
    return this.aggregate([
        { $match: { orderType: 'business', service: { $exists: true, $ne: '' } } },
        { 
            $group: {
                _id: '$service',
                count: { $sum: 1 }
            }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
    ]);
};

// ============================================================
// ✅ Middleware لحفظ التحديثات
// ============================================================

// تحديث حقل updatedAt تلقائياً
OrderSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

// تعيين القيم الافتراضية للطلبات الجديدة
OrderSchema.pre('validate', function(next) {
    if (this.orderType === 'business') {
        // تعيين القيم الافتراضية لطلبات الأعمال
        if (!this.serviceType) this.serviceType = 'خدمة كلية الأعمال';
        if (!this.status) this.status = 'pending';
    }
    next();
});

// ============================================================
// ✅ تصدير النموذج
// ============================================================

module.exports = mongoose.model('Order', OrderSchema);