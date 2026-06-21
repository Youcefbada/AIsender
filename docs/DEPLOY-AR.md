# دليل النشر بالعربية — من المحلي إلى GitHub إلى Hostinger

> المشروع: AIToolSender (Next.js + MySQL). الاستضافة: Hostinger Business (Node.js).
> كل المفاتيح مجانية، وكل مستخدم يضيف مفاتيحه من صفحة Settings.

---

## الجزء 0 — تم بالفعل ✅
- تمت تهيئة Git محليًا (`git init`) وعمل أول commit على فرع `main`.
- ملف `.gitignore` يستثني `node_modules` و `.env` و `.next` تلقائيًا (لا تُرفع أسرار).

تحقق سريع (اختياري):
```bash
cd /Users/youcef/Desktop/AITOOLSENDER
git log --oneline -1
git status
```

---

## الجزء 1 — الرفع إلى GitHub

### 1) أنشئ مستودعًا جديدًا على GitHub
- ادخل https://github.com/new
- الاسم مثلًا: `aitoolsender`
- اجعله **Private** (موصى به).
- **لا** تضف README ولا .gitignore (المشروع جاهز).
- اضغط **Create repository**.

### 2) اربط مشروعك المحلي بالمستودع وارفعه
انسخ رابط المستودع من GitHub، ثم نفّذ (غيّر USERNAME و REPO):
```bash
cd /Users/youcef/Desktop/AITOOLSENDER
git remote add origin https://github.com/USERNAME/REPO.git
git push -u origin main
```
- لو طلب منك اسم مستخدم/كلمة مرور: استخدم **Personal Access Token** بدل كلمة المرور
  (GitHub → Settings → Developer settings → Personal access tokens → Generate).

### 3) للتحديثات المستقبلية
بعد أي تعديل:
```bash
git add -A
git commit -m "وصف التعديل"
git push
```

---

## الجزء 2 — قاعدة بيانات MySQL على Hostinger

تم إنشاؤها بالفعل، وبياناتها مكتوبة في الكود:
- اسم القاعدة: `u700271251_aiafilliete`
- المستخدم: `u700271251_Affiliate`
- المضيف: `localhost` (لأن التطبيق على نفس سيرفر Hostinger)

> هذه القيم موجودة داخل `prisma/schema.prisma`. لو غيّرت كلمة مرور القاعدة،
> حدّث السطر `url = "mysql://..."` هناك (وذكّر أن `@` تُكتب `%40`).

---

## الجزء 3 — نشر تطبيق Node.js من GitHub

1. من hPanel: **Websites → Node.js → Get started**.
2. اختر **Connect GitHub** وامنح الصلاحية، ثم اختر المستودع وفرع `main`
   (فعّل النشر التلقائي Auto-deploy).
3. الإعدادات:
   - **Node version:** 20 أو 22
   - **Build command:** `npm install && npm run build`
   - **Start command:** `npm start`
4. اضغط **Deploy**. أول نشر يأخذ بضع دقائق.

---

## الجزء 4 — الإعدادات (لا حاجة لمتغيرات بيئة!)

كل القيم السرية وبيانات قاعدة البيانات **مكتوبة مباشرة في الكود** داخل
`src/lib/config.ts` و `prisma/schema.prisma`، فلا تحتاج ضبط أي Environment
Variables على Hostinger. شغّل التطبيق مباشرة.

- بيانات قاعدة البيانات: داخل `prisma/schema.prisma` (مستخدم/كلمة مرور/اسم القاعدة).
- مفاتيح التشفير والتوقيع وحساب الكرون: داخل `src/lib/config.ts`.
- الإيميل المُرسِل الافتراضي: `affiliate@luminax.pro` (تقدر تغيّره من Settings أيضًا).
- **الدومين:** غير مطلوب الآن. لما يكون عندك دومين، ضع رابطك في `config.appUrl`
  (مثلًا `"https://marlinrch.shop"`) عشان روابط فتح/إلغاء الاشتراك في الإيميل تشتغل.

