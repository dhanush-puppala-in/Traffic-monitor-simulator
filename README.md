# 🌐 TrafficPulse — Live Website Traffic Monitor

Real-time website traffic monitoring dashboard with live charts, metrics, and AI-powered traffic analysis.

---

## 📦 Project Structure

```
traffic-monitor/
├── backend/
│   ├── main.py              # FastAPI backend with WebSocket support
│   └── requirements.txt     # Python dependencies
└── frontend/
    ├── src/
    │   ├── App.jsx          # Main React dashboard
    │   └── index.jsx        # Entry point
    ├── index.html           # HTML shell
    ├── package.json         # Node dependencies
    └── vite.config.js       # Vite config
```

---

## 🛠 Prerequisites

| Tool        | Version   | Download                        |
|-------------|-----------|---------------------------------|
| Python      | 3.9+      | https://python.org              |
| Node.js     | 18+       | https://nodejs.org              |
| npm         | 9+        | Comes with Node.js              |

---

## 🚀 Setup & Run

### Step 1 — Backend Setup

```bash
# Navigate to backend folder
cd traffic-monitor/backend

# (Recommended) Create a virtual environment
python -m venv venv

# Activate it:
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Start the backend server
python main.py
```

✅ Backend will run at: **http://localhost:8000**
✅ API docs at: **http://localhost:8000/docs**

---

### Step 2 — Frontend Setup

Open a **new terminal window/tab**:

```bash
# Navigate to frontend folder
cd traffic-monitor/frontend

# Install Node.js dependencies
npm install

# Start the development server
npm run dev
```

✅ Frontend will open at: **http://localhost:3000**

---

## 🎯 How to Use

1. Open **http://localhost:3000** in your browser
2. Paste any website URL in the input box (e.g., `https://github.com`)
3. Click **Monitor →** or press Enter
4. Watch live traffic metrics update every 2 seconds
5. Click **📋 Full Report** to get a full traffic analysis report
6. Toggle 🌙/☀ for Dark/Light mode
7. Monitor multiple sites simultaneously

---

## 📊 Dashboard Features

| Card | Description |
|------|-------------|
| 👥 Active Users | Current estimated active users + peak |
| 📨 Total Requests | Cumulative requests + per-minute rate |
| ⚡ Avg Response | Average + last response time in ms |
| ❌ Error Rate | % of failed requests |
| 📊 Traffic Level | Light / Medium / Heavy classification |
| ⚠️ Lag Risk | User experience risk level |
| 📡 Bandwidth | Current throughput in Mbps |
| 🕐 Uptime | How long monitoring has been active |
| 🌐 Domain | Active domain being monitored |

### Charts
- 📈 Traffic over time (users + requests area chart)
- ⚡ Response time trend line
- 🌍 Geographic distribution (pie chart)
- 📱 Device breakdown (bar chart)
- 🔢 HTTP status code breakdown
- 🚦 Traffic severity indicator
- 📋 Live request log table

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/monitor/start` | Start monitoring a URL |
| POST | `/monitor/stop` | Stop monitoring a URL |
| GET | `/monitor/list` | List all active monitors |
| GET | `/monitor/report/{domain}` | Generate traffic report |
| WS | `/ws` | Live WebSocket stream |

---

## ⚠️ Notes

- Traffic data is **simulated** to demonstrate real-time monitoring behavior. For production use, you'd integrate with real analytics APIs (Cloudflare, Google Analytics, etc.)
- The WebSocket auto-reconnects if connection drops
- All data resets when the backend restarts

---

## 🛑 Stopping the Servers

- Backend: Press `Ctrl+C` in the backend terminal
- Frontend: Press `Ctrl+C` in the frontend terminal
- Deactivate Python venv: `deactivate`
