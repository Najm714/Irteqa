const mongoose = require('mongoose');

const VideoSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    subjectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ExplanationMaterial',
        required: true
    },
    subjectName: {
        type: String,
        default: ''
    },
    specialtyName: {
        type: String,
        default: ''
    },
    universityName: {
        type: String,
        default: ''
    },
    collegeName: {
        type: String,
        default: ''
    },
    color: {
        type: String,
        default: '#7C3AED'
    },
    description: {
        type: String,
        default: ''
    },
    fileName: {
        type: String,
        default: ''
    },
    filePath: {
        type: String,
        default: ''
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
        type: String,
        default: ''
    },
    duration: {
        type: String,
        default: '00:00'
    },
    views: {
        type: Number,
        default: 0
    },
    thumbnail: {
        type: String,
        default: ''
    },
    tags: {
        type: [String],
        default: []
    },
    isFree: {
        type: Boolean,
        default: false
    },
    uploadDate: {
        type: Date,
        default: Date.now
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    uploadedByName: {
        type: String,
        default: ''
    },
    storageProvider: {
        type: String,
        default: 'gridfs'
    },
    // ✅ إضافة حقول للربط
    universityId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'University'
    },
    collegeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'College'
    },
    specialtyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Specialty'
    }
}, {
    timestamps: true
});

// فهارس للبحث
VideoSchema.index({ title: 1 });
VideoSchema.index({ subjectId: 1 });
VideoSchema.index({ universityId: 1 });
VideoSchema.index({ collegeId: 1 });
VideoSchema.index({ specialtyId: 1 });

module.exports = mongoose.model('Video', VideoSchema);