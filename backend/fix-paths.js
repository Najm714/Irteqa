// backend/fix-paths.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/draseh_platform';

mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ تم الاتصال بقاعدة البيانات'))
    .catch(err => console.error('❌ فشل الاتصال:', err));

const OrderSchema = new mongoose.Schema({
    files: [{
        filename: String,
        path: String,
        size: Number,
        uploadDate: Date
    }]
}, { collection: 'orders' });

const Order = mongoose.model('Order', OrderSchema);

async function fixFilePaths() {
    try {
        console.log('🔍 جاري البحث عن الملفات ذات المسارات الكاملة...');
        
        const orders = await Order.find({ 'files.0': { $exists: true } });
        console.log(`📦 تم العثور على ${orders.length} طلب يحتوي على ملفات`);
        
        let fixedCount = 0;
        
        for (const order of orders) {
            let updated = false;
            
            order.files = order.files.map(file => {
                // التحقق إذا كان المسار كاملاً
                if (file.path && (file.path.includes('C:/') || file.path.includes('C:\\') || file.path.includes('backend'))) {
                    // استخراج اسم الملف
                    const fileName = file.path.split('/').pop().split('\\').pop();
                    // حفظ المسار النسبي
                    const newPath = `uploads/${fileName}`;
                    console.log(`✅ تحديث: ${file.path} → ${newPath}`);
                    file.path = newPath;
                    updated = true;
                }
                return file;
            });
            
            if (updated) {
                await order.save();
                fixedCount++;
                console.log(`✅ تم تحديث الطلب: ${order._id}`);
            }
        }
        
        console.log(`🎉 تم تحديث ${fixedCount} طلب بنجاح!`);
        console.log('✅ يمكنك الآن تحميل الملفات بشكل صحيح');
        process.exit(0);
    } catch (error) {
        console.error('❌ خطأ:', error);
        process.exit(1);
    }
}

fixFilePaths();