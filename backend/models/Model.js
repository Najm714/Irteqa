const mongoose = require('mongoose');

const modelSchema = new mongoose.Schema({
    title: { type: String, required: true },
    mainService: { 
        type: String, 
        required: true 
        // ✅ تم حذف enum بالكامل - يقبل أي قيمة
    },
    subService: { type: String, default: '' },
    category: { type: String, required: true },
    description: { type: String, default: '' },
    fileName: { type: String, required: true },
    fileSize: { type: String, required: true },
    fileType: { type: String, required: true },
    fileData: { type: String, required: true },
    uploadDate: { type: Date, default: Date.now },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

module.exports = mongoose.model('Model', modelSchema);