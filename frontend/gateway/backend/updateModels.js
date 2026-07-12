// backend/updateModels.js - تحديث النماذج للخدمات الجديدة

const mongoose = require('mongoose');
const Model = require('./models/Model');

// قائمة الخدمات الجديدة مع كلمات مفتاحية للبحث
const SERVICE_KEYWORDS = [
    // 1. الاستشارات الأكاديمية
    {
        id: 'consulting',
        keywords: ['استشارة', 'استشاري', 'إرشاد', 'توجيه', 'استشارات', 'consulting'],
        subService: 'استشارات أكاديمية'
    },
    // 2. اقتراح عناوين رسائل
    {
        id: 'thesis-titles',
        keywords: ['عنوان', 'عناوين', 'رسالة', 'ماجستير', 'دكتوراه', 'thesis', 'dissertation'],
        subService: 'اقتراح عناوين رسائل'
    },
    // 3. توفير المراجع وتلخيص الدراسات
    {
        id: 'literature-review',
        keywords: ['مراجع', 'مرجع', 'تلخيص', 'دراسات', 'سابقة', 'الأدبيات', 'literature'],
        subService: 'توفير مراجع وتلخيص'
    },
    // 4. إعداد المقترح البحثي
    {
        id: 'research-proposal',
        keywords: ['مقترح', 'خطة', 'بحثية', 'proposal', 'خطة بحث'],
        subService: 'إعداد مقترحات بحثية'
    },
    // 5. فحص السرقة الأدبية
    {
        id: 'plagiarism-check',
        keywords: ['سرقة', 'اقتباس', 'انتحال', 'تشابه', 'plagiarism', 'Turnitin', 'iThenticate'],
        subService: 'فحص السرقة الأدبية'
    },
    // 6. رومنة المراجع
    {
        id: 'romanization',
        keywords: ['رومنة', 'Romanization', 'تحويل', 'لاتيني', 'مراجع'],
        subService: 'رومنة المراجع'
    },
    // 7. التحليل الإحصائي AMOS
    {
        id: 'amos-analysis',
        keywords: ['AMOS', 'amos', 'مسار', 'SEM', 'معادلات', 'هيكلية'],
        subService: 'تحليل AMOS'
    },
    // 8. إعداد الدراسات السابقة
    {
        id: 'previous-studies',
        keywords: ['دراسات سابقة', 'أدبيات', 'مراجعة', 'سابقة'],
        subService: 'إعداد دراسات سابقة'
    },
    // 9. جمع وتوثيق المادة العلمية
    {
        id: 'collection-documentation',
        keywords: ['جمع', 'توثيق', 'مادة', 'علمية', 'documentation', 'collection'],
        subService: 'جمع وتوثيق'
    },
    // 10. الترجمة الأكاديمية
    {
        id: 'academic-translation',
        keywords: ['ترجمة', 'translation', 'تعريب', 'لغة', 'انجليزي'],
        subService: 'ترجمة أكاديمية'
    },
    // 11. تصميم وتحكيم أدوات البحث
    {
        id: 'research-tools',
        keywords: ['أدوات', 'استبيان', 'تحكيم', 'مقياس', 'tools'],
        subService: 'تصميم أدوات بحث'
    },
    // 12. التحليل الإحصائي SPSS
    {
        id: 'spss-analysis',
        keywords: ['SPSS', 'spss', 'تحليل إحصائي', 'إحصاء', 'statistics'],
        subService: 'تحليل SPSS'
    },
    // 13. إعادة الصياغة
    {
        id: 'paraphrasing',
        keywords: ['صياغة', 'إعادة', 'paraphrasing', 'تحرير', 'كتابة'],
        subService: 'إعادة صياغة'
    },
    // 14. التحليل التلوي
    {
        id: 'meta-analysis',
        keywords: ['تلوي', 'Meta', 'meta-analysis', 'تحليل', 'كمي'],
        subService: 'تحليل تلوي'
    },
    // 15. تحكيم مشرف محلي
    {
        id: 'local-supervisor',
        keywords: ['مشرف', 'تحكيم', 'إشراف', 'supervisor', 'local'],
        subService: 'تحكيم مشرف محلي'
    },
    // 16. التحليل الإحصائي النوعي
    {
        id: 'qualitative-analysis',
        keywords: ['نوعي', 'qualitative', 'NVivo', 'مقابلات', 'تحليل نصي'],
        subService: 'تحليل نوعي'
    },
    // 17. التحليل الإحصائي E-Views
    {
        id: 'eviews-analysis',
        keywords: ['E-Views', 'eviews', 'اقتصادي', 'قياسي'],
        subService: 'تحليل E-Views'
    },
    // 18. التحليل الإحصائي SAS
    {
        id: 'sas-analysis',
        keywords: ['SAS', 'sas', 'تحليل', 'بيانات'],
        subService: 'تحليل SAS'
    },
    // 19. التدقيق اللغوي والإملائي
    {
        id: 'proofreading',
        keywords: ['تدقيق', 'لغوي', 'إملائي', 'proofreading', 'مراجعة لغة'],
        subService: 'تدقيق لغوي'
    },
    // 20. النقد الأكاديمي
    {
        id: 'academic-critique',
        keywords: ['نقد', 'critique', 'تحليل', 'تقييم', 'نقدي'],
        subService: 'نقد أكاديمي'
    },
    // 21. تنسيق الرسالة
    {
        id: 'thesis-formatting',
        keywords: ['تنسيق', 'رسالة', 'دليل', 'جامعة', 'formatting'],
        subService: 'تنسيق رسائل'
    },
    // 22. فحص السرقة الأدبية
    {
        id: 'plagiarism',
        keywords: ['سرقة أدبية', 'انتحال', 'تشابه', 'plagiarism'],
        subService: 'فحص سرقة أدبية'
    },
    // 23. النشر في المجلات العلمية
    {
        id: 'isi-publication',
        keywords: ['نشر', 'مجلة', 'ISI', 'Scopus', 'publication', 'محكمة'],
        subService: 'نشر علمي'
    },
    // 24. مناقشة النتائج
    {
        id: 'results-discussion',
        keywords: ['مناقشة', 'نتائج', 'تفسير', 'discussion', 'results'],
        subService: 'مناقشة نتائج'
    },
    // 25. تصميم وكتابة السيرة الذاتية
    {
        id: 'cv-design',
        keywords: ['سيرة', 'ذاتية', 'CV', 'السيرة', 'ذاتي'],
        subService: 'تصميم CV'
    },
    // 26. إعداد الحقائب التدريبية
    {
        id: 'training-packages',
        keywords: ['حقيبة', 'تدريبية', 'training', 'تدريب', 'package'],
        subService: 'حقائب تدريبية'
    },
    // 27. إعداد العروض التقديمية
    {
        id: 'presentations',
        keywords: ['عرض', 'تقديمي', 'presentation', 'PPT', 'شرائح'],
        subService: 'عروض تقديمية'
    },
    // 28. كتابة خطاب الغرض من الدراسة
    {
        id: 'statement-of-purpose',
        keywords: ['خطاب', 'غرض', 'SOP', 'statement', 'purpose'],
        subService: 'خطاب SOP'
    },
    // 29. دراسة اللغة في بريطانيا
    {
        id: 'uk-language-study',
        keywords: ['لغة', 'بريطانيا', 'UK', 'انجليزي', 'دراسة'],
        subService: 'دراسة لغة في بريطانيا'
    },
    // 30. كتابة المحتوى
    {
        id: 'content-writing',
        keywords: ['محتوى', 'كتابة', 'content', 'تحرير'],
        subService: 'كتابة محتوى'
    },
    // 31. بناء التصور المقترح
    {
        id: 'conceptual-model',
        keywords: ['تصور', 'نموذج', 'مقترح', 'conceptual', 'model'],
        subService: 'بناء تصور'
    },
    // 32. تحليل ورسم الخرائط العلمية
    {
        id: 'science-mapping',
        keywords: ['خرائط', 'علمية', 'mapping', 'VOSviewer', 'CiteSpace'],
        subService: 'خرائط علمية'
    },
    // 33. كتابة المقالات التأملية
    {
        id: 'reflective-essays',
        keywords: ['مقال', 'تأملي', 'reflective', 'essay'],
        subService: 'مقالات تأملية'
    },
    // 34. جلسات استشارية سريعة
    {
        id: 'quick-consulting',
        keywords: ['جلسة', 'استشارية', 'سريعة', 'quick', 'consulting'],
        subService: 'جلسات استشارية'
    },
    // 35. إنقاذ البحث
    {
        id: 'research-rescue',
        keywords: ['إنقاذ', 'rescue', 'حل', 'مشكلة', 'بحث'],
        subService: 'إنقاذ بحث'
    },
    // 36. التقييم الأكاديمي
    {
        id: 'peer-review',
        keywords: ['تقييم', 'مراجعة', 'زملاء', 'peer', 'review'],
        subService: 'تقييم أكاديمي'
    },
    // 37. الإعداد للتمويل البحثي
    {
        id: 'research-grants',
        keywords: ['تمويل', 'منح', 'grants', 'funding', 'بحثي'],
        subService: 'تمويل ومنح'
    },
    // 38. ترشيح المجلات المحكمة
    {
        id: 'journal-recommendation',
        keywords: ['ترشيح', 'مجلة', 'محكمة', 'journal', 'recommendation'],
        subService: 'ترشيح مجلات'
    },
    // 39. تصميم البوسترات البحثية
    {
        id: 'research-posters',
        keywords: ['بوستر', 'poster', 'تصميم', 'بحثي'],
        subService: 'تصميم بوسترات'
    },
    // 40. تلخيص الكتب والمراجع
    {
        id: 'book-summary',
        keywords: ['تلخيص', 'كتاب', 'مراجع', 'summary', 'book'],
        subService: 'تلخيص كتب'
    },
    // 41. التحليل الإحصائي للبحوث الطبية
    {
        id: 'medical-statistics',
        keywords: ['طبي', 'سريري', 'medical', 'صحي', 'إحصائي'],
        subService: 'تحليل طبي'
    },
    // 42. عمل كتاب إلكتروني
    {
        id: 'ebook',
        keywords: ['كتاب', 'إلكتروني', 'ebook', 'نشر', 'رقمي'],
        subService: 'كتاب إلكتروني'
    },
    // 43. التحليل الإحصائي Smart PLS
    {
        id: 'smart-pls',
        keywords: ['Smart PLS', 'PLS', 'smartpls', 'SEM'],
        subService: 'تحليل Smart PLS'
    },
    // 44. التحليل الإحصائي STATA
    {
        id: 'stata-analysis',
        keywords: ['STATA', 'stata', 'تحليل', 'إحصائي'],
        subService: 'تحليل STATA'
    }
];

