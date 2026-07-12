# 🌱 AgriCycle — Agricultural Waste Marketplace

AgriCycle is a full-stack mobile application that connects farmers with buyers of agricultural waste. Farmers can list their waste materials (rice husk, wheat straw, etc.), and buyers can browse, search, and order directly through the app.

---

## 📁 Project Structure

```
AgriCycle/
├── backend/         # Django REST Framework API
└── frontend/        # React Native (Expo) Mobile App
```

---

## 🖥️ Backend Setup (Django)

### Prerequisites
- Python 3.10 or higher
- pip
- (Optional) PostgreSQL — defaults to SQLite if not configured

### Step 1 — Navigate to the backend folder

```bash
cd AgriCycle/backend
```

### Step 2 — Create and activate a virtual environment

**Windows:**
```bash
python -m venv venv
venv\Scripts\activate
```

**macOS / Linux:**
```bash
python -m venv venv
source venv/bin/activate
```

### Step 3 — Install dependencies

```bash
pip install -r requirements.txt
```

### Step 4 — Configure environment variables

Create a `.env` file in the `backend/` folder:

```env
SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=*
DATABASE_URL=sqlite:///db.sqlite3
```

> 💡 For PostgreSQL, use: `DATABASE_URL=postgresql://user:password@localhost:5432/agricycle`

### Step 5 — Apply database migrations

```bash
python manage.py migrate
```

### Step 6 — Create a superuser (admin account)

```bash
python manage.py createsuperuser
```

### Step 7 — Start the Django server

**For emulator only (localhost):**
```bash
python manage.py runserver
```

**For physical phone (required — listens on all network interfaces):**
```bash
python manage.py runserver 0.0.0.0:8000
```

> ⚠️ If you're running the app on a **physical phone**, you MUST use `0.0.0.0:8000` so the phone can reach your PC over WiFi.

The API will be available at: `http://localhost:8000/api/v1/`

### Admin Panel
Access the Django admin at: `http://localhost:8000/admin/`

---

## 📱 Frontend Setup (React Native / Expo)

### Prerequisites
- Node.js 18 or higher
- npm or yarn
- Expo Go app installed on your phone ([Android](https://play.google.com/store/apps/details?id=host.exp.exponent) / [iOS](https://apps.apple.com/app/expo-go/id982107779))

### Step 1 — Navigate to the frontend folder

```bash
cd AgriCycle/frontend
```

### Step 2 — Install dependencies

```bash
npm install
```

### Step 3 — Configure the backend URL

Open `src/api/client.js`. The app auto-detects the backend IP using Expo's host.

**If auto-detection fails**, find your PC's WiFi IP:
```bash
# Windows
ipconfig
# Look for "IPv4 Address" under your WiFi adapter (e.g. 192.168.1.5)
```

Then set it manually in `src/api/client.js`:
```js
const MANUAL_IP = '192.168.1.5'; // ← your PC's WiFi IP
```

> 📌 Your phone and PC must be on the **same WiFi network**.

### Step 4 — Start the Expo development server

```bash
npx expo start
```

### Step 5 — Open on your device

| Method | Instructions |
|--------|-------------|
| **Physical Phone** | Scan the QR code in the Expo terminal with the Expo Go app |
| **Android Emulator** | Press `a` in the terminal |
| **iOS Simulator** | Press `i` in the terminal |
| **Web Browser** | Press `w` in the terminal |

---

## 🔗 Running Both Together

Open **two separate terminals**:

**Terminal 1 — Backend:**
```bash
cd AgriCycle/backend
venv\Scripts\activate        # Windows
python manage.py runserver 0.0.0.0:8000
```

**Terminal 2 — Frontend:**
```bash
cd AgriCycle/frontend
npx expo start
```

Then scan the QR code from Terminal 2 with the Expo Go app on your phone.

---

## 🗃️ API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/auth/register/` | Create a new account |
| `POST` | `/api/v1/auth/login/` | Login and get JWT tokens |
| `GET` | `/api/v1/auth/profile/` | Get current user profile |
| `GET` | `/api/v1/listings/` | List all active waste listings |
| `POST` | `/api/v1/listings/` | Create a new waste listing (farmer only) |
| `GET` | `/api/v1/listings/{id}/` | Get listing details |
| `GET` | `/api/v1/listings/my/` | Get current user's own listings |
| `POST` | `/api/v1/listings/{id}/delete-mine/` | Delete your own listing |
| `GET` | `/api/v1/orders/` | Get orders list |
| `POST` | `/api/v1/orders/` | Place an order |
| `GET` | `/api/v1/chat/conversations/` | Get all conversations |

---

## 👤 User Roles

| Role | Capabilities |
|------|-------------|
| **Farmer** | Post waste listings, manage listings, receive orders, chat with buyers |
| **Buyer** | Browse marketplace, place orders, chat with farmers, save listings |
| **Admin** | Full access via Django admin panel |

---

## 🔧 Troubleshooting

### "Cannot reach server" on physical phone
1. Make sure Django is running with `python manage.py runserver 0.0.0.0:8000`
2. Make sure your phone and PC are on the **same WiFi network**
3. Set `MANUAL_IP` in `src/api/client.js` to your PC's WiFi IP address

### "No listings showing" in Marketplace
1. Make sure the Django backend is running
2. Pull down to refresh the Waste tab
3. Check that you have listings in the database (Django admin → Waste Listings)

### Delete listing not working
1. Restart the Django backend after any backend code changes
2. Use Profile → My Listings → 🗑️ trash icon to delete

### Image upload not working
1. Make sure the `media/` folder exists in `backend/`
2. Django must be running with `0.0.0.0:8000` if on a physical device

### Expo won't start
```bash
npm install
npx expo install --fix
npx expo start --clear
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile App | React Native + Expo |
| Navigation | React Navigation v7 |
| State | React Context (AuthContext) |
| HTTP Client | Axios + native fetch (for file uploads) |
| Backend | Django 5 + Django REST Framework |
| Auth | JWT (SimpleJWT) |
| Database | SQLite (dev) / PostgreSQL (prod) |
| Media Storage | Local filesystem (`media/`) |
| Image Picker | expo-image-picker |

---

## 📞 Support

For issues, check the Expo and Django terminal logs first — both show real-time errors that pinpoint the problem instantly.
