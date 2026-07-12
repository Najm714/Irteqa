// backend/models/Subscription.js
const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    subscriptionType: { 
        type: String, 
        enum: ['material', 'summary'], 
        required: true 
    },
    materialId: { type: String, required: true },
    title: { type: String, required: true },
    price: { type: Number, required: true },
    phone: { type: String, required: true },
    paymentMethod: { type: String, required: true },
    status: { 
        type: String, 
        enum: ['pending', 'active', 'cancelled'], 
        default: 'pending' 
    },
    notes: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Subscription', subscriptionSchema);