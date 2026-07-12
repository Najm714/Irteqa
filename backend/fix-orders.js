// backend/fix-orders.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/draseh_platform';

mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ تم الاتصال بقاعدة البيانات'))
    .catch(err => console.error('❌ فشل الاتصال:', err));

const OrderSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assignedExpert: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    title: String,
    status: String
}, { collection: 'orders' });

const Order = mongoose.model('Order', OrderSchema);

async function fixOrders() {
    try {
        // ✅ 1. عرض جميع الطلبات
        const allOrders = await Order.find({});
        console.log(`📊 إجمالي الطلبات: ${allOrders.length}`);
        
        // ✅ 2. عرض الطلبات التي ليس لها مستخدم
        const nullUserOrders = await Order.find({ user: null });
        console.log(`📊 الطلبات بدون مستخدم: ${nullUserOrders.length}`);
        
        // ✅ 3. عرض الطلبات المسندة للخبراء
        const expertOrders = await Order.find({ assignedExpert: { $ne: null } });
        console.log(`📊 الطلبات المسندة للخبراء: ${expertOrders.length}`);
        
        // ✅ 4. عرض عينة من الطلبات بدون مستخدم
        if (nullUserOrders.length > 0) {
            console.log('\n📋 عينة من الطلبات بدون مستخدم:');
            nullUserOrders.slice(0, 5).forEach(order => {
                console.log(`   - "${order.title}" (ID: ${order._id}, الحالة: ${order.status})`);
            });
        }
        
        // ✅ 5. لا نقوم بحذف أي شيء، فقط نعرض المعلومات
        console.log('\n✅ تم الانتهاء - الكود الآن يتعامل مع user: null تلقائياً');
        console.log('💡 يمكنك ترك الطلبات كما هي، سيتم عرضها مع اسم "مستخدم غير مسجل"');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ خطأ:', error);
        process.exit(1);
    }
}

fixOrders();