import asyncio
import json
import random
import time
import hashlib
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from urllib.parse import urlparse
import httpx
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

app = FastAPI(title="Traffic Monitor API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Data Models ───────────────────────────────────────────────────────────────

class MonitorRequest(BaseModel):
    url: str

class TrafficData:
    def __init__(self, url: str):
        self.url = url
        self.domain = urlparse(url).netloc or url
        self.start_time = datetime.now()
        self.requests_history: List[Dict] = []
        self.active_users = 0
        self.total_requests = 0
        self.response_times: List[float] = []
        self.status_codes: Dict[int, int] = {}
        self.geographic_data: Dict[str, int] = {}
        self.device_data: Dict[str, int] = {"Desktop": 0, "Mobile": 0, "Tablet": 0}
        self.traffic_by_minute: List[Dict] = []
        self.bandwidth_usage: List[float] = []
        self.error_count = 0
        self.last_response_time: float = 0
        self.peak_users = 0

    def to_dict(self):
        now = datetime.now()
        avg_response = sum(self.response_times[-50:]) / max(len(self.response_times[-50:]), 1)
        recent_rps = len([r for r in self.requests_history if 
                          (now - datetime.fromisoformat(r["timestamp"])).seconds < 60])
        
        # Traffic classification
        if recent_rps < 10:
            traffic_level = "light"
        elif recent_rps < 50:
            traffic_level = "medium"
        else:
            traffic_level = "heavy"

        lag_risk = "low"
        if avg_response > 2000:
            lag_risk = "high"
        elif avg_response > 800:
            lag_risk = "medium"

        return {
            "url": self.url,
            "domain": self.domain,
            "active_users": self.active_users,
            "peak_users": self.peak_users,
            "total_requests": self.total_requests,
            "requests_per_minute": recent_rps,
            "avg_response_time": round(avg_response, 2),
            "last_response_time": round(self.last_response_time, 2),
            "error_rate": round((self.error_count / max(self.total_requests, 1)) * 100, 2),
            "error_count": self.error_count,
            "traffic_level": traffic_level,
            "lag_risk": lag_risk,
            "status_codes": self.status_codes,
            "geographic_data": self.geographic_data,
            "device_data": self.device_data,
            "uptime_seconds": (now - self.start_time).seconds,
            "bandwidth_mbps": round(sum(self.bandwidth_usage[-10:]) / max(len(self.bandwidth_usage[-10:]), 1), 3),
            "timestamp": now.isoformat(),
            "traffic_history": self.traffic_by_minute[-20:],
            "response_time_history": [
                {"time": i, "value": v} 
                for i, v in enumerate(self.response_times[-30:])
            ],
        }

# ─── In-Memory State ───────────────────────────────────────────────────────────

monitors: Dict[str, TrafficData] = {}
active_connections: List[WebSocket] = []

REGIONS = ["North America", "Europe", "Asia Pacific", "South America", "Middle East", "Africa"]
DEVICES = ["Desktop", "Mobile", "Tablet"]

# ─── Simulation Engine ─────────────────────────────────────────────────────────

async def simulate_traffic(url: str, data: TrafficData):
    """Simulate real-time traffic data with realistic patterns."""
    while url in monitors:
        try:
            now = datetime.now()
            hour = now.hour

            # Simulate daily traffic pattern (peak at 9am-6pm)
            base_users = 50
            if 9 <= hour <= 18:
                base_users = random.randint(80, 200)
            elif 0 <= hour <= 5:
                base_users = random.randint(5, 30)
            else:
                base_users = random.randint(30, 80)

            # Add some randomness
            fluctuation = random.uniform(0.7, 1.3)
            data.active_users = max(1, int(base_users * fluctuation))
            data.peak_users = max(data.peak_users, data.active_users)

            # Simulate requests
            new_requests = random.randint(1, max(1, data.active_users // 5))
            data.total_requests += new_requests

            # Response time simulation (ms)
            base_response = random.uniform(120, 450)
            if data.active_users > 150:
                base_response *= random.uniform(1.5, 3.0)  # Lag under high load
            data.last_response_time = base_response
            data.response_times.append(base_response)
            if len(data.response_times) > 500:
                data.response_times = data.response_times[-500:]

            # Status codes
            status = random.choices([200, 301, 404, 500, 503], weights=[85, 5, 5, 3, 2])[0]
            data.status_codes[status] = data.status_codes.get(status, 0) + 1
            if status >= 400:
                data.error_count += 1

            # Geography
            region = random.choice(REGIONS)
            data.geographic_data[region] = data.geographic_data.get(region, 0) + random.randint(1, 5)

            # Devices
            device = random.choices(DEVICES, weights=[55, 35, 10])[0]
            data.device_data[device] = data.device_data.get(device, 0) + 1

            # Bandwidth (MB)
            bandwidth = random.uniform(0.5, 5.0) * data.active_users / 100
            data.bandwidth_usage.append(bandwidth)
            if len(data.bandwidth_usage) > 100:
                data.bandwidth_usage = data.bandwidth_usage[-100:]

            # History record for sparkline
            data.requests_history.append({
                "timestamp": now.isoformat(),
                "requests": new_requests,
                "response_time": base_response,
                "users": data.active_users,
            })
            if len(data.requests_history) > 1000:
                data.requests_history = data.requests_history[-1000:]

            # Traffic by minute for charts
            minute_key = now.strftime("%H:%M")
            if data.traffic_by_minute and data.traffic_by_minute[-1]["time"] == minute_key:
                data.traffic_by_minute[-1]["requests"] += new_requests
                data.traffic_by_minute[-1]["users"] = data.active_users
            else:
                data.traffic_by_minute.append({
                    "time": minute_key,
                    "requests": new_requests,
                    "users": data.active_users,
                    "response_time": round(base_response, 0),
                })
            if len(data.traffic_by_minute) > 30:
                data.traffic_by_minute = data.traffic_by_minute[-30:]

        except Exception as e:
            print(f"Simulation error: {e}")

        await asyncio.sleep(2)

async def broadcast(message: dict):
    """Broadcast to all connected WebSocket clients."""
    dead = []
    for ws in active_connections:
        try:
            await ws.send_json(message)
        except Exception:
            dead.append(ws)
    for ws in dead:
        if ws in active_connections:
            active_connections.remove(ws)

async def push_updates():
    """Push traffic updates to all clients every 2 seconds."""
    while True:
        if monitors and active_connections:
            payload = {
                "type": "update",
                "data": {url: td.to_dict() for url, td in monitors.items()}
            }
            await broadcast(payload)
        await asyncio.sleep(2)

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(push_updates())

# ─── REST Endpoints ────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "Traffic Monitor API running", "version": "1.0.0"}

@app.post("/monitor/start")
async def start_monitor(req: MonitorRequest):
    url = req.url.strip()
    if not url.startswith("http"):
        url = "https://" + url

    if url in monitors:
        return {"status": "already_monitoring", "url": url}

    data = TrafficData(url)
    monitors[url] = data
    asyncio.create_task(simulate_traffic(url, data))
    return {"status": "started", "url": url}

@app.post("/monitor/stop")
async def stop_monitor(req: MonitorRequest):
    url = req.url.strip()
    if url in monitors:
        del monitors[url]
        return {"status": "stopped", "url": url}
    raise HTTPException(404, "URL not being monitored")

@app.get("/monitor/list")
def list_monitors():
    return {"monitors": [td.to_dict() for td in monitors.values()]}

@app.get("/monitor/report/{domain}")
def get_report(domain: str):
    for url, td in monitors.items():
        if domain in url:
            d = td.to_dict()
            avg_resp = d["avg_response_time"]
            rps = d["requests_per_minute"]
            err_rate = d["error_rate"]

            issues = []
            recommendations = []

            if avg_resp > 2000:
                issues.append("Critical response time — users experiencing major lag")
                recommendations.append("Investigate server load and optimize heavy queries")
            elif avg_resp > 800:
                issues.append("Elevated response time — some users may notice slowness")
                recommendations.append("Consider caching and CDN optimization")

            if err_rate > 10:
                issues.append(f"High error rate ({err_rate}%) — many requests failing")
                recommendations.append("Check server logs and fix error-prone endpoints")

            if rps > 80:
                issues.append("Very high traffic volume — server under pressure")
                recommendations.append("Scale horizontally or add load balancing")

            dominant_region = max(d["geographic_data"], key=d["geographic_data"].get) if d["geographic_data"] else "Unknown"
            dominant_device = max(d["device_data"], key=d["device_data"].get) if d["device_data"] else "Unknown"

            return {
                "domain": d["domain"],
                "traffic_level": d["traffic_level"],
                "lag_risk": d["lag_risk"],
                "summary": {
                    "active_users": d["active_users"],
                    "total_requests": d["total_requests"],
                    "avg_response_time_ms": avg_resp,
                    "error_rate_percent": err_rate,
                    "requests_per_minute": rps,
                    "bandwidth_mbps": d["bandwidth_mbps"],
                },
                "dominant_region": dominant_region,
                "dominant_device": dominant_device,
                "issues": issues if issues else ["No critical issues detected"],
                "recommendations": recommendations if recommendations else ["System performing within normal parameters"],
                "generated_at": datetime.now().isoformat(),
            }
    raise HTTPException(404, "Domain not found")

# ─── WebSocket ─────────────────────────────────────────────────────────────────

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)
    try:
        # Send current state immediately
        if monitors:
            await websocket.send_json({
                "type": "update",
                "data": {url: td.to_dict() for url, td in monitors.items()}
            })
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        if websocket in active_connections:
            active_connections.remove(websocket)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
