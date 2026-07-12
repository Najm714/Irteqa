const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`✅ تم الاتصال بقاعدة البيانات بنجاح`);
    } catch (error) {
        console.error(`❌ فشل الاتصال بقاعدة البيانات: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;