import { useState } from "react";
import axios from "axios";

const API = "http://localhost:8000";

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async () => {
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      if (isLogin) {
        const res = await axios.post(`${API}/login`, {
          email: form.email,
          password: form.password,
        });
        localStorage.setItem("token", res.data.access_token);
        // ✅ 修复：直接从响应体取 user_id（后端已修复返回此字段）
        // 备用方案：若 user_id 意外缺失，则从 JWT payload 的 sub 字段解析
        const userId =
          res.data.user_id ??
          JSON.parse(atob(res.data.access_token.split(".")[1])).sub;
        localStorage.setItem("user_id", String(userId));
        setSuccess("登录成功！正在跳转...");
        setTimeout(() => (window.location.href = "/tags"), 1000);
      } else {
        await axios.post(`${API}/register`, {
          username: form.username,
          email: form.email,
          password: form.password,
        });
        setSuccess("注册成功！请登录。");
        setIsLogin(true);
      }
    } catch (err) {
      setError(err.response?.data?.detail || "操作失败，请检查信息后重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.bg}>
      <div style={styles.blob1} />
      <div style={styles.blob2} />

      <div style={styles.card}>
        <div style={styles.logoRow}>
          <div style={styles.logoIcon}>❄️</div>
          <span style={styles.logoText}>SmartFridge</span>
        </div>

        <p style={styles.tagline}>AI 智能食材管理 · 减少浪费 · 个性推荐</p>

        <div style={styles.toggle}>
          <button
            style={{ ...styles.toggleBtn, ...(isLogin ? styles.toggleActive : {}) }}
            onClick={() => { setIsLogin(true); setError(""); setSuccess(""); }}
          >
            登录
          </button>
          <button
            style={{ ...styles.toggleBtn, ...(!isLogin ? styles.toggleActive : {}) }}
            onClick={() => { setIsLogin(false); setError(""); setSuccess(""); }}
          >
            注册
          </button>
        </div>

        <div style={styles.form}>
          {!isLogin && (
            <div style={styles.fieldGroup}>
              <label style={styles.label}>用户名</label>
              <input
                style={styles.input}
                name="username"
                placeholder="请输入用户名"
                value={form.username}
                onChange={handleChange}
              />
            </div>
          )}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>邮箱</label>
            <input
              style={styles.input}
              name="email"
              type="email"
              placeholder="请输入邮箱"
              value={form.email}
              onChange={handleChange}
            />
          </div>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>密码</label>
            <input
              style={styles.input}
              name="password"
              type="password"
              placeholder="请输入密码"
              value={form.password}
              onChange={handleChange}
            />
          </div>

          {error && <div style={styles.error}>⚠️ {error}</div>}
          {success && <div style={styles.successMsg}>✅ {success}</div>}

          <button
            style={{ ...styles.submitBtn, opacity: loading ? 0.7 : 1 }}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "加载中..." : isLogin ? "登录" : "注册"}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  bg: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0f2027, #203a43, #2c5364)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
    fontFamily: "'Segoe UI', sans-serif",
  },
  blob1: {
    position: "absolute", width: 400, height: 400, borderRadius: "50%",
    background: "rgba(0,200,255,0.08)", top: -100, left: -100, filter: "blur(60px)",
  },
  blob2: {
    position: "absolute", width: 350, height: 350, borderRadius: "50%",
    background: "rgba(0,255,180,0.07)", bottom: -80, right: -80, filter: "blur(60px)",
  },
  card: {
    background: "rgba(255,255,255,0.05)",
    backdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 24, padding: "40px 44px",
    width: "100%", maxWidth: 420,
    boxShadow: "0 24px 60px rgba(0,0,0,0.4)", zIndex: 1,
  },
  logoRow: { display: "flex", alignItems: "center", gap: 10, marginBottom: 6 },
  logoIcon: { fontSize: 32 },
  logoText: { fontSize: 26, fontWeight: 700, color: "#fff", letterSpacing: "-0.5px" },
  tagline: { color: "rgba(255,255,255,0.5)", fontSize: 13, marginBottom: 28, marginTop: 2 },
  toggle: {
    display: "flex", background: "rgba(255,255,255,0.07)",
    borderRadius: 12, padding: 4, marginBottom: 28,
  },
  toggleBtn: {
    flex: 1, padding: "10px 0", border: "none", borderRadius: 9,
    background: "transparent", color: "rgba(255,255,255,0.5)",
    fontSize: 15, fontWeight: 600, cursor: "pointer", transition: "all 0.25s",
  },
  toggleActive: {
    background: "rgba(255,255,255,0.15)", color: "#fff",
    boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
  },
  form: { display: "flex", flexDirection: "column", gap: 16 },
  fieldGroup: { display: "flex", flexDirection: "column", gap: 6 },
  label: { color: "rgba(255,255,255,0.65)", fontSize: 13, fontWeight: 500 },
  input: {
    padding: "12px 16px", borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.15)",
    background: "rgba(255,255,255,0.07)",
    color: "#fff", fontSize: 15, outline: "none", transition: "border 0.2s",
  },
  error: {
    background: "rgba(255,80,80,0.15)", border: "1px solid rgba(255,80,80,0.3)",
    borderRadius: 8, color: "#ff8080", padding: "10px 14px", fontSize: 13,
  },
  successMsg: {
    background: "rgba(0,220,130,0.15)", border: "1px solid rgba(0,220,130,0.3)",
    borderRadius: 8, color: "#00dc82", padding: "10px 14px", fontSize: 13,
  },
  submitBtn: {
    marginTop: 4, padding: "14px", borderRadius: 12, border: "none",
    background: "linear-gradient(135deg, #00b4d8, #0077b6)",
    color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer",
    letterSpacing: "0.5px", boxShadow: "0 4px 20px rgba(0,180,216,0.35)",
    transition: "opacity 0.2s",
  },
};