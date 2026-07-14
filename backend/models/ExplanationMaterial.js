// backend/models/ExplanationMaterial.js
const mongoose = require('mongoose');

const ExplanationMaterialSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    code: {
        type: String,
        required: true,
        trim: true
    },
    instructor: {
        type: String,
        required: true,
        trim: true
    },
    universityId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'University',
        required: true
    },
    icon: {
        type: String,
        default: 'fa-book'
    },
    videos: {
        type: Number,
        default: 0
    },
    description: {
        type: String,
        default: ''
    },
    isFeatured: {
        type: Boolean,
        default: false
    },
    price: {
        type: Number,
        default: 99
    }
}, {
    timestamps: true
});

// فهرس للبحث
ExplanationMaterialSchema.index({ title: 'text', code: 'text' });
ExplanationMaterialSchema.index({ universityId: 1 });

module.exports = mongoose.model('ExplanationMaterial', ExplanationMaterialSchema);