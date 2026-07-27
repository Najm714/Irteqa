const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    id: { type: String, unique: true },
    serviceType: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String },
    status: { 
        type: String, 
        enum: ['pending', 'in-progress', 'completed', 'revision', 'cancelled'],
        default: 'pending'
    },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assignedExpert: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
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
    // بيانات إضافية للطلبات
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
    orderType: { type: String, enum: ['general', 'business', 'health'], default: 'general' }
}, {
    timestamps: true
});

// إنشاء رقم طلب تلقائي
OrderSchema.pre('save', async function(next) {
    if (!this.id) {
        const count = await mongoose.model('Order').countDocuments();
        this.id = `REQ-${String(count + 1).padStart(4, '0')}`;
    }
    next();
});

module.exports = mongoose.model('Order', OrderSchema);