async function updateExistingModels() {
    try {
        // الاتصال بقاعدة البيانات
        const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/draseh_platform';
        await mongoose.connect(MONGO_URI);
        console.log('✅ تم الاتصال بقاعدة البيانات');

        // جلب جميع النماذج
        const models = await Model.find({});
        console.log(`📦 عدد النماذج الكلي: ${models.length}`);

        let updatedCount = 0;
        let skippedCount = 0;

        for (const model of models) {
            let mainService = model.mainService || '';
            let subService = model.subService || '';

            // إذا كان النموذج لا يحتوي على mainService أو يحتوي على قيمة قديمة
            if (!mainService || isOldService(mainService)) {
                const title = model.title || '';
                const description = model.description || '';
                const searchText = (title + ' ' + description).toLowerCase();

                let foundService = false;

                // البحث عن الخدمة المناسبة باستخدام الكلمات المفتاحية
                for (const service of SERVICE_KEYWORDS) {
                    const match = service.keywords.some(keyword => 
                        searchText.includes(keyword.toLowerCase())
                    );

                    if (match) {
                        mainService = service.id;
                        subService = service.subService;
                        foundService = true;
                        break;
                    }
                }

                // إذا لم يتم العثور على خدمة مناسبة
                if (!foundService) {
                    mainService = 'consulting'; // الخدمة الافتراضية
                    subService = 'خدمة أخرى';
                }

                await Model.findByIdAndUpdate(model._id, {
                    mainService: mainService,
                    subService: subService
                });
                updatedCount++;
                console.log(`✅ تم تحديث: ${model.title} -> ${mainService} / ${subService}`);
            } else {
                skippedCount++;
            }
        }

        console.log(`🎉 تم تحديث ${updatedCount} نموذج بنجاح!`);
        console.log(`⏭️ تم تخطي ${skippedCount} نموذج (محدث بالفعل)`);
        process.exit(0);
    } catch (error) {
        console.error('❌ خطأ:', error);
        process.exit(1);
    }
}

// دالة للتحقق مما إذا كانت الخدمة قديمة
function isOldService(serviceId) {
    const oldServices = [
        'statistics', 'proposal', 'literature', 'publication', 
        'design', 'video', 'consulting', 'tutoring'
    ];
    return oldServices.includes(serviceId);
}

// تشغيل الدالة
updateExistingModels();