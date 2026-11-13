# مالی‌نمای یکپارچه

داشبورد وب برای تجمیع **فروش**، **خرید** و **موجودی کالا** از:

- CRM **پیام‌گستر** (SOAP/WCF)
- نرم‌افزار حسابداری **هلو** (وب‌سرویس TncHoloo)
- نرم‌افزار حسابداری **سپیدار** (MySQL پیشنهادی / وب‌سرویس فروشگاهی)

---

## نصب سریع روی Ubuntu 24 (فقط یک دستور)

روی ماشین جدید همین را بزنید. خودش Node، کلون، بیلد و **سرویس systemctl** (`mali-namay`) را راه می‌اندازد:

```bash
curl -fsSL https://raw.githubusercontent.com/arynishere/accounting/main/bootstrap-ubuntu24.sh | bash
```

یا اگر ریپو را خودتان کلون کرده‌اید:

```bash
git clone https://github.com/arynishere/accounting.git
cd accounting
bash bootstrap-ubuntu24.sh
```

بعد از نصب، با `ip a` آی‌پی ماشین تشخیص داده می‌شود و سرویس روی **پورت ۳۰۰۰** با systemctl بالا می‌ماند (حتی بعد از ریبوت):

- اصلی: `http://IP-ماشین:3000`
- تنظیمات: `http://IP-ماشین:3000/settings`

### مدیریت سرویس (systemctl)

```bash
sudo systemctl status mali-namay
sudo systemctl restart mali-namay
sudo systemctl stop mali-namay
sudo systemctl start mali-namay
journalctl -u mali-namay -f
```

### گزینه‌های bootstrap

```bash
bash bootstrap-ubuntu24.sh                 # نصب + بیلد + سرویس systemctl روی 3000
bash bootstrap-ubuntu24.sh --port 4000     # پورت دلخواه
bash bootstrap-ubuntu24.sh --dir /opt/mali-namay
bash bootstrap-ubuntu24.sh --dev           # حالت توسعه (بدون systemd)
bash bootstrap-ubuntu24.sh --no-systemd    # بدون systemd
bash bootstrap-ubuntu24.sh --no-start      # فقط نصب و بیلد
sudo systemctl stop mali-namay             # توقف سرویس
```

### نصب وقتی ریپو از قبل هست (`install.sh`)

```bash
sudo bash install.sh              # بیلد + سرویس systemctl (پیش‌فرض)
sudo bash install.sh --port 4000
bash install.sh --dev             # حالت توسعه
bash install.sh --no-systemd      # بدون systemd
bash install.sh --no-start        # فقط نصب و بیلد
```

### پیش‌نیاز

| مورد | حداقل |
|------|--------|
| سیستم‌عامل | Ubuntu 24.04 (سایر لینوکس‌ها هم معمولاً کار می‌کند) |
| Node.js | 20 یا بالاتر (اسکریپت bootstrap خودش Node 22 می‌گذارد) |
| RAM | حدود ۱ گیگ آزاد برای بیلد |
| دسترسی | `sudo` برای نصب پکیج و سرویس systemctl |
---

## راهنمای راه‌اندازی بعد از نصب

1. مرورگر را باز کنید: `http://IP:3000`
2. به‌صورت پیش‌فرض داده‌ها **نمونه (Mock)** هستند تا بدون API هم داشبورد کار کند
3. بروید به **اتصال API** (`/settings`)
4. برای هر منبع (CRM / هلو / سپیدار) آدرس و اطلاعات ورود را وارد کنید
5. تیک «داده‌های نمونه» را بردارید و **ذخیره** کنید
6. در داشبورد روی **همگام‌سازی** بزنید

تنظیمات در `data/config.json` ذخیره می‌شود (این فایل در گیت commit نمی‌شود).

---

## اتصال CRM پیام‌گستر (PayamGostar)

فایل [docs/V2.5.1-Customer.pdf](./docs/V2.5.1-Customer.pdf) فقط **Release Notes** نسخه Customer است.
قرارداد API از WSDL رسمی سرویس‌های WCF خوانده شده:

1. آدرس پایه: `https://crm.your-domain.com` (مسیر `/Services/API` خودکار اضافه می‌شود)
2. نام کاربری و رمز کاربر پیام‌گستر را در تنظیمات وارد کنید
3. حالت نمونه را خاموش کنید و همگام‌سازی بزنید

