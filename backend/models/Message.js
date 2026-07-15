// backend/models/Message.js
const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conversation',
        required: true
    },
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    text: {
        type: String,
        required: true
    },
    file: {
        name: {
            type: String,
            default: null
        },
        type: {
            type: String,
            default: null
        },
        size: {
            type: Number,
            default: 0
        },
        path: {
            type: String,
            default: null
        },
        url: {
            type: String,
            default: null
        },
        fileId: {
            type: String,
            default: null
        },
        uniqueFileId: {
            type: String,
            default: null
        },
        storageProvider: {
            type: String,
            enum: ['local', 'gridfs', 'cloudinary'],
            default: 'gridfs'
        },
        gridfsId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        }
    },
    read: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// ✅ فهارس للبحث السريع
MessageSchema.index({ conversationId: 1, createdAt: -1 });
MessageSchema.index({ senderId: 1 });
MessageSchema.index({ 'file.uniqueFileId': 1 });

module.exports = mongoose.model('Message', MessageSchema);