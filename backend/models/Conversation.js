const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema({
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
    type: { type: String, enum: ['direct', 'group', 'request'], default: 'direct' },
    requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    unreadCount: { type: Number, default: 0 }
}, {
    timestamps: true
});

module.exports = mongoose.model('Conversation', ConversationSchema);