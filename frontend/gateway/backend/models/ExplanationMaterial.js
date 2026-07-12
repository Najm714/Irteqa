// backend/models/ExplanationMaterial.js
const mongoose = require('mongoose');

const explanationMaterialSchema = new mongoose.Schema({
    title: { type: String, required: true },
    code: { type: String, required: true },
    instructor: { type: String, required: true },
    universityId: { type: mongoose.Schema.Types.ObjectId, ref: 'University', required: true },
    icon: { type: String, default: 'fa-book' },
    videos: { type: Number, default: 0 },
    description: { type: String, default: '' },
    isFeatured: { type: Boolean, default: false },
    price: { type: Number, default: 99 } // ✅ سعر الاشتراك
}, { timestamps: true });

module.exports = mongoose.model('ExplanationMaterial', explanationMaterialSchema);