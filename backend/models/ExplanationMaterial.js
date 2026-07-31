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
    collegeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'College',
        required: true
    },
    specialtyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Specialty',
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
    },
    image: {
        type: String,
        default: ''
    },
    studentsCount: {
        type: Number,
        default: 0
    },
    rating: {
        type: Number,
        default: 4.5
    },
    duration: {
        type: Number,
        default: 0
    },
    quizzes: {
        type: Number,
        default: 0
    },
    instructorBio: {
        type: String,
        default: ''
    },
    features: {
        type: [String],
        default: []
    },
    units: {
        type: [{
            title: String,
            videos: [{
                title: String,
                duration: { type: String, default: '00:00' }
            }]
        }],
        default: []
    }
}, {
    timestamps: true
});

// فهارس للبحث
ExplanationMaterialSchema.index({ title: 1 });
ExplanationMaterialSchema.index({ code: 1 });
ExplanationMaterialSchema.index({ universityId: 1 });
ExplanationMaterialSchema.index({ collegeId: 1 });
ExplanationMaterialSchema.index({ specialtyId: 1 });
ExplanationMaterialSchema.index({ isFeatured: 1 });

module.exports = mongoose.model('ExplanationMaterial', ExplanationMaterialSchema);