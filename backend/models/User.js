// backend/models/User.js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['user', 'client', 'expert', 'admin'],
        default: 'user'
    },
    avatar: {
        type: String,
        default: ''
    },
    isActive: {
        type: Boolean,
        default: true
    },
    expertise: {
        type: String,
        default: ''
    },
    bio: {
        type: String,
        default: ''
    },
    lastSeen: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// فهارس للبحث
UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ name: 'text' });

module.exports = mongoose.model('User', UserSchema);