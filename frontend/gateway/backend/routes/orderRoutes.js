// backend/routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Order = require('../models/Order');
const User = require('../models/User');

// ============================================================
// جلب جميع الطلبات للمدير
// ============================================================
router.get('/admin/all', protect, authorize('admin'), async (req, res) => {
    try {
        const orders = await Order.find()
            .populate('user', 'name email')
            .sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            count: orders.length,
            data: orders
        });
    } catch (error) {
        console.error('❌ خطأ في جلب جميع الطلبات:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================
// جلب طلبات الخبير
// ============================================================
router.get('/expert', protect, authorize('expert'), async (req, res) => {
    try {
        const orders = await Order.find({ assignedExpert: req.user.id })
            .populate('user', 'name email')
            .sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            count: orders.length,
            data: orders
        });
    } catch (error) {
        console.error('❌ خطأ في جلب طلبات الخبير:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================
// جلب طلبات المستخدم العادي
// ============================================================
router.get('/', protect, async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user.id })
            .sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            count: orders.length,
            data: orders
        });
    } catch (error) {
        console.error('❌ خطأ في جلب طلبات المستخدم:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================
// إنشاء طلب جديد
// ============================================================
router.post('/', protect, async (req, res) => {
    try {
        const orderData = {
            serviceType: req.body.serviceType || 'خدمة',
            title: req.body.title || 'طلب جديد',
            description: req.body.description || '',
            deadline: req.body.deadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            budget: req.body.budget || 0,
            status: 'pending',
            user: req.user.id
        };
        
        const order = await Order.create(orderData);
        
        res.status(201).json({
            success: true,
            message: 'تم إنشاء الطلب بنجاح ✅',
            data: order
        });
    } catch (error) {
        console.error('❌ خطأ في إنشاء الطلب:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================
// جلب طلب محدد
// ============================================================
router.get('/:id', protect, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('user', 'name email')
            .populate('assignedExpert', 'name email');

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'الطلب غير موجود ❌'
            });
        }

        const isAuthorized = 
            req.user.role === 'admin' || 
            (order.user && req.user.id === order.user._id.toString()) || 
            (req.user.role === 'expert' && order.assignedExpert && req.user.id === order.assignedExpert._id.toString());

        if (!isAuthorized) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية لعرض هذا الطلب'
            });
        }

        res.status(200).json({
            success: true,
            data: order
        });
    } catch (error) {
        console.error('❌ خطأ في جلب الطلب:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================
// تحديث طلب
// ============================================================
router.put('/:id', protect, async (req, res) => {
    try {
        let order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'الطلب غير موجود ❌'
            });
        }

        const isAuthorized = 
            req.user.role === 'admin' || 
            (order.user && req.user.id === order.user.toString());

        if (!isAuthorized) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية لتعديل هذا الطلب'
            });
        }

        if (req.user.role !== 'admin') {
            delete req.body.assignedExpert;
            delete req.body.budget;
        }

        order = await Order.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: 'تم تحديث الطلب بنجاح ✅',
            data: order
        });
    } catch (error) {
        console.error('❌ خطأ في تحديث الطلب:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================
// حذف طلب
// ============================================================
router.delete('/:id', protect, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'الطلب غير موجود ❌'
            });
        }

        const isAuthorized = 
            req.user.role === 'admin' || 
            (order.user && req.user.id === order.user.toString());

        if (!isAuthorized) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية لحذف هذا الطلب'
            });
        }

        await order.deleteOne();

        res.status(200).json({
            success: true,
            message: 'تم حذف الطلب بنجاح 🗑️'
        });
    } catch (error) {
        console.error('❌ خطأ في حذف الطلب:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================
// تعيين خبير للطلب
// ============================================================
router.put('/:id/assign-expert', protect, authorize('admin'), async (req, res) => {
    try {
        const { expertId, notes } = req.body;
        
        if (!expertId) {
            return res.status(400).json({
                success: false,
                message: 'يرجى اختيار خبير'
            });
        }

        const expert = await User.findById(expertId);
        
        if (!expert) {
            return res.status(404).json({
                success: false,
                message: 'الخبير غير موجود'
            });
        }

        if (expert.role !== 'expert') {
            return res.status(400).json({
                success: false,
                message: 'المستخدم المحدد ليس خبيراً'
            });
        }

        const order = await Order.findByIdAndUpdate(
            req.params.id,
            {
                assignedExpert: expertId,
                assignedAt: new Date(),
                status: 'in-progress',
                expertNotes: notes || ''
            },
            { new: true, runValidators: true }
        );

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'الطلب غير موجود ❌'
            });
        }

        const populatedOrder = await Order.findById(order._id)
            .populate('user', 'name email')
            .populate('assignedExpert', 'name email');

        console.log(`✅ تم تعيين الخبير ${expert.name} للطلب ${order._id}`);

        res.status(200).json({
            success: true,
            message: `تم تعيين الخبير ${expert.name} بنجاح ✅`,
            data: populatedOrder
        });
    } catch (error) {
        console.error('❌ خطأ في تعيين الخبير:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ في تعيين الخبير'
        });
    }
});

module.exports = router;