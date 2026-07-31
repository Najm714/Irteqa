const mongoose = require('mongoose');

const SpecialtySchema = new mongoose.Schema({
    name: {
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
    icon: {
        type: String,
        default: 'fa-tag'
    },
    count: {
        type: Number,
        default: 0
    },
    description: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

// فهارس للبحث
SpecialtySchema.index({ name: 1 });
SpecialtySchema.index({ universityId: 1 });
SpecialtySchema.index({ collegeId: 1 });
SpecialtySchema.index({ name: 1, collegeId: 1 }, { unique: true });

module.exports = mongoose.model('Specialty', SpecialtySchema);