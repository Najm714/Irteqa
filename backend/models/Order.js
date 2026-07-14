// backend/models/Order.js
const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    serviceType: {
        type: String,
        required: true,
        default: 'خدمة'
    },
    title: {
        type: String,
        required: true,
        default: 'طلب جديد'
    },
    description: {
        type: String,
        default: ''
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
        ref: 'User'
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    assignedExpert: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    assignedAt: {
        type: Date
    },
    expertNotes: {
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
        },
        publicId: String,
        cloudinaryUrl: String,
        storageProvider: {
            type: String,
            enum: ['local', 'gridfs'],
            default: 'local'
        }
    }],
    // حقول طلبات كلية الأعمال
    orderType: {
        type: String,
        enum: ['regular', 'business'],
        default: 'regular'
    },
    name: {
        type: String,
        default: ''
    },
    email: {
        type: String,
        default: ''
    },
    phone: {
        type: String,
        default: ''
    },
    department: {
        type: String,
        default: ''
    },
    service: {
        type: String,
        default: ''
    },
    requestType: {
        type: String,
        default: ''
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
    termsAgreed: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// فهارس للبحث السريع
OrderSchema.index({ user: 1 });
OrderSchema.index({ assignedExpert: 1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ orderType: 1 });

module.exports = mongoose.model('Order', OrderSchema);