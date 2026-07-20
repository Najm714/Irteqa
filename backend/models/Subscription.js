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
        enum: ['material', 'summary', 'course', 'lecture', 'video', 'business'],
        required: true
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
        required: true,
        min: 0
    },
    phone: {
        type: String,
        required: true
    },
    paymentMethod: {
        type: String,
        enum: ['card', 'mada', 'alrajhi', 'bank_transfer'],
        default: 'card'
    },
    status: {
        type: String,
        enum: ['pending', 'active', 'cancelled', 'expired'],
        default: 'pending'
    },
    notes: {
        type: String,
        default: ''
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    activatedAt: {
        type: Date
    },
    expiresAt: {
        type: Date
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Subscription', SubscriptionSchema);