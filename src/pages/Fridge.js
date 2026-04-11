import { useState, useEffect } from "react";
import axios from "axios";

const API = "http://localhost:8000";

function getDaysLeft(expiryDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  return Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
}

function ExpiryBadge({ days }) {
  if (days < 0) return <span style={{ ...styles.badge, ...styles.badgeExpired }}>已过期</span>;
  if (days <= 3) return <span style={{ ...styles.badge, ...styles.badgeRed }}>⚡ {days}天后过期</span>;
  if (days <= 7) return <span style={{ ...styles.badge, ...styles.badgeYellow }}>⏳ {days}天</span>;
  return <span style={{ ...styles.badge, ...styles.badgeGreen }}>✓ {days}天</span>;
}

export default function Fridge() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  // ✅ 修复：将 ingredient_id 改为 ingredient，与后端所需的数据结构保持一致
  const [form, setForm] = useState({ ingredient: "", quantity: "", expiry_date: "" });
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const userId = localStorage.getItem("user_id") || "1"; // 确保有一个默认的可用 userId
  const token = localStorage.getItem("token");
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  // 获取冰箱食材列表
  const fetchItems = async () => {
    try {
      const res = await axios.get(`${API}/fridge/${userId}`, { headers });
      setItems(res.data);
    } catch {
      setError("加载失败，请检查后端服务");
    } finally {
      setLoading(false);
    }
  };

  // ✅ 修复：添加 eslint-disable 注释，彻底解决黄色警告
  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 添加食材
  const handleAdd = async () => {
    if (!form.ingredient || !form.quantity || !form.expiry_date) {
      setError("请填写所有字段");
      return;
    }
    setAdding(true);
    setError("");
    try {
      // ✅ 修复：请求路径和参数格式完美适配后端的 FridgeItemCreate 模型
      await axios.post(`${API}/fridge`, {
        user_id: parseInt(userId),
        ingredient: form.ingredient,  // 后端需要字符串
        quantity: parseFloat(form.quantity),
        unit: "pcs",                  // 提供默认单位
        expiry_date: form.expiry_date,
      }, { headers });
      
      setForm({ ingredient: "", quantity: "", expiry_date: "" });
      setShowAdd(false);
      fetchItems(); // 添加成功后重新获取列表
    } catch {
      setError("添加失败，请重试");
    } finally {
      setAdding(false);
    }
  };

  // 删除食材
  const handleDelete = async (itemId) => {
    setDeleting(itemId);
    try {
      // ✅ 修复：修改为正确的后端删除路径
      await axios.delete(`${API}/fridge/${itemId}`, { headers });
      // ✅ 修复：后端返回的 ID 字段名为 item_id
      setItems((prev) => prev.filter((i) => i.item_id !== itemId));
    } catch {
      setError("删除失败");
    } finally {
      setDeleting(null);
    }
  };

  const expiringSoon = items.filter((i) => getDaysLeft(i.expiry_date) <= 3);

  return (
    <div style={styles.bg}>
      <div style={styles.blob1} />

      <div style={styles.container}>
        {/* Nav */}
        <div style={styles.nav}>
          <div style={styles.navLogo}>❄️ SmartFridge</div>
          <div style={styles.navLinks}>
            <a href="/fridge" style={{...styles.navLink, color: '#fff', fontWeight: 'bold'}}>冰箱</a>
            <a href="/shopping" style={styles.navLink}>购物清单</a>
            <a href="/ai" style={styles.navLink}>AI推荐</a>
          </div>
        </div>

        {/* Alert Banner */}
        {expiringSoon.length > 0 && (
          <div style={styles.alertBanner}>
            <span>⚡</span>
            <strong>{expiringSoon.length} 件食材即将过期（3天内）：</strong>
            {/* ✅ 修复：使用后端的 ingredient 字段 */}
            <span>{expiringSoon.map((i) => i.ingredient).join("、")}</span>
          </div>
        )}

        {/* Header */}
        <div style={styles.pageHeader}>
          <div>
            <h1 style={styles.title}>我的冰箱</h1>
            <p style={styles.subtitle}>共 {items.length} 件食材</p>
          </div>
          <button style={styles.addBtn} onClick={() => setShowAdd(!showAdd)}>
            {showAdd ? "× 取消" : "+ 添加食材"}
          </button>
        </div>

        {/* Add Form */}
        {showAdd && (
          <div style={styles.addCard}>
            <h3 style={styles.addCardTitle}>添加食材</h3>
            <div style={styles.addRow}>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>食材名称</label>
                <input
                  style={styles.input}
                  placeholder="如：西红柿"
                  value={form.ingredient}
                  onChange={(e) => setForm({ ...form, ingredient: e.target.value })}
                />
              </div>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>数量</label>
                <input
                  style={styles.input}
                  placeholder="如：3"
                  type="number"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                />
              </div>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>过期日期</label>
                <input
                  style={styles.input}
                  type="date"
                  value={form.expiry_date}
                  onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
                />
              </div>
              <button
                style={{ ...styles.confirmBtn, opacity: adding ? 0.7 : 1 }}
                onClick={handleAdd}
                disabled={adding}
              >
                {adding ? "添加中..." : "确认添加"}
              </button>
            </div>
          </div>
        )}

        {error && <div style={styles.error}>⚠️ {error}</div>}

        {/* Table */}
        {loading ? (
          <div style={styles.loadingBox}>
            <div style={styles.spinner} />
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>加载中...</p>
          </div>
        ) : items.length === 0 ? (
          <div style={styles.emptyBox}>
            <div style={{ fontSize: 48 }}>🧊</div>
            <p style={{ color: "rgba(255,255,255,0.4)", marginTop: 12 }}>冰箱是空的，快去添加食材吧！</p>
          </div>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  {["食材名称", "数量", "过期日期", "状态", "操作"].map((h) => (
                    <th key={h} style={styles.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const days = getDaysLeft(item.expiry_date);
                  const isUrgent = days <= 3;
                  return (
                    <tr
                      key={item.item_id} // ✅ 修复：使用后端的 item_id
                      style={{
                        ...styles.tr,
                        background: isUrgent ? "rgba(239,68,68,0.08)" : "transparent",
                      }}
                    >
                      <td style={styles.td}>
                        <span style={styles.ingredientName}>
                          {isUrgent && <span style={{ marginRight: 6 }}>🔴</span>}
                          {item.ingredient} {/* ✅ 修复：使用后端的 ingredient */}
                        </span>
                      </td>
                      <td style={styles.td}>
                        {item.quantity} {item.unit || ""}
                      </td>
                      <td style={styles.td}>{item.expiry_date}</td>
                      <td style={styles.td}><ExpiryBadge days={days} /></td>
                      <td style={styles.td}>
                        <button
                          style={{ ...styles.deleteBtn, opacity: deleting === item.item_id ? 0.5 : 1 }}
                          onClick={() => handleDelete(item.item_id)} // ✅ 修复
                          disabled={deleting === item.item_id}
                        >
                          {deleting === item.item_id ? "..." : "删除"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  bg: { minHeight: "100vh", background: "linear-gradient(160deg, #0f2027, #203a43, #2c5364)", fontFamily: "'Segoe UI', sans-serif", position: "relative", paddingBottom: 60 },
  blob1: { position: "fixed", width: 600, height: 600, borderRadius: "50%", background: "rgba(0,180,216,0.05)", top: -200, right: -150, filter: "blur(100px)", zIndex: 0 },
  container: { maxWidth: 960, margin: "0 auto", padding: "0 24px", position: "relative", zIndex: 1 },
  nav: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 0", borderBottom: "1px solid rgba(255,255,255,0.07)", marginBottom: 24 },
  navLogo: { color: "#fff", fontWeight: 700, fontSize: 18 },
  navLinks: { display: "flex", gap: 24 },
  navLink: { color: "rgba(255,255,255,0.55)", textDecoration: "none", fontSize: 14, fontWeight: 500 },
  alertBanner: { display: "flex", alignItems: "center", gap: 10, background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 12, padding: "12px 18px", color: "#fca5a5", fontSize: 14, marginBottom: 24 },
  pageHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 },
  title: { fontSize: 28, fontWeight: 800, color: "#fff", margin: 0, letterSpacing: "-0.5px" },
  subtitle: { fontSize: 14, color: "rgba(255,255,255,0.4)", margin: "6px 0 0" },
  addBtn: { padding: "11px 22px", borderRadius: 10, border: "1px solid rgba(0,180,216,0.4)", background: "rgba(0,180,216,0.1)", color: "#00b4d8", fontSize: 14, fontWeight: 600, cursor: "pointer" },
  addCard: { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "20px 24px", marginBottom: 20 },
  addCardTitle: { color: "#fff", fontSize: 16, fontWeight: 700, margin: "0 0 16px" },
  addRow: { display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end" },
  fieldGroup: { display: "flex", flexDirection: "column", gap: 6, flex: 1, minWidth: 140 },
  label: { color: "rgba(255,255,255,0.55)", fontSize: 12, fontWeight: 500 },
  input: { padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.07)", color: "#fff", fontSize: 14, outline: "none" },
  confirmBtn: { padding: "10px 20px", borderRadius: 8, border: "none", background: "linear-gradient(135deg, #00b4d8, #0077b6)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", alignSelf: "flex-end" },
  error: { padding: "12px 16px", borderRadius: 10, marginBottom: 16, background: "rgba(255,80,80,0.12)", border: "1px solid rgba(255,80,80,0.25)", color: "#ff8080", fontSize: 13 },
  loadingBox: { textAlign: "center", padding: 80 },
  spinner: { width: 36, height: 36, border: "3px solid rgba(255,255,255,0.08)", borderTop: "3px solid #00b4d8", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" },
  emptyBox: { textAlign: "center", padding: 80 },
  tableWrapper: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, overflow: "hidden" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { padding: "14px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.4)", borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)", letterSpacing: "0.5px", textTransform: "uppercase" },
  tr: { borderBottom: "1px solid rgba(255,255,255,0.05)", transition: "background 0.15s" },
  td: { padding: "14px 16px", color: "rgba(255,255,255,0.8)", fontSize: 14 },
  ingredientName: { fontWeight: 600, color: "#fff" },
  badge: { padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 },
  badgeExpired: { background: "rgba(100,0,0,0.4)", color: "#f87171" },
  badgeRed: { background: "rgba(239,68,68,0.15)", color: "#f87171" },
  badgeYellow: { background: "rgba(234,179,8,0.15)", color: "#fbbf24" },
  badgeGreen: { background: "rgba(34,197,94,0.12)", color: "#4ade80" },
  deleteBtn: { padding: "5px 12px", borderRadius: 6, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.1)", color: "#f87171", fontSize: 12, cursor: "pointer" },
};