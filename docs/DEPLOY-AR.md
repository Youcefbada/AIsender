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

1. من hPanel افتح **Databases → Management**.
2. أنشئ قاعدة بيانات + مستخدم، واحفظ:
   - اسم القاعدة (DB name)
   - اسم المستخدم (DB user)
   - كلمة المرور
   - المضيف (Host) — غالبًا `localhost` داخل الاستضافة.
3. كوّن رابط الاتصال:
```
mysql://DB_USER:DB_PASSWORD@DB_HOST:3306/DB_NAME
```
> ملاحظة: لو ستشغّل أوامر قاعدة البيانات من جهازك، فعّل **Remote MySQL** في hPanel
> وأضف IP جهازك. الأسهل هو التشغيل عبر SSH داخل الاستضافة (الجزء 5).

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

## الجزء 4 — متغيرات البيئة (Environment Variables)

من لوحة تطبيق الـ Node.js → قسم **Environment variables**، أضف التالي.

ولّد القيم السرية على جهازك:
```bash
openssl rand -base64 32   # لـ AUTH_SECRET
openssl rand -base64 32   # لـ ENCRYPTION_KEY (لازم 32 بايت)
openssl rand -base64 24   # لـ TRACKING_SECRET
openssl rand -base64 24   # لـ CRON_SECRET
```

المتغيرات المطلوبة:
```
DATABASE_URL=mysql://DB_USER:DB_PASSWORD@DB_HOST:3306/DB_NAME
AUTH_SECRET=القيمة_المولّدة
ENCRYPTION_KEY=القيمة_المولّدة
TRACKING_SECRET=القيمة_المولّدة
CRON_SECRET=القيمة_المولّدة
APP_URL=https://yourdomain.com
NEXTAUTH_URL=https://yourdomain.com
EMAIL_FROM=you@yourdomain.com
EMAIL_FROM_NAME=اسمك
EMAIL_MAILING_ADDRESS=عنوانك البريدي الحقيقي
ADMIN_USERNAME=admin
ADMIN_PASSWORD=Admin!2026
```

اختيارية (مفاتيح افتراضية للنظام — لكن كل مستخدم يقدر يضيف مفاتيحه من Settings):
```
GEMINI_API_KEY=...
GROQ_API_KEY=...
OPENROUTER_API_KEY=...
RESEND_API_KEY=...
SERPER_API_KEY=...
```
> أعد النشر/التشغيل بعد إضافة المتغيرات.

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
