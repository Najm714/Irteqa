const mongoose = require('mongoose');

const CollegeSchema = new mongoose.Schema({
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
    icon: {
        type: String,
        default: 'fa-school'
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

// فهرس للبحث
CollegeSchema.index({ name: 1 });
CollegeSchema.index({ universityId: 1 });

// التحقق من uniqueness: اسم الكلية + الجامعة
CollegeSchema.index({ name: 1, universityId: 1 }, { unique: true });

module.exports = mongoose.model('College', CollegeSchema);