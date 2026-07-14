// backend/models/Subscription.js
const mongoose = require('mongoose');

const SubscriptionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    subscriptionType: {
        type: String,
        required: true,
        enum: ['basic', 'premium', 'vip']
    },
    materialId: {
        type: String,
        required: true
    },
    title: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    paymentMethod: {
        type: String,
        enum: ['card', 'cash', 'bank'],
        default: 'card'
    },
    status: {
        type: String,
        enum: ['pending', 'active', 'cancelled'],
        default: 'pending'
    },
    notes: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

// فهارس للبحث
SubscriptionSchema.index({ user: 1 });
SubscriptionSchema.index({ status: 1 });
SubscriptionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Subscription', SubscriptionSchema);