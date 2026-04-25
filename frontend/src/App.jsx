import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";


// ─── Theme Config ───────────────────────────────────────────────────────────
const themes = {
  dark: {
    bg: "#030712",
    surface: "#0f172a",
    card: "#111827",
    cardBorder: "#1e293b",
    accent: "#06b6d4",
    accent2: "#818cf8",
    accent3: "#34d399",
    text: "#f1f5f9",
    textSub: "#94a3b8",
    textMuted: "#475569",
    danger: "#f43f5e",
    warning: "#fbbf24",
    success: "#34d399",
    glow: "rgba(6,182,212,0.15)",
    particleColor: "rgba(6,182,212,",
  },
  light: {
    bg: "#f0f9ff",
    surface: "#ffffff",
    card: "#ffffff",
    cardBorder: "#e0f2fe",
    accent: "#0284c7",
    accent2: "#6366f1",
    accent3: "#059669",
    text: "#0f172a",
    textSub: "#475569",
    textMuted: "#94a3b8",
    danger: "#e11d48",
    warning: "#d97706",
    success: "#059669",
    glow: "rgba(2,132,199,0.08)",
    particleColor: "rgba(2,132,199,",
  },
};

const API = "https://traffic-monitor-simulator.onrender.com";   // ← your Render URL
const WS = "wss://trafficpulse-api.onrender.com/ws";  // ← wss:// not ws://
// ─── Particle Background ────────────────────────────────────────────────────
function ParticleCanvas({ mode }) {
  const canvasRef = useRef(null);
  const particles = useRef([]);
  const animRef = useRef(null);
  const t = themes[mode];

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const N = 60;
    particles.current = Array.from({ length: N }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 2 + 1,
      alpha: Math.random() * 0.5 + 0.1,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const ps = particles.current;

      // Draw connections
      for (let i = 0; i < ps.length; i++) {
        for (let j = i + 1; j < ps.length; j++) {
          const dx = ps[i].x - ps[j].x;
          const dy = ps[i].y - ps[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.strokeStyle = t.particleColor + (0.15 * (1 - dist / 120)) + ")";
            ctx.lineWidth = 0.5;
            ctx.moveTo(ps[i].x, ps[i].y);
            ctx.lineTo(ps[j].x, ps[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw particles
      ps.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = t.particleColor + p.alpha + ")";
        ctx.fill();
      });

      animRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [mode]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed", top: 0, left: 0, zIndex: 0,
        pointerEvents: "none", width: "100%", height: "100%",
      }}
    />
  );
}

// ─── Metric Card ─────────────────────────────────────────────────────────────
function MetricCard({ title, value, unit, sub, icon, color, mode, pulse }) {
  const t = themes[mode];
  return (
    <div style={{
      background: t.card,
      border: `1px solid ${t.cardBorder}`,
      borderRadius: 16,
      padding: "20px 24px",
      position: "relative",
      overflow: "hidden",
      boxShadow: `0 4px 24px ${t.glow}`,
      transition: "all 0.3s ease",
    }}>
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 3,
        background: `linear-gradient(90deg, ${color}, transparent)`,
      }} />
      {pulse && (
        <span style={{
          position: "absolute", top: 16, right: 16,
          width: 8, height: 8, borderRadius: "50%",
          background: color, display: "block",
          boxShadow: `0 0 8px ${color}`,
          animation: "pulse 1.5s infinite",
        }} />
      )}
      <div style={{ fontSize: 22, marginBottom: 8 }}>{icon}</div>
      <div style={{ color: t.textMuted, fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>
        {title}
      </div>
      <div style={{ color, fontSize: 32, fontWeight: 800, fontFamily: "'Space Mono', monospace", lineHeight: 1 }}>
        {value}<span style={{ fontSize: 14, color: t.textSub, marginLeft: 4 }}>{unit}</span>
      </div>
      {sub && <div style={{ color: t.textMuted, fontSize: 12, marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

// ─── Report Panel ─────────────────────────────────────────────────────────────
function ReportPanel({ report, mode, onClose }) {
  const t = themes[mode];
  if (!report) return null;
  const levelColor = { light: t.success, medium: t.warning, heavy: t.danger };
  const riskColor = { low: t.success, medium: t.warning, high: t.danger };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: t.surface, borderRadius: 20,
        border: `1px solid ${t.cardBorder}`,
        padding: 36, maxWidth: 640, width: "100%",
        maxHeight: "90vh", overflowY: "auto",
        boxShadow: `0 24px 80px rgba(0,0,0,0.5)`,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ color: t.text, fontFamily: "'Space Mono', monospace", fontSize: 20, margin: 0 }}>
            📊 Traffic Report
          </h2>
          <button onClick={onClose} style={{
            background: "none", border: "none", color: t.textSub,
            fontSize: 24, cursor: "pointer",
          }}>×</button>
        </div>

        <div style={{ color: t.textSub, fontSize: 14, marginBottom: 20 }}>
          <strong style={{ color: t.accent }}>{report.domain}</strong> — generated at {new Date(report.generated_at).toLocaleTimeString()}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
          {[
            ["Traffic Level", report.traffic_level, levelColor[report.traffic_level]],
            ["Lag Risk", report.lag_risk, riskColor[report.lag_risk]],
            ["Active Users", report.summary.active_users, t.accent],
            ["Requests/min", report.summary.requests_per_minute, t.accent2],
            ["Avg Response", `${report.summary.avg_response_time_ms}ms`, t.accent3],
            ["Error Rate", `${report.summary.error_rate_percent}%`, t.danger],
          ].map(([label, val, color]) => (
            <div key={label} style={{ background: t.card, borderRadius: 12, padding: "12px 16px", border: `1px solid ${t.cardBorder}` }}>
              <div style={{ color: t.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
              <div style={{ color, fontWeight: 700, fontSize: 18, fontFamily: "'Space Mono', monospace", marginTop: 4, textTransform: "capitalize" }}>{val}</div>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ color: t.textSub, fontSize: 12, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Insights</div>
          <div style={{ color: t.textMuted, fontSize: 13, marginBottom: 6 }}>
            Dominant Region: <span style={{ color: t.accent }}>{report.dominant_region}</span> &nbsp;|&nbsp;
            Dominant Device: <span style={{ color: t.accent2 }}>{report.dominant_device}</span>
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ color: t.danger, fontSize: 12, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>⚠ Issues Detected</div>
          {report.issues.map((iss, i) => (
            <div key={i} style={{ color: t.textSub, fontSize: 13, padding: "8px 12px", background: `${t.danger}15`, borderRadius: 8, marginBottom: 6, borderLeft: `3px solid ${t.danger}` }}>
              {iss}
            </div>
          ))}
        </div>

        <div>
          <div style={{ color: t.success, fontSize: 12, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>✅ Recommendations</div>
          {report.recommendations.map((rec, i) => (
            <div key={i} style={{ color: t.textSub, fontSize: 13, padding: "8px 12px", background: `${t.success}15`, borderRadius: 8, marginBottom: 6, borderLeft: `3px solid ${t.success}` }}>
              {rec}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [mode, setMode] = useState("dark");
  const [url, setUrl] = useState("");
  const [monitors, setMonitors] = useState({});
  const [wsStatus, setWsStatus] = useState("disconnected");
  const [report, setReport] = useState(null);
  const [activeUrl, setActiveUrl] = useState(null);
  const wsRef = useRef(null);
  const t = themes[mode];

  // WebSocket
  useEffect(() => {
    const connect = () => {
      const ws = new WebSocket(WS);
      wsRef.current = ws;
      ws.onopen = () => setWsStatus("connected");
      ws.onclose = () => { setWsStatus("disconnected"); setTimeout(connect, 3000); };
      ws.onerror = () => setWsStatus("error");
      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.type === "update") setMonitors(msg.data);
      };
    };
    connect();
    return () => wsRef.current?.close();
  }, []);

  const startMonitor = async () => {
    if (!url.trim()) return;
    await fetch(`${API}/monitor/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: url.trim() }),
    });
    setActiveUrl(url.trim().startsWith("http") ? url.trim() : "https://" + url.trim());
    setUrl("");
  };

  const stopMonitor = async (u) => {
    await fetch(`${API}/monitor/stop`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: u }),
    });
    if (activeUrl === u) setActiveUrl(null);
  };

  const fetchReport = async (domain) => {
    const res = await fetch(`${API}/monitor/report/${encodeURIComponent(domain)}`);
    const data = await res.json();
    setReport(data);
  };

  const data = activeUrl ? monitors[activeUrl] : Object.values(monitors)[0];
  const COLORS = [t.accent, t.accent2, t.accent3, t.warning, t.danger, "#a78bfa"];

  return (
    <div style={{
      minHeight: "100vh",
      background: t.bg,
      color: t.text,
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      position: "relative",
      zIndex: 1,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Inter:wght@300;400;500;600;700;800&display=swap');
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.4)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        ::-webkit-scrollbar{width:6px} ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:${t.cardBorder};border-radius:3px}
        * { box-sizing: border-box; }
      `}</style>

      <ParticleCanvas mode={mode} />

      {/* Header */}
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        background: mode === "dark" ? "rgba(3,7,18,0.8)" : "rgba(240,249,255,0.85)",
        backdropFilter: "blur(16px)",
        borderBottom: `1px solid ${t.cardBorder}`,
        padding: "0 32px",
        display: "flex", alignItems: "center", gap: 16, height: 64,
      }}>
        <div style={{ fontSize: 22 }}>🌐</div>
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 16, fontWeight: 700, color: t.accent, letterSpacing: -0.5 }}>
          TrafficPulse
        </span>
        <div style={{ flex: 1 }} />

        {/* WS Status */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: t.textMuted }}>
          <span style={{
            width: 7, height: 7, borderRadius: "50%",
            background: wsStatus === "connected" ? t.success : t.danger,
            display: "inline-block",
            boxShadow: wsStatus === "connected" ? `0 0 6px ${t.success}` : "none",
          }} />
          {wsStatus === "connected" ? "Live" : "Offline"}
        </div>

        {/* Theme Toggle */}
        <button onClick={() => setMode(m => m === "dark" ? "light" : "dark")} style={{
          background: t.surface, border: `1px solid ${t.cardBorder}`,
          borderRadius: 20, padding: "6px 14px", color: t.text,
          cursor: "pointer", fontSize: 13, fontWeight: 600,
          transition: "all 0.2s",
        }}>
          {mode === "dark" ? "☀ Light" : "🌙 Dark"}
        </button>
      </header>

      <main style={{ position: "relative", zIndex: 1, padding: "32px", maxWidth: 1400, margin: "0 auto" }}>

        {/* URL Input */}
        <div style={{
          background: t.card, border: `1px solid ${t.cardBorder}`,
          borderRadius: 16, padding: 24, marginBottom: 32,
          boxShadow: `0 8px 32px ${t.glow}`,
        }}>
          <h1 style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 800, color: t.text }}>
            Live Website Traffic Monitor
          </h1>
          <p style={{ color: t.textSub, fontSize: 14, margin: "0 0 20px" }}>
            Drop any website URL to monitor its traffic in real-time
          </p>
          <div style={{ display: "flex", gap: 12 }}>
            <input
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === "Enter" && startMonitor()}
              placeholder="e.g. https://example.com or just example.com"
              style={{
                flex: 1, padding: "12px 18px",
                background: t.surface, border: `1px solid ${t.cardBorder}`,
                borderRadius: 10, color: t.text, fontSize: 14,
                outline: "none",
              }}
            />
            <button onClick={startMonitor} style={{
              padding: "12px 28px", borderRadius: 10, border: "none",
              background: `linear-gradient(135deg, ${t.accent}, ${t.accent2})`,
              color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer",
              letterSpacing: 0.5,
            }}>
              Monitor →
            </button>
          </div>

          {/* Active monitors list */}
          {Object.keys(monitors).length > 0 && (
            <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {Object.values(monitors).map(m => (
                <div key={m.url} onClick={() => setActiveUrl(m.url)} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "6px 12px", borderRadius: 20,
                  background: activeUrl === m.url ? `${t.accent}20` : t.surface,
                  border: `1px solid ${activeUrl === m.url ? t.accent : t.cardBorder}`,
                  cursor: "pointer", fontSize: 13,
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: t.success, display: "inline-block" }} />
                  <span style={{ color: t.text }}>{m.domain}</span>
                  <button onClick={e => { e.stopPropagation(); stopMonitor(m.url); }} style={{
                    background: "none", border: "none", color: t.textMuted,
                    cursor: "pointer", fontSize: 14, padding: "0 2px",
                  }}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {!data && (
          <div style={{ textAlign: "center", padding: "80px 0", color: t.textMuted }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📡</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: t.textSub, marginBottom: 8 }}>No sites being monitored</div>
            <div style={{ fontSize: 14 }}>Enter a URL above to start monitoring live traffic</div>
          </div>
        )}

        {data && (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
            {/* 9 Metric Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16, marginBottom: 28 }}>
              <MetricCard title="Active Users" value={data.active_users} icon="👥"
                sub={`Peak: ${data.peak_users}`} color={t.accent} mode={mode} pulse />
              <MetricCard title="Total Requests" value={data.total_requests.toLocaleString()} icon="📨"
                sub={`${data.requests_per_minute} req/min`} color={t.accent2} mode={mode} />
              <MetricCard title="Avg Response" value={Math.round(data.avg_response_time)} unit="ms" icon="⚡"
                sub={`Last: ${Math.round(data.last_response_time)}ms`}
                color={data.avg_response_time > 800 ? t.danger : t.success} mode={mode} pulse />
              <MetricCard title="Error Rate" value={data.error_rate} unit="%" icon="❌"
                sub={`${data.error_count} total errors`}
                color={data.error_rate > 5 ? t.danger : t.success} mode={mode} />
              <MetricCard title="Traffic Level" value={data.traffic_level} icon="📊"
                sub={`${data.requests_per_minute} req/min`}
                color={data.traffic_level === "heavy" ? t.danger : data.traffic_level === "medium" ? t.warning : t.success}
                mode={mode} />
              <MetricCard title="Lag Risk" value={data.lag_risk} icon="⚠️"
                sub="User experience risk"
                color={data.lag_risk === "high" ? t.danger : data.lag_risk === "medium" ? t.warning : t.success}
                mode={mode} />
              <MetricCard title="Bandwidth" value={data.bandwidth_mbps} unit="Mbps" icon="📡"
                sub="Current throughput" color={t.accent3} mode={mode} />
              <MetricCard title="Uptime" value={Math.floor(data.uptime_seconds / 60)} unit="min" icon="🕐"
                sub="Monitoring duration" color={t.accent2} mode={mode} />
              <MetricCard title="Domain" value={data.domain} icon="🌐"
                sub="Being monitored" color={t.accent} mode={mode} />
            </div>

            {/* Charts Row 1 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>

              {/* Traffic over time */}
              <div style={{ background: t.card, border: `1px solid ${t.cardBorder}`, borderRadius: 16, padding: 24 }}>
                <h3 style={{ color: t.text, margin: "0 0 20px", fontSize: 15, fontWeight: 700 }}>📈 Traffic Over Time</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={data.traffic_history}>
                    <defs>
                      <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={t.accent} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={t.accent} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="grad2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={t.accent2} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={t.accent2} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={t.cardBorder} />
                    <XAxis dataKey="time" tick={{ fill: t.textMuted, fontSize: 10 }} />
                    <YAxis tick={{ fill: t.textMuted, fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: t.surface, border: `1px solid ${t.cardBorder}`, borderRadius: 8 }} labelStyle={{ color: t.text }} />
                    <Area type="monotone" dataKey="users" stroke={t.accent} fill="url(#grad1)" strokeWidth={2} name="Users" />
                    <Area type="monotone" dataKey="requests" stroke={t.accent2} fill="url(#grad2)" strokeWidth={2} name="Requests" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Response time */}
              <div style={{ background: t.card, border: `1px solid ${t.cardBorder}`, borderRadius: 16, padding: 24 }}>
                <h3 style={{ color: t.text, margin: "0 0 20px", fontSize: 15, fontWeight: 700 }}>⚡ Response Time (ms)</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={data.response_time_history}>
                    <CartesianGrid strokeDasharray="3 3" stroke={t.cardBorder} />
                    <XAxis dataKey="time" tick={{ fill: t.textMuted, fontSize: 10 }} />
                    <YAxis tick={{ fill: t.textMuted, fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: t.surface, border: `1px solid ${t.cardBorder}`, borderRadius: 8 }} />
                    <Line type="monotone" dataKey="value" stroke={data.avg_response_time > 800 ? t.danger : t.accent3}
                      strokeWidth={2} dot={false} name="Response Time (ms)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Charts Row 2 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, marginBottom: 20 }}>

              {/* Geographic */}
              <div style={{ background: t.card, border: `1px solid ${t.cardBorder}`, borderRadius: 16, padding: 24 }}>
                <h3 style={{ color: t.text, margin: "0 0 20px", fontSize: 15, fontWeight: 700 }}>🌍 Geography</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={Object.entries(data.geographic_data).map(([name, value]) => ({ name, value }))}
                      cx="50%" cy="50%" outerRadius={70} dataKey="value">
                      {Object.keys(data.geographic_data).map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: t.surface, border: `1px solid ${t.cardBorder}`, borderRadius: 8 }} />
                    <Legend wrapperStyle={{ fontSize: 11, color: t.textMuted }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Device split */}
              <div style={{ background: t.card, border: `1px solid ${t.cardBorder}`, borderRadius: 16, padding: 24 }}>
                <h3 style={{ color: t.text, margin: "0 0 20px", fontSize: 15, fontWeight: 700 }}>📱 Devices</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={Object.entries(data.device_data).map(([name, value]) => ({ name, value }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke={t.cardBorder} />
                    <XAxis dataKey="name" tick={{ fill: t.textMuted, fontSize: 11 }} />
                    <YAxis tick={{ fill: t.textMuted, fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: t.surface, border: `1px solid ${t.cardBorder}`, borderRadius: 8 }} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {Object.keys(data.device_data).map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Status codes */}
              <div style={{ background: t.card, border: `1px solid ${t.cardBorder}`, borderRadius: 16, padding: 24 }}>
                <h3 style={{ color: t.text, margin: "0 0 16px", fontSize: 15, fontWeight: 700 }}>🔢 HTTP Status Codes</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {Object.entries(data.status_codes).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([code, count]) => {
                    const total = Object.values(data.status_codes).reduce((a, b) => a + b, 0);
                    const pct = Math.round((count / total) * 100);
                    const color = code.startsWith("2") ? t.success : code.startsWith("3") ? t.accent : code.startsWith("4") ? t.warning : t.danger;
                    return (
                      <div key={code}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                          <span style={{ color, fontSize: 12, fontFamily: "'Space Mono',monospace", fontWeight: 700 }}>{code}</span>
                          <span style={{ color: t.textMuted, fontSize: 12 }}>{pct}%</span>
                        </div>
                        <div style={{ height: 6, background: t.surface, borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 3, transition: "width 0.5s ease" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Traffic Severity Bar */}
            <div style={{ background: t.card, border: `1px solid ${t.cardBorder}`, borderRadius: 16, padding: 24, marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ color: t.text, margin: 0, fontSize: 15, fontWeight: 700 }}>🚦 Traffic Severity Breakdown</h3>
                <button onClick={() => fetchReport(data.domain)} style={{
                  padding: "8px 20px", borderRadius: 8, border: "none",
                  background: `linear-gradient(135deg, ${t.accent}, ${t.accent2})`,
                  color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
                }}>
                  📋 Full Report
                </button>
              </div>
              <div style={{ display: "flex", gap: 16 }}>
                {[
                  ["🟢 Light", "< 10 req/min", t.success, data.traffic_level === "light"],
                  ["🟡 Medium", "10–50 req/min", t.warning, data.traffic_level === "medium"],
                  ["🔴 Heavy", "> 50 req/min", t.danger, data.traffic_level === "heavy"],
                ].map(([label, range, color, active]) => (
                  <div key={label} style={{
                    flex: 1, padding: "14px 18px", borderRadius: 12,
                    border: `2px solid ${active ? color : t.cardBorder}`,
                    background: active ? `${color}15` : t.surface,
                    transition: "all 0.3s",
                  }}>
                    <div style={{ color: active ? color : t.textMuted, fontWeight: 700, fontSize: 15 }}>{label}</div>
                    <div style={{ color: t.textMuted, fontSize: 12, marginTop: 4 }}>{range}</div>
                    {active && <div style={{ color, fontSize: 11, marginTop: 6, fontWeight: 600 }}>● CURRENT</div>}
                  </div>
                ))}
              </div>
            </div>

            {/* Live Table */}
            <div style={{ background: t.card, border: `1px solid ${t.cardBorder}`, borderRadius: 16, overflow: "hidden" }}>
              <div style={{ padding: "20px 24px", borderBottom: `1px solid ${t.cardBorder}` }}>
                <h3 style={{ color: t.text, margin: 0, fontSize: 15, fontWeight: 700 }}>📋 Live Request Log</h3>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: t.surface }}>
                      {["Time", "Users", "Req/min", "Response", "Traffic", "Lag Risk"].map(h => (
                        <th key={h} style={{ padding: "10px 20px", textAlign: "left", color: t.textMuted, fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.traffic_history.slice(-8).reverse().map((row, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${t.cardBorder}` }}>
                        <td style={{ padding: "12px 20px", color: t.textSub, fontSize: 13, fontFamily: "'Space Mono',monospace" }}>{row.time}</td>
                        <td style={{ padding: "12px 20px", color: t.text, fontWeight: 600, fontSize: 13 }}>{row.users}</td>
                        <td style={{ padding: "12px 20px", color: t.accent, fontSize: 13 }}>{row.requests}</td>
                        <td style={{ padding: "12px 20px", color: row.response_time > 800 ? t.danger : t.success, fontFamily: "'Space Mono',monospace", fontSize: 13 }}>{Math.round(row.response_time)}ms</td>
                        <td style={{ padding: "12px 20px" }}>
                          <span style={{
                            padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700,
                            background: row.users > 150 ? `${t.danger}20` : row.users > 80 ? `${t.warning}20` : `${t.success}20`,
                            color: row.users > 150 ? t.danger : row.users > 80 ? t.warning : t.success,
                          }}>
                            {row.users > 150 ? "Heavy" : row.users > 80 ? "Medium" : "Light"}
                          </span>
                        </td>
                        <td style={{ padding: "12px 20px" }}>
                          <span style={{
                            padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700,
                            background: row.response_time > 2000 ? `${t.danger}20` : row.response_time > 800 ? `${t.warning}20` : `${t.success}20`,
                            color: row.response_time > 2000 ? t.danger : row.response_time > 800 ? t.warning : t.success,
                          }}>
                            {row.response_time > 2000 ? "High" : row.response_time > 800 ? "Medium" : "Low"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      <ReportPanel report={report} mode={mode} onClose={() => setReport(null)} />
    </div>
  );
}