سرویس‌های استفاده‌شده:

- `IUser.CheckUserAuthentication`
- `IInvoice.SearchInvoice` / `SearchPurchaseInvoice`
- `IProduct.FindProductByCode`
- `IInventory.GetRemainingStock`

---

## اتصال هلو (TncHoloo)

مستند: [docs/webserviceHelp.pdf](./docs/webserviceHelp.pdf)

1. وب‌سرویس هلو را نصب و سرویس `TncHolooWebService` را Start کنید
2. آدرس پایه: `http://IP-هلو:8080/TncHoloo/api`
3. نام کاربری، رمز عبور، **dbname** (مثلاً `Holoo1`)
4. حالت نمونه را خاموش کنید

Endpointهای استفاده‌شده:

- `POST /Login` — رمز به‌صورت Base64
- `GET /Product` — موجودی
- `GET /Invoice?type=1|3` — فروش / خرید

---

## اتصال سپیدار (MySQL — پیشنهادی)

سپیدار را از طریق **MySQL** می‌خوانیم (نه فقط وب‌سرویس).

1. در تنظیمات سپیدار، روش اتصال را **MySQL** بگذارید
2. هاست / پورت / نام کاربری / رمز / نام دیتابیس را وارد کنید
3. دکمه **تست اتصال MySQL و لیست جداول** را بزنید
4. حالت نمونه را خاموش کنید و همگام‌سازی کنید

برای نتیجه دقیق‌تر، ویوهای استاندارد را بسازید:
[docs/sepidar-mysql-views.sql](./docs/sepidar-mysql-views.sql)

- `mali_sales_invoices`
- `mali_purchase_invoices`
- `mali_inventory`

اگر ویو نباشد، سیستم جداول شبیه Invoice/Item را خودکار کشف می‌کند.

### حالت جایگزین: وب‌سرویس فروشگاهی

مستند: [docs/sepidar-e-commerce-web-service-v1.0.0.pdf](./docs/sepidar-e-commerce-web-service-v1.0.0.pdf)

روش اتصال را روی **API** بگذارید، سریال دستگاه را Register کنید (پورت پیش‌فرض ۷۳۷۳).

---

## اجرای دستی (بدون اسکریپت)

```bash
npm install
npm run build
npm run start          # http://0.0.0.0:3000

# یا توسعه:
npm run dev
```

---

## صفحات

| مسیر | توضیح |
|------|--------|
| `/` | داشبورد نموداری فروش / خرید / موجودی |
| `/sales` | فهرست ۱۱ گزارش فروش کارفرما |
| `/sales/[id]` | جزئیات گزارش فروش (نمودار + جدول + Excel/XML) |
| `/finance` | فهرست ۱۴ بخش داشبورد مالی مدیریتی |
| `/finance/[id]` | جزئیات گزارش مالی |
| `/details/[metric]` | drill-down KPI داشبورد |
| `/inventory` | موجودی کالا به تفکیک |
| `/settings` | اتصال APIها + هدف فروش |

API گزارش‌ها: `GET /api/reports/[id]?from&to` و `format=xml|xls`

---

## ساختار مهم

```
bootstrap-ubuntu24.sh      # نصب کامل روی Ubuntu 24 (کلون + Node + بیلد + اجرا)
install.sh                 # نصب وقتی ریپو از قبل هست
scripts/detect-ip.sh       # خواندن آی‌پی ماشین از ip a
scripts/start.sh           # اجرا روی 0.0.0.0:3000 + نمایش آی‌پی ماشین
scripts/stop.sh            # توقف
src/lib/adapters/          # آداپتر CRM / هلو / سپیدار / Sepidar-MySQL
docs/                      # PDF مستندات رسمی + ویوهای MySQL سپیدار
data/                      # تنظیمات محلی (gitignore)
```---

## عیب‌یابی

| مشکل | راه حل |
|------|--------|
| `Node.js نصب نیست` | طبق بخش پیش‌نیاز Node 20+ نصب کنید |
| پورت اشغال است | `bash install.sh --port 3001` |
| هلو/سپیدار وصل نمی‌شود | از سرور به `IP:8080` یا `IP:7373` با `curl` تست کنید؛ فایروال را چک کنید |
| لاگ برنامه | `journalctl -u mali-namay -f` |
| سرویس systemd | `sudo systemctl status mali-namay` |
| ری‌استارت | `sudo systemctl restart mali-namay` |
