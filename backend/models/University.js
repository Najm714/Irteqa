// backend/models/University.js
const mongoose = require('mongoose');

const UniversitySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    icon: {
        type: String,
        default: 'fa-university'
    },
    count: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// فهرس للبحث
UniversitySchema.index({ name: 1 });

module.exports = mongoose.model('University', UniversitySchema);