import { useState, useEffect } from "react";
import axios from "axios";

const API = "https://smartfridge.cc.cd/api";

function getDaysLeft(expiryDate) {
  const today = new Date(); today.setHours(0,0,0,0);
  const expiry = new Date(expiryDate); expiry.setHours(0,0,0,0);
  return Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
}

function ExpiryBadge({ days }) {
  if (days < 0)  return <span style={{ ...styles.badge, ...styles.badgeExpired }}>已过期</span>;
  if (days <= 3) return <span style={{ ...styles.badge, ...styles.badgeRed }}>⚡ {days}天后过期</span>;
  if (days <= 7) return <span style={{ ...styles.badge, ...styles.badgeYellow }}>⏳ {days}天</span>;
  return <span style={{ ...styles.badge, ...styles.badgeGreen }}>✓ {days}天</span>;
}

export default function Fridge() {
  const [items, setItems]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [showAdd, setShowAdd]       = useState(false);
  const [form, setForm]             = useState({ ingredient: "", quantity: "", unit: "pcs", expiry_date: "" });
  const [adding, setAdding]         = useState(false);
  const [deleting, setDeleting]     = useState(null);
  const [clearingExpired, setClearingExpired] = useState(false);
  // ✅ 多选删除
  const [selectMode, setSelectMode]       = useState(false);
  const [selectedIds, setSelectedIds]     = useState([]);
  const [batchDeleting, setBatchDeleting] = useState(false);

  const userId  = localStorage.getItem("user_id") || "1";
  const token   = localStorage.getItem("token");
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const fetchItems = async () => {
    try {
      const res = await axios.get(`${API}/fridge/${userId}`, { headers });
      setItems(res.data);
    } catch { setError("加载失败，请检查后端服务"); }
    finally  { setLoading(false); }
  };

  useEffect(() => { fetchItems(); }, []); // eslint-disable-line

  const handleAdd = async () => {
  if (!form.ingredient || !form.quantity || !form.expiry_date) { setError("请填写所有字段"); return; }
  setAdding(true); setError("");
  try {
    // ✅ 先查冰箱，有同名食材就累加数量，没有才新增
    const fridgeRes = await axios.get(`${API}/fridge/${userId}`, { headers });
    const existing = fridgeRes.data.find(i => i.ingredient === form.ingredient);
    if (existing) {
      await axios.put(`${API}/fridge/${existing.item_id}`, {
        quantity: existing.quantity + parseFloat(form.quantity),
        expiry_date: form.expiry_date,
      }, { headers });
    } else {
      await axios.post(`${API}/fridge`, {
        user_id: parseInt(userId), ingredient: form.ingredient,
        quantity: parseFloat(form.quantity), unit: form.unit || "pcs", expiry_date: form.expiry_date,
      }, { headers });
    }
    setForm({ ingredient: "", quantity: "", unit: "pcs", expiry_date: "" });
    setShowAdd(false); fetchItems();
  } catch { setError("添加失败，请重试"); }
  finally { setAdding(false); }
};

  const handleDelete = async (itemId) => {
    setDeleting(itemId);
    try {
      await axios.delete(`${API}/fridge/${itemId}`, { headers });
      setItems((prev) => prev.filter((i) => i.item_id !== itemId));
    } catch { setError("删除失败"); }
    finally { setDeleting(null); }
  };

  const handleClearExpired = async () => {
    const expired = items.filter((i) => getDaysLeft(i.expiry_date) < 0);
    if (!expired.length) return;
    setClearingExpired(true);
    try {
      await axios.post(`${API}/fridge/batch-delete`, { item_ids: expired.map(i => i.item_id) }, { headers });
      setItems((prev) => prev.filter((i) => getDaysLeft(i.expiry_date) >= 0));
    } catch { setError("清理失败"); }
    finally { setClearingExpired(false); }
  };

  const toggleSelectMode = () => { setSelectMode(s => !s); setSelectedIds([]); };
  const toggleSelectItem = (id) => setSelectedIds((prev) =>
    prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const handleBatchDelete = async () => {
    if (!selectedIds.length) return;
    setBatchDeleting(true);
    try {
      await axios.post(`${API}/fridge/batch-delete`, { item_ids: selectedIds }, { headers });
      setItems((prev) => prev.filter((i) => !selectedIds.includes(i.item_id)));
      setSelectedIds([]); setSelectMode(false);
    } catch { setError("批量删除失败"); }
    finally { setBatchDeleting(false); }
  };

  const expiringSoon = items.filter((i) => { const d = getDaysLeft(i.expiry_date); return d >= 0 && d <= 3; });
  const expiredItems = items.filter((i) => getDaysLeft(i.expiry_date) < 0);

  return (
    <div style={styles.bg}>
      <div style={styles.blob1} />
      <div style={styles.container}>
        <div style={styles.nav}>
          <div style={styles.navLogo}>❄️ SmartFridge</div>
          <div style={styles.navLinks}>
            <a href="/fridge"   style={{ ...styles.navLink, color: "#fff", fontWeight: "bold" }}>冰箱</a>
            <a href="/shopping" style={styles.navLink}>购物清单</a>
            <a href="/ai"       style={styles.navLink}>AI推荐</a>
            <a href="/calendar" style={styles.navLink}>📅 日历</a>
          </div>
        </div>

        {expiringSoon.length > 0 && (
          <div style={styles.alertBanner}>
            ⚡ <strong>{expiringSoon.length} 件食材即将过期（3天内）：</strong>
            {expiringSoon.map(i => i.ingredient).join("、")}
          </div>
        )}

        <div style={styles.pageHeader}>
          <div>
            <h1 style={styles.title}>我的冰箱</h1>
            <p style={styles.subtitle}>共 {items.length} 件食材</p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {expiredItems.length > 0 && (
              <button style={{ ...styles.clearBtn, opacity: clearingExpired ? 0.7 : 1 }}
                onClick={handleClearExpired} disabled={clearingExpired}>
                {clearingExpired ? "清理中..." : `🗑 清理 ${expiredItems.length} 件过期`}
              </button>
            )}
            <button style={{ ...styles.selectBtn, background: selectMode ? "rgba(167,139,250,0.2)" : "rgba(255,255,255,0.07)" }}
              onClick={toggleSelectMode}>
              {selectMode ? "× 取消" : "☑ 多选删除"}
            </button>
            <button style={styles.addBtn} onClick={() => setShowAdd(s => !s)}>
              {showAdd ? "× 取消" : "+ 添加食材"}
            </button>
          </div>
        </div>

        {/* 多选操作栏 */}
        {selectMode && (
          <div style={styles.batchBar}>
            <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 14 }}>已选 {selectedIds.length} 件</span>
            <div style={{ display: "flex", gap: 10 }}>
              <button style={styles.selectAllBtn}
                onClick={() => setSelectedIds(items.map(i => i.item_id))}>全选</button>
              <button style={{ ...styles.batchDeleteBtn, opacity: (!selectedIds.length || batchDeleting) ? 0.5 : 1 }}
                onClick={handleBatchDelete} disabled={!selectedIds.length || batchDeleting}>
                {batchDeleting ? "删除中..." : `删除所选 (${selectedIds.length})`}
              </button>
            </div>
          </div>
        )}

        {showAdd && (
          <div style={styles.addCard}>
            <h3 style={styles.addCardTitle}>添加食材</h3>
            <div style={styles.addRow}>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>食材名称</label>
                <input style={styles.input} placeholder="如：西红柿" value={form.ingredient}
                  onChange={(e) => setForm({ ...form, ingredient: e.target.value })} />
              </div>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>数量</label>
                <input style={styles.input} placeholder="如：3" type="number" value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
              </div>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>单位</label>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                  {[["pcs","个/份"], ["克","克"], ["千克","千克"], ["毫升","毫升"], ["升","升"]].map(([val, label]) => (
                    <button key={val} type="button"
                      style={{
                        padding: "6px 12px", borderRadius: 8, fontSize: 13, cursor: "pointer",
                        border: form.unit === val ? "1px solid #00b4d8" : "1px solid rgba(255,255,255,0.15)",
                        background: form.unit === val ? "rgba(0,180,216,0.2)" : "rgba(255,255,255,0.05)",
                        color: form.unit === val ? "#00b4d8" : "rgba(255,255,255,0.6)",
                      }}
                      onClick={() => setForm({ ...form, unit: val })}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>过期日期</label>
                <input style={styles.input} type="date" value={form.expiry_date}
                  onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} />
              </div>
              <button style={{ ...styles.confirmBtn, opacity: adding ? 0.7 : 1 }}
                onClick={handleAdd} disabled={adding}>
                {adding ? "添加中..." : "确认添加"}
              </button>
            </div>
          </div>
        )}

        {error && <div style={styles.error}>⚠️ {error}</div>}

        {loading ? (
          <div style={styles.loadingBox}><div style={styles.spinner} /></div>
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
                  {selectMode && <th style={styles.th}></th>}
                  {["食材名称", "数量", "过期日期", "状态", "操作"].map(h => <th key={h} style={styles.th}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const days = getDaysLeft(item.expiry_date);
                  const isSelected = selectedIds.includes(item.item_id);
                  return (
                    <tr key={item.item_id} style={{
                      ...styles.tr,
                      background: isSelected ? "rgba(167,139,250,0.12)"
                        : days < 0 ? "rgba(100,0,0,0.15)"
                        : days <= 3 ? "rgba(239,68,68,0.08)" : "transparent",
                    }}>
                      {selectMode && (
                        <td style={styles.td}>
                          <input type="checkbox" checked={isSelected}
                            onChange={() => toggleSelectItem(item.item_id)}
                            style={{ width: 18, height: 18, cursor: "pointer" }} />
                        </td>
                      )}
                      <td style={styles.td}>
                        <span style={styles.ingredientName}>
                          {days < 0 && "💀 "}{days >= 0 && days <= 3 && "🔴 "}
                          {item.ingredient}
                        </span>
                      </td>
                      <td style={styles.td}>{item.quantity} {item.unit}</td>
                      <td style={styles.td}>{item.expiry_date}</td>
                      <td style={styles.td}><ExpiryBadge days={days} /></td>
                      <td style={styles.td}>
                        {!selectMode && (
                          <button style={{ ...styles.deleteBtn, opacity: deleting === item.item_id ? 0.5 : 1 }}
                            onClick={() => handleDelete(item.item_id)} disabled={deleting === item.item_id}>
                            {deleting === item.item_id ? "..." : "删除"}
                          </button>
                        )}
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
  alertBanner: { display: "flex", alignItems: "center", gap: 8, background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 12, padding: "12px 18px", color: "#fca5a5", fontSize: 14, marginBottom: 24 },
  pageHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  title: { fontSize: 28, fontWeight: 800, color: "#fff", margin: 0 },
  subtitle: { fontSize: 14, color: "rgba(255,255,255,0.4)", margin: "6px 0 0" },
  clearBtn:  { padding: "10px 18px", borderRadius: 10, border: "1px solid rgba(239,68,68,0.4)",   background: "rgba(239,68,68,0.1)",   color: "#f87171", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  selectBtn: { padding: "10px 18px", borderRadius: 10, border: "1px solid rgba(167,139,250,0.4)", color: "#a78bfa", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  addBtn:    { padding: "10px 18px", borderRadius: 10, border: "1px solid rgba(0,180,216,0.4)",   background: "rgba(0,180,216,0.1)",   color: "#00b4d8", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  batchBar: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.2)", borderRadius: 10, padding: "10px 16px", marginBottom: 16 },
  selectAllBtn:   { padding: "7px 16px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.2)", background: "transparent", color: "rgba(255,255,255,0.7)", fontSize: 13, cursor: "pointer" },
  batchDeleteBtn: { padding: "7px 16px", borderRadius: 8, border: "none", background: "rgba(239,68,68,0.8)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" },
  addCard: { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "20px 24px", marginBottom: 20 },
  addCardTitle: { color: "#fff", fontSize: 16, fontWeight: 700, margin: "0 0 16px" },
  addRow: { display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end" },
  fieldGroup: { display: "flex", flexDirection: "column", gap: 6, flex: 1, minWidth: 140 },
  label: { color: "rgba(255,255,255,0.55)", fontSize: 12, fontWeight: 500 },
  input: { padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.07)", color: "#fff", fontSize: 14, outline: "none" },
  confirmBtn: { padding: "10px 20px", borderRadius: 8, border: "none", background: "linear-gradient(135deg, #00b4d8, #0077b6)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", alignSelf: "flex-end" },
  error: { padding: "12px 16px", borderRadius: 10, marginBottom: 16, background: "rgba(255,80,80,0.12)", border: "1px solid rgba(255,80,80,0.25)", color: "#ff8080", fontSize: 13 },
  loadingBox: { textAlign: "center", padding: 80 },
  spinner: { width: 36, height: 36, border: "3px solid rgba(255,255,255,0.08)", borderTop: "3px solid #00b4d8", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto" },
  emptyBox: { textAlign: "center", padding: 80 },
  tableWrapper: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, overflow: "hidden" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { padding: "14px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.4)", borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)", textTransform: "uppercase" },
  tr: { borderBottom: "1px solid rgba(255,255,255,0.05)" },
  td: { padding: "14px 16px", color: "rgba(255,255,255,0.8)", fontSize: 14 },
  ingredientName: { fontWeight: 600, color: "#fff" },
  badge: { padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 },
  badgeExpired: { background: "rgba(100,0,0,0.4)", color: "#f87171" },
  badgeRed:     { background: "rgba(239,68,68,0.15)", color: "#f87171" },
  badgeYellow:  { background: "rgba(234,179,8,0.15)", color: "#fbbf24" },
  badgeGreen:   { background: "rgba(34,197,94,0.12)", color: "#4ade80" },
  deleteBtn: { padding: "5px 12px", borderRadius: 6, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.1)", color: "#f87171", fontSize: 12, cursor: "pointer" },
};