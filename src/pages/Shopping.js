import { useState, useEffect } from "react";
import axios from "axios";

const API = "http://localhost:8000";

export default function Shopping() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ ingredient: "", quantity: "" });
  const [adding, setAdding] = useState(false);
  const [toggling, setToggling] = useState(null);

  // ✅ 新增：保质期弹窗相关状态
  const [expiryModal, setExpiryModal] = useState(null); // { itemId, ingredient, quantity, unit }
  const [expiryDate, setExpiryDate] = useState("");
  const [addingToFridge, setAddingToFridge] = useState(false);

  const userId = localStorage.getItem("user_id") || "1";
  const token = localStorage.getItem("token");
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

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

  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAdd = async () => {
    if (!form.ingredient || !form.quantity) { setError("请填写所有字段"); return; }
    setAdding(true); setError("");
    try {
      await axios.post(`${API}/shopping`, {
        user_id: parseInt(userId),
        ingredient: form.ingredient,
        quantity: parseFloat(form.quantity),
        unit: "pcs"
      }, { headers });
      setForm({ ingredient: "", quantity: "" });
      setShowAdd(false);
      fetchItems();
    } catch {
      setError("添加失败，请重试");
    } finally {
      setAdding(false);
    }
  };

  // ✅ 修改：勾选已购买时弹出保质期输入框
  const handleToggle = async (item) => {
    // 如果是取消购买，直接更新状态，不需要弹窗
    if (item.is_purchased) {
      setToggling(item.item_id);
      try {
        await axios.put(`${API}/shopping/${item.item_id}`, { is_purchased: false }, { headers });
        setItems((prev) => prev.map((i) =>
          i.item_id === item.item_id ? { ...i, is_purchased: false } : i
        ));
      } catch {
        setError("更新失败");
      } finally {
        setToggling(null);
      }
      return;
    }

    // 如果是标记为已购买，弹出保质期输入框
    // ✅ 根据食材名称智能推算默认保质期
    const getDefaultDays = (name) => {
      const n = name;
      if (/牛|猪|羊|鸡|鸭|肉|排|腿|翅|肝|海鲜|虾|鱼|蟹|贝|蛤/.test(n)) return 4;
      if (/菠菜|生菜|白菜|油菜|空心菜|韭菜|香菜|葱|芹菜|莴苣/.test(n)) return 4;
      if (/土豆|红薯|萝卜|南瓜|冬瓜|莲藕|芋头|姜|蒜|洋葱|玉米/.test(n)) return 14;
      if (/豆腐|豆浆|豆皮|腐竹|豆芽/.test(n)) return 3;
      if (/蛋/.test(n)) return 30;
      if (/牛奶|奶|酸奶|奶酪|黄油|芝士/.test(n)) return 7;
      if (/苹果|香蕉|橙|橘|葡萄|草莓|西瓜|芒果|桃|梨|樱桃|蓝莓|猕猴桃/.test(n)) return 6;
      if (/面条|馒头|包子|饺子|面包/.test(n)) return 3;
      if (/盐|糖|酱|醋|油|料酒|淀粉|面粉|大米/.test(n)) return 180;
      if (/菜|瓜|茄|椒|菇|蘑菇|西红柿|番茄|黄瓜|西兰花/.test(n)) return 7;
      return 7;
    };
    const days = getDefaultDays(item.ingredient);
    const today = new Date();
    today.setDate(today.getDate() + days);
    const defaultDate = today.toISOString().split("T")[0];
    setExpiryDate(defaultDate);
    setExpiryModal(item);
  };

  // ✅ 新增：确认购买并写入冰箱
  const handleConfirmPurchase = async () => {
    if (!expiryDate) { setError("请填写保质期"); return; }
    setAddingToFridge(true);
    setError("");
    try {
      // 第一步：标记购物清单为已购买
      await axios.put(`${API}/shopping/${expiryModal.item_id}`, { is_purchased: true }, { headers });

      // 第二步：写入冰箱
      await axios.post(`${API}/fridge`, {
        user_id: parseInt(userId),
        ingredient: expiryModal.ingredient,
        quantity: expiryModal.quantity,
        unit: expiryModal.unit || "pcs",
        expiry_date: expiryDate,
      }, { headers });

      // 更新本地状态
      setItems((prev) => prev.map((i) =>
        i.item_id === expiryModal.item_id ? { ...i, is_purchased: true } : i
      ));
      setExpiryModal(null);
      setExpiryDate("");
    } catch {
      setError("操作失败，请重试");
    } finally {
      setAddingToFridge(false);
    }
  };

  const pending = items.filter((i) => !i.is_purchased);
  const purchased = items.filter((i) => i.is_purchased);

  return (
    <div style={styles.bg}>
      <div style={styles.blob1} />
      <div style={styles.blob2} />

      {/* ✅ 新增：保质期输入弹窗 */}
      {expiryModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <h3 style={styles.modalTitle}>🛒 已购买「{expiryModal.ingredient}」</h3>
            <p style={styles.modalSubtitle}>请填写保质期，食材将自动加入冰箱</p>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>过期日期</label>
              <input
                style={styles.input}
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
            </div>
            {error && <div style={styles.error}>⚠️ {error}</div>}
            <div style={styles.modalBtns}>
              <button
                style={styles.modalCancelBtn}
                onClick={() => { setExpiryModal(null); setError(""); }}
              >
                取消
              </button>
              <button
                style={{ ...styles.modalConfirmBtn, opacity: addingToFridge ? 0.7 : 1 }}
                onClick={handleConfirmPurchase}
                disabled={addingToFridge}
              >
                {addingToFridge ? "添加中..." : "✅ 确认并加入冰箱"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={styles.container}>
        {/* Nav */}
        <div style={styles.nav}>
          <div style={styles.navLogo}>❄️ SmartFridge</div>
          <div style={styles.navLinks}>
            <a href="/fridge" style={styles.navLink}>冰箱</a>
            <a href="/shopping" style={{ ...styles.navLink, color: "#00b4d8", fontWeight: "bold" }}>购物清单</a>
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
                <label style={styles.label}>商品名称</label>
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
                  placeholder="如：2"
                  type="number"
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

        {error && !expiryModal && <div style={styles.error}>⚠️ {error}</div>}

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
                    key={item.item_id}
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
                  ✅ 已购买（已加入冰箱）
                </h2>
                {purchased.map((item) => (
                  <ShoppingItem
                    key={item.item_id}
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
  const isLoading = toggling === item.item_id;
  return (
    <div style={{ ...styles.itemCard, opacity: done ? 0.55 : 1 }}>
      <button
        style={{
          ...styles.checkbox,
          background: done ? "#22c55e" : "transparent",
          border: done ? "2px solid #22c55e" : "2px solid rgba(255,255,255,0.2)",
          opacity: isLoading ? 0.5 : 1,
        }}
        onClick={() => onToggle(item)}
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
          {item.ingredient}
        </span>
        <span style={styles.itemQty}>
          {item.quantity} {item.unit || "pcs"}
        </span>
      </div>
      {/* ✅ 新增：已购买的显示"已入冰箱"标签，待购买的显示"勾选后可入冰箱"提示 */}
      {done ? (
        <span style={styles.fridgeTag}>❄️ 已入冰箱</span>
      ) : (
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
  blob1: { position: "fixed", width: 500, height: 500, borderRadius: "50%", background: "rgba(34,197,94,0.05)", bottom: -100, left: -100, filter: "blur(100px)", zIndex: 0 },
  blob2: { position: "fixed", width: 400, height: 400, borderRadius: "50%", background: "rgba(249,115,22,0.05)", top: -80, right: -80, filter: "blur(100px)", zIndex: 0 },
  container: { maxWidth: 680, margin: "0 auto", padding: "0 24px", position: "relative", zIndex: 1 },
  nav: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 0", borderBottom: "1px solid rgba(255,255,255,0.07)", marginBottom: 28 },
  navLogo: { color: "#fff", fontWeight: 700, fontSize: 18 },
  navLinks: { display: "flex", gap: 24 },
  navLink: { color: "rgba(255,255,255,0.5)", textDecoration: "none", fontSize: 14, fontWeight: 500 },
  statsRow: { display: "flex", gap: 14, marginBottom: 28 },
  statCard: { flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "16px", textAlign: "center" },
  statCardOrange: { borderColor: "rgba(249,115,22,0.3)", background: "rgba(249,115,22,0.08)" },
  statCardGreen: { borderColor: "rgba(34,197,94,0.3)", background: "rgba(34,197,94,0.08)" },
  statNum: { fontSize: 28, fontWeight: 800, color: "#fff", lineHeight: 1 },
  statLabel: { fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 6 },
  pageHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  title: { fontSize: 26, fontWeight: 800, color: "#fff", margin: 0 },
  addBtn: { padding: "10px 20px", borderRadius: 10, border: "1px solid rgba(0,180,216,0.4)", background: "rgba(0,180,216,0.1)", color: "#00b4d8", fontSize: 14, fontWeight: 600, cursor: "pointer" },
  addCard: { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "18px 20px", marginBottom: 18 },
  addRow: { display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" },
  fieldGroup: { display: "flex", flexDirection: "column", gap: 6, flex: 1, minWidth: 130 },
  label: { color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 500 },
  input: { padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.07)", color: "#fff", fontSize: 14, outline: "none" },
  confirmBtn: { padding: "10px 20px", borderRadius: 8, border: "none", background: "linear-gradient(135deg, #00b4d8, #0077b6)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", alignSelf: "flex-end" },
  error: { padding: "12px 16px", borderRadius: 10, marginBottom: 16, background: "rgba(255,80,80,0.12)", border: "1px solid rgba(255,80,80,0.25)", color: "#ff8080", fontSize: 13 },
  loadingBox: { textAlign: "center", padding: 80 },
  spinner: { width: 36, height: 36, border: "3px solid rgba(255,255,255,0.08)", borderTop: "3px solid #00b4d8", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" },
  emptyBox: { textAlign: "center", padding: 80 },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 12px" },
  itemCard: { display: "flex", alignItems: "center", gap: 14, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "14px 18px", marginBottom: 8, transition: "opacity 0.2s" },
  checkbox: { width: 24, height: 24, borderRadius: 7, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s" },
  itemInfo: { flex: 1, display: "flex", flexDirection: "column", gap: 2 },
  itemName: { fontSize: 15, fontWeight: 600, transition: "all 0.2s" },
  itemQty: { fontSize: 12, color: "rgba(255,255,255,0.35)" },
  pendingTag: { fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20, background: "rgba(249,115,22,0.15)", color: "#fb923c" },
  // ✅ 新增：已入冰箱标签样式
  fridgeTag: { fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20, background: "rgba(0,180,216,0.15)", color: "#00b4d8" },

  // ✅ 新增：弹窗样式
  modalOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" },
  modalCard: { background: "#1a2a3a", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 20, padding: "32px 36px", width: "100%", maxWidth: 400, boxShadow: "0 24px 60px rgba(0,0,0,0.5)" },
  modalTitle: { color: "#fff", fontSize: 18, fontWeight: 700, margin: "0 0 8px" },
  modalSubtitle: { color: "rgba(255,255,255,0.5)", fontSize: 14, margin: "0 0 24px" },
  modalBtns: { display: "flex", gap: 12, marginTop: 24 },
  modalCancelBtn: { flex: 1, padding: "12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "rgba(255,255,255,0.6)", fontSize: 14, fontWeight: 600, cursor: "pointer" },
  modalConfirmBtn: { flex: 2, padding: "12px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #00b4d8, #0077b6)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", transition: "opacity 0.2s" },
};