const nodemailer = require('nodemailer');

// ============================================================
// إعدادات البريد الإلكتروني
// ============================================================
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, // بريدك الإلكتروني
        pass: process.env.EMAIL_PASS  // كلمة مرور التطبيق
    }
});

// ============================================================
// دالة إرسال إيميل تأكيد للعميل
// ============================================================
const sendOrderConfirmation = async (order, user) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: `✅ تأكيد طلب الخدمة: ${order.title}`,
            html: `
                <div dir="rtl" style="font-family: 'Cairo', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8f9fa; border-radius: 12px;">
                    <h2 style="color: #1a1a2e;">✅ تم استلام طلبك بنجاح</h2>
                    <p style="color: #2d3436;">عزيزي <strong>${user.name}</strong>،</p>
                    <p style="color: #2d3436;">نشكرك على ثقتك بمنصة ارتقاء. تم استلام طلب الخدمة الخاص بك وسيتم مراجعته من قبل فريقنا في أقرب وقت.</p>
                    
                    <div style="background: #fff; padding: 15px; border-radius: 8px; border-right: 4px solid #6c5ce7; margin: 20px 0;">
                        <h3 style="color: #1a1a2e; margin-bottom: 10px;">📋 تفاصيل الطلب</h3>
                        <p><strong>نوع الخدمة:</strong> ${order.serviceType}</p>
                        <p><strong>العنوان:</strong> ${order.title}</p>
                        <p><strong>الوصف:</strong> ${order.description}</p>
                        <p><strong>حالة الطلب:</strong> قيد الانتظار</p>
                        <p><strong>تاريخ الطلب:</strong> ${new Date(order.createdAt).toLocaleDateString('ar-SA')}</p>
                    </div>
                    
                    <p style="color: #636e72; font-size: 0.9rem;">يمكنك متابعة حالة طلبك من خلال <a href="http://localhost:5500/dashboard.html" style="color: #6c5ce7; text-decoration: none;">لوحة التحكم</a>.</p>
                    
                    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
                    <p style="color: #636e72; font-size: 0.8rem; text-align: center;">
                        هذا البريد تم إرساله تلقائياً من منصة ارتقاء. يرجى عدم الرد على هذا البريد.
                    </p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ تم إرسال إيميل تأكيد للعميل: ${user.email}`);
        return true;
    } catch (error) {
        console.error('❌ فشل إرسال الإيميل:', error);
        return false;
    }
};

// ============================================================
// دالة إرسال إيميل للمدير عند طلب جديد
// ============================================================
const sendAdminNotification = async (order, user) => {
    try {
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@drasah.com';
        
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: adminEmail,
            subject: `🔔 طلب خدمة جديد من ${user.name}`,
            html: `
                <div dir="rtl" style="font-family: 'Cairo', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8f9fa; border-radius: 12px;">
                    <h2 style="color: #1a1a2e;">🔔 طلب خدمة جديد</h2>
                    <p style="color: #2d3436;">تم استلام طلب خدمة جديد من <strong>${user.name}</strong>.</p>
                    
                    <div style="background: #fff; padding: 15px; border-radius: 8px; border-right: 4px solid #e17055; margin: 20px 0;">
                        <h3 style="color: #1a1a2e; margin-bottom: 10px;">📋 تفاصيل الطلب</h3>
                        <p><strong>العميل:</strong> ${user.name} (${user.email})</p>
                        <p><strong>نوع الخدمة:</strong> ${order.serviceType}</p>
                        <p><strong>العنوان:</strong> ${order.title}</p>
                        <p><strong>الوصف:</strong> ${order.description}</p>
                        <p><strong>الميزانية:</strong> ${order.budget || 0} ريال</p>
                    </div>
                    
                    <p style="color: #636e72;">يمكنك مراجعة الطلب من خلال <a href="http://localhost:5500/admin.html" style="color: #6c5ce7; text-decoration: none;">لوحة تحكم المدير</a>.</p>
                    
                    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
                    <p style="color: #636e72; font-size: 0.8rem; text-align: center;">
                        هذا البريد تم إرساله تلقائياً من منصة ارتقاء .
                    </p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ تم إرسال إيميل للمدير`);
        return true;
    } catch (error) {
        console.error('❌ فشل إرسال الإيميل للمدير:', error);
        return false;
    }
};

module.exports = { sendOrderConfirmation, sendAdminNotification };