# مالی‌نمای یکپارچه

داشبورد وب برای تجمیع **فروش**، **خرید** و **موجودی کالا** از:

- CRM **پیام‌گستر** (SOAP/WCF)
- نرم‌افزار حسابداری **هلو** (وب‌سرویس TncHoloo)
- نرم‌افزار حسابداری **سپیدار** (وب‌سرویس فروشگاهی)

---

## نصب سریع (پیشنهادی)

روی سرور لینوکس (Ubuntu/Debian):

```bash
# اگر از گیت کلون می‌کنید:
git clone <آدرس-ریپو> accounting
cd accounting

# نصب و اجرا با یک دستور
bash install.sh
```

بعد از نصب، برنامه روی همه اینترفیس‌ها گوش می‌دهد:

- لوکال: `http://127.0.0.1:3000`
- شبکه / IP سرور: `http://IP-سرور:3000`

### گزینه‌های اسکریپت

```bash
bash install.sh                 # بیلد production + اجرا روی پورت 3000
bash install.sh --dev           # حالت توسعه
bash install.sh --port 4000     # پورت دلخواه
bash install.sh --no-start      # فقط نصب و بیلد
sudo bash install.sh --systemd  # سرویس دائمی systemd
bash scripts/stop.sh            # توقف سرویس/پروسه
```

### پیش‌نیاز

| مورد | حداقل |
|------|--------|
| سیستم‌عامل | Linux (Ubuntu 20.04+ توصیه می‌شود) |
| Node.js | 20 یا بالاتر |
| npm | همراه Node |
| RAM | حدود ۱ گیگ آزاد برای بیلد |

اگر Node ندارید:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
```

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

## اتصال سپیدار (وب‌سرویس فروشگاهی)

مستند: [docs/sepidar-e-commerce-web-service-v1.0.0.pdf](./docs/sepidar-e-commerce-web-service-v1.0.0.pdf)

1. در سپیدار حالت سرویس‌دهنده (کاربر admin) — پورت پیش‌فرض **7373**
2. تعریف دستگاه و گرفتن سریال ۸ حرفی
3. در تنظیمات: `http://IP:7373` + سریال + کاربر/رمز
4. دکمه **ثبت دستگاه (Register)**
5. همگام‌سازی داشبورد

توجه: این وب‌سرویس **فاکتور خرید** ندارد.

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
| `/inventory` | موجودی کالا به تفکیک |
| `/settings` | اتصال APIها |

---

## ساختار مهم

```
install.sh                 # نصب یک‌مرحله‌ای
scripts/stop.sh            # توقف
src/lib/adapters/          # آداپتر CRM / هلو / سپیدار
docs/                      # PDF مستندات رسمی
data/                      # تنظیمات محلی (gitignore)
```

---

## عیب‌یابی

| مشکل | راه حل |
|------|--------|
| `Node.js نصب نیست` | طبق بخش پیش‌نیاز Node 20+ نصب کنید |
| پورت اشغال است | `bash install.sh --port 3001` |
| هلو/سپیدار وصل نمی‌شود | از سرور به `IP:8080` یا `IP:7373` با `curl` تست کنید؛ فایروال را چک کنید |
| لاگ برنامه | `tail -f logs/app.log` |
| سرویس systemd | `sudo systemctl status mali-namay` |
