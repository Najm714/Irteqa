// backend/models/Video.js
const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
    title: { type: String, required: true },
    subjectId: { type: String, required: true },
    subjectName: { type: String, required: true },
    specialtyName: { type: String, default: '' },
    universityName: { type: String, default: '' },
    description: { type: String, default: '' },
    fileName: { type: String, required: true },
    filePath: { type: String, required: true },
    fileSize: { type: String, required: true },
    fileType: { type: String, required: true },
    duration: { type: String, default: '00:00' }, // ✅ إضافة مدة الفيديو
    views: { type: Number, default: 0 },
    uploadDate: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Video', videoSchema);