> مفاتيح الذكاء الاصطناعي والبريد والاكتشاف (Gemini/Groq/Resend/Serper/SMTP)
> **لا تُكتب هنا** — كل مستخدم يضيفها من داخل التطبيق في **Settings → API keys**.

> أمان: المستودع يحتوي أسرارًا الآن، فاجعله **Private** دائمًا، وغيّر كلمة مرور
> قاعدة البيانات لو تسربت.

---

## الجزء 5 — تجهيز قاعدة البيانات وحساب الأدمن (مرة واحدة)

فعّل **SSH Access** من hPanel (Advanced → SSH Access)، ثم اتصل:
```bash
ssh USERNAME@SERVER_IP -p PORT     # البيانات معروضة في hPanel
```
ادخل مجلد التطبيق (يظهر في لوحة Node.js)، ثم:
```bash
npm run db:push     # ينشئ كل الجداول في MySQL
npm run db:seed     # ينشئ حساب الأدمن
```
بيانات الدخول الافتراضية (غيّرها بعد أول دخول):
```
username: admin
password: Admin!2026
```
> بديل: شغّل نفس الأمرين من جهازك المحلي مع وضع DATABASE_URL الخاص بالإنتاج (يتطلب تفعيل Remote MySQL).

---

## الجزء 6 — جدولة الوكيل (Cron)

الوكيل يعمل على دفعات صغيرة، فاجعل التشغيل متكررًا. من hPanel **Cron Jobs**
(أو خدمة مجانية مثل cron-job.org تدعم الهيدر). كل 10 دقائق:
```bash
curl -X POST -H "Authorization: Bearer YOUR_CRON_SECRET" https://yourdomain.com/api/agent/run
curl -X POST -H "Authorization: Bearer YOUR_CRON_SECRET" https://yourdomain.com/api/agent/dispatch
```
- `/api/agent/run` → يكتشف ويقيّم ويبحث ويكتب المسودات (قائمة الموافقة).
- `/api/agent/dispatch` → يرسل الإيميلات الموافق عليها ضمن الحد اليومي والنافذة الزمنية.

---

## الجزء 7 — البريد والتتبّع (Resend)

1. في Resend: وثّق دومينك (SPF + DKIM + DMARC).
2. أضف Webhook إلى:
```
https://yourdomain.com/api/webhooks/resend
```
   للأحداث: delivered / opened / clicked / bounced / complained.
   (الارتدادات والشكاوى تُضاف تلقائيًا لقائمة الحظر/Suppression.)

---

## الجزء 8 — الاستخدام

1. ادخل على `https://yourdomain.com/login` بحساب الأدمن.
2. أي شخص آخر يسجّل من `https://yourdomain.com/signup`.
3. من **Settings → API keys** أضف مفاتيحك المجانية:
   - Gemini: https://aistudio.google.com/apikey
   - Resend: https://resend.com
   - Serper (اختياري للاكتشاف): https://serper.dev
   - Groq (احتياطي): https://console.groq.com/keys
4. أضف **Sender identity** في Settings.
5. أنشئ Product → Analyze → Launch campaign → استورد CSV أو شغّل الـ pipeline
   → راجع المسودات في **Approvals** ووافق عليها.

---

## ملاحظات مهمة
- الحد اليومي الأقصى للإرسال = **50**. على دومين جديد ابدأ بـ 5–10 يوميًا وارفع تدريجيًا.
- لا ترفع أحجام الدفعات بحيث يتجاوز طلب واحد مهلة الخادم؛ زِد **تكرار** الـ Cron بدلًا من ذلك.
- حدّ الـ inodes (~600 ألف للحساب): مجلد `node_modules` كبير؛ لو اقتربت من الحد
  استخدم إخراج Next.js القياسي (standalone) أو نظّف مواقع أخرى على نفس الحساب.
