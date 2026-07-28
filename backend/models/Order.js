// backend/models/Order.js
const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    // ============================================================
    // الحقول الأساسية
    // ============================================================
    id: { type: String, unique: true },
    serviceType: { type: String, default: 'خدمة' },
    title: { type: String, default: 'طلب جديد' },
    description: { type: String, default: '' },
    status: { 
        type: String, 
        enum: ['pending', 'in-progress', 'completed', 'revision', 'cancelled'],
        default: 'pending'
    },
    
    // ============================================================
    // المستخدم - اختياري للطلبات الخارجية
    // ============================================================
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User',
        required: false,
        default: null
    },
    
    assignedExpert: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User',
        default: null
    },
    assignedAt: { type: Date },
    deadline: { type: Date },
    budget: { type: Number, default: 0 },
    
    scope: {
        outputs: { type: String },
        duration: { type: String },
        price: { type: String }
    },
    
    timeline: [{
        event: { type: String },
        time: { type: Date, default: Date.now }
    }],
    
    files: [{
        name: { type: String },
        filename: { type: String },
        fileId: { type: String },
        fileSize: { type: String },
        size: { type: String },
        type: { type: String, enum: ['user', 'work', 'final'] },
        icon: { type: String },
        url: { type: String },
        path: { type: String }
    }],
    
    // ============================================================
    // بيانات العميل (لطلبات كلية الأعمال والصحية)
    // ============================================================
    name: { type: String },
    email: { type: String },
    phone: { type: String },
    department: { type: String },
    service: { type: String },
    requestType: { type: String },
    organization: { type: String },
    deliveryDate: { type: Date },
    notes: { type: String },
    termsAgreed: { type: Boolean, default: false },
    
    // ============================================================
    // نوع الطلب
    // ============================================================
    orderType: { 
        type: String, 
        enum: ['general', 'business', 'health', 'academic'],
        default: 'general'
    },
    
    // ============================================================
    // بيانات إضافية مرنة
    // ============================================================
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
    
}, {
    timestamps: true
});

// ============================================================
// إنشاء رقم طلب تلقائي
// ============================================================
OrderSchema.pre('save', async function(next) {
    if (!this.id) {
        try {
            const count = await mongoose.model('Order').countDocuments();
            const year = new Date().getFullYear().toString().slice(-2);
            const prefix = this.orderType === 'business' ? 'B' :
                          this.orderType === 'health' ? 'H' :
                          this.orderType === 'academic' ? 'A' : 'G';
            this.id = `${prefix}${year}-${String(count + 1).padStart(4, '0')}`;
        } catch (error) {
            this.id = `ORD-${Date.now().toString().slice(-8)}`;
        }
    }
    
    if (!this.title) {
        this.title = this.service || this.serviceType || 'طلب جديد';
    }
    
    next();
});

module.exports = mongoose.model('Order', OrderSchema);