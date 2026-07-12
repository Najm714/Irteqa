const mongoose = require('mongoose');

const universitySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    icon: { type: String, default: 'fa-university' },
    count: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('University', universitySchema);