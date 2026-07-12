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
    // ✅ تعديل حقل file ليكون كائن
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
            default: null
        },
        path: {
            type: String,
            default: null
        },
        fileId: {
            type: String,
            default: null
        }
    },
    read: {
        type: Boolean,
        default: false
    },
    readAt: {
        type: Date,
        default: null
    },
    deleted: {
        type: Boolean,
        default: false
    },
    deletedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// فهارس للبحث السريع
MessageSchema.index({ conversationId: 1 });
MessageSchema.index({ senderId: 1 });
MessageSchema.index({ createdAt: -1 });
MessageSchema.index({ read: 1 });

module.exports = mongoose.model('Message', MessageSchema);