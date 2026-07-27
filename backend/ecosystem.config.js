// ecosystem.config.js
module.exports = {
  apps: [{
    // ✅ اسم التطبيق
    name: 'irteqa',
    
    // ✅ ملف الإدخال
    script: 'server.js',
    
    // ✅ عدد العمليات (عدد أنوية المعالج)
    instances: 2,
    
    // ✅ وضع التشغيل (cluster = توزيع الحمل)
    exec_mode: 'cluster',
    
    // ✅ متغيرات البيئة
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    
    // ✅ بيئة التطوير
    env_development: {
      NODE_ENV: 'development',
      PORT: 5000
    },
    
    // ✅ إعدادات السجلات
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    
    // ✅ إعادة التشغيل التلقائي
    max_memory_restart: '1G',
    kill_timeout: 5000,
    listen_timeout: 3000,
    shutdown_with_message: true,
    
    // ✅ مراقبة التغييرات (للتطوير فقط)
    watch: false,
    
    // ✅ تجاهل المجلدات عند المراقبة
    ignore_watch: ['node_modules', 'logs', 'uploads']
  }]
};