import { useState, useEffect } from "react";
import axios from "axios";

const API = "http://localhost:8000";

export default function Shopping() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ ingredient_id: "", quantity: "" });
  const [adding, setAdding] = useState(false);
  const [toggling, setToggling] = useState(null);

  const userId = localStorage.getItem("user_id");
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const fetchItems = async () => {
    try {
      const res = await axios.get(`${API}/shopping/${userId}`, { headers });
      setItems(res.data);
    } catch {
      setError("加载失败，请检查后端服务");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, []);

  const handleAdd = async () => {
    if (!form.ingredient_id || !form.quantity) { setError("请填写所有字段"); return; }
    setAdding(true); setError("");
    try {
      await axios.post(`${API}/shopping/${userId}`, {
        ingredient_id: parseInt(form.ingredient_id),
        quantity: parseFloat(form.quantity),
      }, { headers });
      setForm({ ingredient_id: "", quantity: "" });
      setShowAdd(false);
      fetchItems();
    } catch {
      setError("添加失败，请重试");
    } finally {
      setAdding(false);
    }
  };

  const handleToggle = async (itemId, currentStatus) => {
    setToggling(itemId);
    try {
      await axios.patch(`${API}/shopping/${itemId}/purchased`, {
        is_purchased: !currentStatus,
      }, { headers });
      setItems((prev) =>
        prev.map((i) => i.id === itemId ? { ...i, is_purchased: !currentStatus } : i)
      );
    } catch {
      setError("更新失败");
    } finally {
      setToggling(null);
    }
  };

  const pending = items.filter((i) => !i.is_purchased);
  const purchased = items.filter((i) => i.is_purchased);

  return (
    <div style={styles.bg}>
      <div style={styles.blob1} />
      <div style={styles.blob2} />

      <div style={styles.container}>
        {/* Nav */}
        <div style={styles.nav}>
          <div style={styles.navLogo}>❄️ SmartFridge</div>
          <div style={styles.navLinks}>
            <a href="/fridge" style={styles.navLink}>冰箱</a>
            <a href="/shopping" style={{ ...styles.navLink, color: "#00b4d8" }}>购物清单</a>
            <a href="/ai" style={styles.navLink}>AI推荐</a>
          </div>
        </div>

        {/* Stats row */}
        <div style={styles.statsRow}>
          <div style={styles.statCard}>
            <div style={styles.statNum}>{items.length}</div>
            <div style={styles.statLabel}>总计</div>
          </div>
          <div style={{ ...styles.statCard, ...styles.statCardOrange }}>
            <div style={styles.statNum}>{pending.length}</div>
            <div style={styles.statLabel}>待购买</div>
          </div>
          <div style={{ ...styles.statCard, ...styles.statCardGreen }}>
            <div style={styles.statNum}>{purchased.length}</div>
            <div style={styles.statLabel}>已购买</div>
          </div>
        </div>

        {/* Header */}
        <div style={styles.pageHeader}>
          <h1 style={styles.title}>购物清单</h1>
          <button style={styles.addBtn} onClick={() => setShowAdd(!showAdd)}>
            {showAdd ? "× 取消" : "+ 添加商品"}
          </button>
        </div>

        {/* Add Form */}
        {showAdd && (
          <div style={styles.addCard}>
            <div style={styles.addRow}>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>食材 ID</label>
                <input
                  style={styles.input}
                  placeholder="如：1（西红柿）"
                  value={form.ingredient_id}
                  onChange={(e) => setForm({ ...form, ingredient_id: e.target.value })}
                />
              </div>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>数量</label>
                <input
                  style={styles.input}
                  placeholder="如：2"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                />
              </div>
              <button
                style={{ ...styles.confirmBtn, opacity: adding ? 0.7 : 1 }}
                onClick={handleAdd}
                disabled={adding}
              >
                {adding ? "添加中..." : "确认"}
              </button>
            </div>
          </div>
        )}

        {error && <div style={styles.error}>⚠️ {error}</div>}

        {loading ? (
          <div style={styles.loadingBox}>
            <div style={styles.spinner} />
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>加载中...</p>
          </div>
        ) : (
          <div>
            {/* Pending items */}
            {pending.length > 0 && (
              <div style={styles.section}>
                <h2 style={styles.sectionTitle}>🛒 待购买</h2>
                {pending.map((item) => (
                  <ShoppingItem
                    key={item.id}
                    item={item}
                    onToggle={handleToggle}
                    toggling={toggling}
                  />
                ))}
              </div>
            )}

            {/* Purchased items */}
            {purchased.length > 0 && (
              <div style={styles.section}>
                <h2 style={{ ...styles.sectionTitle, color: "rgba(255,255,255,0.3)" }}>
                  ✅ 已购买
                </h2>
                {purchased.map((item) => (
                  <ShoppingItem
                    key={item.id}
                    item={item}
                    onToggle={handleToggle}
                    toggling={toggling}
                    done
                  />
                ))}
              </div>
            )}

            {items.length === 0 && (
              <div style={styles.emptyBox}>
                <div style={{ fontSize: 48 }}>🛍️</div>
                <p style={{ color: "rgba(255,255,255,0.4)", marginTop: 12 }}>
                  购物清单是空的
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ShoppingItem({ item, onToggle, toggling, done }) {
  const isLoading = toggling === item.id;
  return (
    <div style={{ ...styles.itemCard, opacity: done ? 0.55 : 1 }}>
      <button
        style={{
          ...styles.checkbox,
          background: done ? "#22c55e" : "transparent",
          border: done ? "2px solid #22c55e" : "2px solid rgba(255,255,255,0.2)",
          opacity: isLoading ? 0.5 : 1,
        }}
        onClick={() => onToggle(item.id, item.is_purchased)}
        disabled={isLoading}
      >
        {done && <span style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>✓</span>}
      </button>
      <div style={styles.itemInfo}>
        <span style={{
          ...styles.itemName,
          textDecoration: done ? "line-through" : "none",
          color: done ? "rgba(255,255,255,0.35)" : "#fff",
        }}>
          {item.ingredient?.name || `食材 #${item.ingredient_id}`}
        </span>
        <span style={styles.itemQty}>
          {item.quantity} {item.ingredient?.unit || ""}
        </span>
      </div>
      {!done && (
        <span style={styles.pendingTag}>待购买</span>
      )}
    </div>
  );
}

const styles = {
  bg: {
    minHeight: "100vh",
    background: "linear-gradient(160deg, #0f2027, #203a43, #2c5364)",
    fontFamily: "'Segoe UI', sans-serif",
    position: "relative",
    paddingBottom: 60,
  },
  blob1: {
    position: "fixed", width: 500, height: 500, borderRadius: "50%",
    background: "rgba(34,197,94,0.05)", bottom: -100, left: -100, filter: "blur(100px)", zIndex: 0,
  },
  blob2: {
    position: "fixed", width: 400, height: 400, borderRadius: "50%",
    background: "rgba(249,115,22,0.05)", top: -80, right: -80, filter: "blur(100px)", zIndex: 0,
  },
  container: { maxWidth: 680, margin: "0 auto", padding: "0 24px", position: "relative", zIndex: 1 },
  nav: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "20px 0", borderBottom: "1px solid rgba(255,255,255,0.07)", marginBottom: 28,
  },
  navLogo: { color: "#fff", fontWeight: 700, fontSize: 18 },
  navLinks: { display: "flex", gap: 24 },
  navLink: { color: "rgba(255,255,255,0.5)", textDecoration: "none", fontSize: 14, fontWeight: 500 },
  statsRow: { display: "flex", gap: 14, marginBottom: 28 },
  statCard: {
    flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 14, padding: "16px", textAlign: "center",
  },
  statCardOrange: { borderColor: "rgba(249,115,22,0.3)", background: "rgba(249,115,22,0.08)" },
  statCardGreen: { borderColor: "rgba(34,197,94,0.3)", background: "rgba(34,197,94,0.08)" },
  statNum: { fontSize: 28, fontWeight: 800, color: "#fff", lineHeight: 1 },
  statLabel: { fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 6 },
  pageHeader: {
    display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20,
  },
  title: { fontSize: 26, fontWeight: 800, color: "#fff", margin: 0 },
  addBtn: {
    padding: "10px 20px", borderRadius: 10, border: "1px solid rgba(0,180,216,0.4)",
    background: "rgba(0,180,216,0.1)", color: "#00b4d8", fontSize: 14, fontWeight: 600, cursor: "pointer",
  },
  addCard: {
    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 14, padding: "18px 20px", marginBottom: 18,
  },
  addRow: { display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" },
  fieldGroup: { display: "flex", flexDirection: "column", gap: 6, flex: 1, minWidth: 130 },
  label: { color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 500 },
  input: {
    padding: "10px 14px", borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.07)",
    color: "#fff", fontSize: 14, outline: "none",
  },
  confirmBtn: {
    padding: "10px 20px", borderRadius: 8, border: "none",
    background: "linear-gradient(135deg, #00b4d8, #0077b6)",
    color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", alignSelf: "flex-end",
  },
  error: {
    padding: "12px 16px", borderRadius: 10, marginBottom: 16,
    background: "rgba(255,80,80,0.12)", border: "1px solid rgba(255,80,80,0.25)",
    color: "#ff8080", fontSize: 13,
  },
  loadingBox: { textAlign: "center", padding: 80 },
  spinner: {
    width: 36, height: 36, border: "3px solid rgba(255,255,255,0.08)",
    borderTop: "3px solid #00b4d8", borderRadius: "50%",
    animation: "spin 0.8s linear infinite", margin: "0 auto 12px",
  },
  emptyBox: { textAlign: "center", padding: 80 },
  section: { marginBottom: 28 },
  sectionTitle: {
    fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.5)",
    textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 12px",
  },
  itemCard: {
    display: "flex", alignItems: "center", gap: 14,
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 12, padding: "14px 18px", marginBottom: 8, transition: "opacity 0.2s",
  },
  checkbox: {
    width: 24, height: 24, borderRadius: 7, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0, transition: "all 0.2s",
  },
  itemInfo: { flex: 1, display: "flex", flexDirection: "column", gap: 2 },
  itemName: { fontSize: 15, fontWeight: 600, transition: "all 0.2s" },
  itemQty: { fontSize: 12, color: "rgba(255,255,255,0.35)" },
  pendingTag: {
    fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20,
    background: "rgba(249,115,22,0.15)", color: "#fb923c",
  },
};