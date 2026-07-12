// backend/models/Summary.js
const mongoose = require('mongoose');

const summarySchema = new mongoose.Schema({
    title: { type: String, required: true },
    subject: { type: String, required: true },
    pages: { type: Number, required: true },
    size: { type: String, required: true },
    fileName: { type: String, required: true },
    fileSize: { type: String, required: true },
    fileType: { type: String, required: true },
    fileData: { type: String, required: true },
    date: { type: String, default: () => new Date().toISOString().split('T')[0] },
    downloads: { type: Number, default: 0 },
    uploader: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    price: { type: Number, default: 49 } // ✅ سعر الاشتراك
}, { timestamps: true });

module.exports = mongoose.model('Summary', summarySchema);