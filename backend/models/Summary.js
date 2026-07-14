// backend/models/Summary.js
const mongoose = require('mongoose');

const SummarySchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    subject: {
        type: String,
        required: true,
        trim: true
    },
    pages: {
        type: Number,
        required: true
    },
    size: {
        type: String,
        required: true
    },
    fileName: {
        type: String,
        required: true
    },
    fileSize: {
        type: String,
        default: '0 KB'
    },
    fileType: {
        type: String,
        default: 'application/pdf'
    },
    fileData: {
        type: String,
        required: true
    },
    date: {
        type: String,
        default: ''
    },
    downloads: {
        type: Number,
        default: 0
    },
    price: {
        type: Number,
        default: 49
    },
    uploader: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    fileId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'uploads.files'
    },
    storageProvider: {
        type: String,
        enum: ['local', 'gridfs'],
        default: 'local'
    }
}, {
    timestamps: true
});

// فهارس للبحث
SummarySchema.index({ title: 'text', subject: 'text' });
SummarySchema.index({ createdAt: -1 });

module.exports = mongoose.model('Summary', SummarySchema);