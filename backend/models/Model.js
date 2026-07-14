// backend/models/Model.js
const mongoose = require('mongoose');

const ModelSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        default: ''
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
        default: 'application/octet-stream'
    },
    fileData: {
        type: String,
        required: true
    },
    mainService: {
        type: String,
        required: true
    },
    subService: {
        type: String,
        default: 'خدمة فرعية'
    },
    uploadedBy: {
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
ModelSchema.index({ title: 'text', category: 'text' });
ModelSchema.index({ mainService: 1 });
ModelSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Model', ModelSchema);