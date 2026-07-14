// backend/models/Video.js
const mongoose = require('mongoose');

const VideoSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    subjectId: {
        type: String,
        required: true
    },
    subjectName: {
        type: String,
        required: true,
        trim: true
    },
    specialtyName: {
        type: String,
        default: '',
        trim: true
    },
    universityName: {
        type: String,
        default: '',
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
    filePath: {
        type: String,
        required: true
    },
    fileSize: {
        type: String,
        default: '0 MB'
    },
    fileType: {
        type: String,
        default: 'video/mp4'
    },
    fileId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'uploads.files'
    },
    duration: {
        type: String,
        default: '00:00'
    },
    uploadDate: {
        type: Date,
        default: Date.now
    },
    views: {
        type: Number,
        default: 0
    },
    storageProvider: {
        type: String,
        enum: ['local', 'gridfs', 'cloudinary'],
        default: 'gridfs'
    }
}, {
    timestamps: true
});

// فهارس للبحث السريع
VideoSchema.index({ subjectId: 1 });
VideoSchema.index({ uploadDate: -1 });
VideoSchema.index({ title: 'text', subjectName: 'text' });

module.exports = mongoose.model('Video', VideoSchema);