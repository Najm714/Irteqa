const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String },
    file: {
        name: { type: String },
        type: { type: String },
        size: { type: String },
        path: { type: String },
        url: { type: String },
        fileId: { type: String },
        storageProvider: { type: String, default: 'gridfs' }
    },
    read: { type: Boolean, default: false },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, {
    timestamps: true
});

module.exports = mongoose.model('Message', MessageSchema);