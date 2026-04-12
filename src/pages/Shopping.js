import { useState, useEffect } from "react";
import axios from "axios";

const API = "http://localhost:8000";

const getDefaultDays = (name) => {
  if (/牛|猪|羊|鸡|鸭|肉|排|腿|翅|肝|海鲜|虾|鱼|蟹|贝/.test(name)) return 4;
  if (/菠菜|生菜|白菜|油菜|空心菜|韭菜|香菜|芹菜/.test(name)) return 4;
  if (/豆腐|豆浆|豆皮|腐竹|豆芽/.test(name)) return 3;
  if (/面条|馒头|包子|饺子|面包/.test(name)) return 3;
  if (/蛋/.test(name)) return 30;
  if (/牛奶|奶|酸奶|奶酪|黄油|芝士/.test(name)) return 7;
  if (/苹果|香蕉|橙|橘|葡萄|草莓|西瓜|芒果|桃|梨|樱桃|蓝莓|猕猴桃/.test(name)) return 6;
  if (/土豆|红薯|萝卜|南瓜|冬瓜|莲藕|芋头|姜|蒜|洋葱|玉米/.test(name)) return 14;
  if (/盐|糖|酱|醋|油|料酒|淀粉|面粉|大米/.test(name)) return 180;
  if (/菜|瓜|茄|椒|菇|西红柿|番茄|黄瓜|西兰花/.test(name)) return 7;
  return 7;
};

export default function Shopping() {
  const [items, setItems]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [showAdd, setShowAdd]     = useState(false);
  const [form, setForm]           = useState({ ingredient: "", quantity: "" });
  const [adding, setAdding]       = useState(false);
  const [toggling, setToggling]   = useState(null);

  // 保质期弹窗
  const [expiryModal, setExpiryModal]     = useState(null);
  const [expiryDate, setExpiryDate]       = useState("");
  const [addingToFridge, setAddingToFridge] = useState(false);

  // ✅ 一键全选弹窗（批量购买）
  const [showBatchModal, setShowBatchModal]   = useState(false);
  const [batchExpiries, setBatchExpiries]     = useState({});  // { item_id: "2026-xx-xx" }
  const [batchPurchasing, setBatchPurchasing] = useState(false);

  const userId  = localStorage.getItem("user_id") || "1";
  const token   = localStorage.getItem("token");
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const fetchItems = async () => {
    try {
      const res = await axios.get(`${API}/shopping/${userId}`, { headers });
      setItems(res.data);
    } catch { setError("加载失败，请检查后端服务"); }
    finally  { setLoading(false); }
  };

  useEffect(() => { fetchItems(); }, []); // eslint-disable-line

  const handleAdd = async () => {
    if (!form.ingredient || !form.quantity) { setError("请填写所有字段"); return; }
    setAdding(true); setError("");
    try {
      await axios.post(`${API}/shopping`, {
        user_id: parseInt(userId), ingredient: form.ingredient,
        quantity: parseFloat(form.quantity), unit: "pcs",
      }, { headers });
      setForm({ ingredient: "", quantity: "" }); setShowAdd(false); fetchItems();
    } catch { setError("添加失败，请重试"); }
    finally { setAdding(false); }
  };

  // 单个勾选
  const handleToggle = async (item) => {
    if (item.is_purchased) {
      setToggling(item.item_id);
      try {
        await axios.put(`${API}/shopping/${item.item_id}`, { is_purchased: false }, { headers });
        setItems(prev => prev.map(i => i.item_id === item.item_id ? { ...i, is_purchased: false } : i));
      } catch { setError("更新失败"); }
      finally { setToggling(null); }
      return;
    }
    const days = getDefaultDays(item.ingredient);
    const d = new Date(); d.setDate(d.getDate() + days);
    setExpiryDate(d.toISOString().split("T")[0]);
    setExpiryModal(item);
  };

  // 单个确认购买
  const handleConfirmPurchase = async () => {
    if (!expiryDate) { setError("请填写保质期"); return; }
    setAddingToFridge(true); setError("");
    try {
      await axios.put(`${API}/shopping/${expiryModal.item_id}`, { is_purchased: true }, { headers });
      await axios.post(`${API}/fridge`, {
        user_id: parseInt(userId), ingredient: expiryModal.ingredient,
        quantity: expiryModal.quantity, unit: expiryModal.unit || "pcs", expiry_date: expiryDate,
      }, { headers });
      setItems(prev => prev.map(i => i.item_id === expiryModal.item_id ? { ...i, is_purchased: true } : i));
      setExpiryModal(null); setExpiryDate("");
    } catch { setError("操作失败，请重试"); }
    finally { setAddingToFridge(false); }
  };

  // ✅ 打开一键全选弹窗，为每个待购买食材预设默认保质期
  const openBatchModal = () => {
    const pending = items.filter(i => !i.is_purchased);
    const defaults = {};
    pending.forEach(item => {
      const days = getDefaultDays(item.ingredient);
      const d = new Date(); d.setDate(d.getDate() + days);
      defaults[item.item_id] = d.toISOString().split("T")[0];
    });
    setBatchExpiries(defaults);
    setShowBatchModal(true);
  };

  // ✅ 确认一键全购并写入冰箱
  const handleBatchPurchase = async () => {
    const pending = items.filter(i => !i.is_purchased);
    setBatchPurchasing(true); setError("");
    try {
      await Promise.all(pending.map(async (item) => {
        await axios.put(`${API}/shopping/${item.item_id}`, { is_purchased: true }, { headers });
        const expiry = batchExpiries[item.item_id];
        if (expiry) {
          await axios.post(`${API}/fridge`, {
            user_id: parseInt(userId), ingredient: item.ingredient,
            quantity: item.quantity, unit: item.unit || "pcs", expiry_date: expiry,
          }, { headers });
        }
      }));
      setItems(prev => prev.map(i => i.is_purchased ? i : { ...i, is_purchased: true }));
      setShowBatchModal(false);
    } catch { setError("批量操作失败，请重试"); }
    finally { setBatchPurchasing(false); }
  };

  const pending   = items.filter(i => !i.is_purchased);
  const purchased = items.filter(i =>  i.is_purchased);

  return (
    <div style={styles.bg}>
      <div style={styles.blob1} /><div style={styles.blob2} />

      {/* 单个购买弹窗 */}
      {expiryModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <h3 style={styles.modalTitle}>🛒 已购买「{expiryModal.ingredient}」</h3>
            <p style={styles.modalSubtitle}>请填写保质期，食材将自动加入冰箱</p>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>过期日期</label>
              <input style={styles.input} type="date" value={expiryDate}
                onChange={e => setExpiryDate(e.target.value)} />
            </div>
            {error && <div style={styles.error}>⚠️ {error}</div>}
            <div style={styles.modalBtns}>
              <button style={styles.modalCancelBtn}
                onClick={() => { setExpiryModal(null); setError(""); }}>取消</button>
              <button style={{ ...styles.modalConfirmBtn, opacity: addingToFridge ? 0.7 : 1 }}
                onClick={handleConfirmPurchase} disabled={addingToFridge}>
                {addingToFridge ? "添加中..." : "✅ 确认并加入冰箱"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ 一键全选弹窗 */}
      {showBatchModal && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modalCard, maxWidth: 520 }}>
            <h3 style={styles.modalTitle}>🛒 一键全部购买</h3>
            <p style={styles.modalSubtitle}>确认各食材保质期后，将全部加入冰箱</p>
            <div style={{ maxHeight: 320, overflowY: "auto", marginBottom: 16 }}>
              {pending.map(item => (
                <div key={item.item_id} style={styles.batchRow}>
                  <span style={styles.batchName}>{item.ingredient}</span>
                  <input style={{ ...styles.input, width: 140, flex: "none" }} type="date"
                    value={batchExpiries[item.item_id] || ""}
                    onChange={e => setBatchExpiries(prev => ({ ...prev, [item.item_id]: e.target.value }))} />
                </div>
              ))}
            </div>
            {error && <div style={styles.error}>⚠️ {error}</div>}
            <div style={styles.modalBtns}>
              <button style={styles.modalCancelBtn}
                onClick={() => { setShowBatchModal(false); setError(""); }}>取消</button>
              <button style={{ ...styles.modalConfirmBtn, opacity: batchPurchasing ? 0.7 : 1 }}
                onClick={handleBatchPurchase} disabled={batchPurchasing}>
                {batchPurchasing ? "处理中..." : `✅ 全部确认购买 (${pending.length}件)`}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={styles.container}>
        <div style={styles.nav}>
          <div style={styles.navLogo}>❄️ SmartFridge</div>
          <div style={styles.navLinks}>
            <a href="/fridge"   style={styles.navLink}>冰箱</a>
            <a href="/shopping" style={{ ...styles.navLink, color: "#00b4d8", fontWeight: "bold" }}>购物清单</a>
            <a href="/ai"       style={styles.navLink}>AI推荐</a>
          </div>
        </div>

        <div style={styles.statsRow}>
          <div style={styles.statCard}><div style={styles.statNum}>{items.length}</div><div style={styles.statLabel}>总计</div></div>
          <div style={{ ...styles.statCard, ...styles.statCardOrange }}><div style={styles.statNum}>{pending.length}</div><div style={styles.statLabel}>待购买</div></div>
          <div style={{ ...styles.statCard, ...styles.statCardGreen }}><div style={styles.statNum}>{purchased.length}</div><div style={styles.statLabel}>已购买</div></div>
        </div>

        <div style={styles.pageHeader}>
          <h1 style={styles.title}>购物清单</h1>
          <div style={{ display: "flex", gap: 10 }}>
            {/* ✅ 一键全选按钮，只在有待购买商品时显示 */}
            {pending.length > 0 && (
              <button style={styles.batchBtn} onClick={openBatchModal}>
                ✅ 一键全部购买 ({pending.length})
              </button>
            )}
            <button style={styles.addBtn} onClick={() => setShowAdd(s => !s)}>
              {showAdd ? "× 取消" : "+ 添加商品"}
            </button>
          </div>
        </div>

        {showAdd && (
          <div style={styles.addCard}>
            <div style={styles.addRow}>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>商品名称</label>
                <input style={styles.input} placeholder="如：西红柿" value={form.ingredient}
                  onChange={e => setForm({ ...form, ingredient: e.target.value })} />
              </div>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>数量</label>
                <input style={styles.input} placeholder="如：2" type="number" value={form.quantity}
                  onChange={e => setForm({ ...form, quantity: e.target.value })} />
              </div>
              <button style={{ ...styles.confirmBtn, opacity: adding ? 0.7 : 1 }}
                onClick={handleAdd} disabled={adding}>
                {adding ? "添加中..." : "确认"}
              </button>
            </div>
          </div>
        )}

        {error && !expiryModal && !showBatchModal && <div style={styles.error}>⚠️ {error}</div>}

        {loading ? (
          <div style={styles.loadingBox}><div style={styles.spinner} /></div>
        ) : (
          <div>
            {pending.length > 0 && (
              <div style={styles.section}>
                <h2 style={styles.sectionTitle}>🛒 待购买</h2>
                {pending.map(item => (
                  <ShoppingItem key={item.item_id} item={item} onToggle={handleToggle} toggling={toggling} />
                ))}
              </div>
            )}
            {purchased.length > 0 && (
              <div style={styles.section}>
                <h2 style={{ ...styles.sectionTitle, color: "rgba(255,255,255,0.3)" }}>✅ 已购买（已加入冰箱）</h2>
                {purchased.map(item => (
                  <ShoppingItem key={item.item_id} item={item} onToggle={handleToggle} toggling={toggling} done />
                ))}
              </div>
            )}
            {items.length === 0 && (
              <div style={styles.emptyBox}>
                <div style={{ fontSize: 48 }}>🛍️</div>
                <p style={{ color: "rgba(255,255,255,0.4)", marginTop: 12 }}>购物清单是空的</p>
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
      <button style={{
        ...styles.checkbox,
        background: done ? "#22c55e" : "transparent",
        border: `2px solid ${done ? "#22c55e" : "rgba(255,255,255,0.2)"}`,
        opacity: isLoading ? 0.5 : 1,
      }} onClick={() => onToggle(item)} disabled={isLoading}>
        {done && <span style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>✓</span>}
      </button>
      <div style={styles.itemInfo}>
        <span style={{ ...styles.itemName, textDecoration: done ? "line-through" : "none", color: done ? "rgba(255,255,255,0.35)" : "#fff" }}>
          {item.ingredient}
        </span>
        <span style={styles.itemQty}>{item.quantity} {item.unit || "pcs"}</span>
      </div>
      {done
        ? <span style={styles.fridgeTag}>❄️ 已入冰箱</span>
        : <span style={styles.pendingTag}>待购买</span>
      }
    </div>
  );
}

const styles = {
  bg: { minHeight: "100vh", background: "linear-gradient(160deg, #0f2027, #203a43, #2c5364)", fontFamily: "'Segoe UI', sans-serif", position: "relative", paddingBottom: 60 },
  blob1: { position: "fixed", width: 500, height: 500, borderRadius: "50%", background: "rgba(34,197,94,0.05)", bottom: -100, left: -100, filter: "blur(100px)", zIndex: 0 },
  blob2: { position: "fixed", width: 400, height: 400, borderRadius: "50%", background: "rgba(249,115,22,0.05)", top: -80, right: -80, filter: "blur(100px)", zIndex: 0 },
  container: { maxWidth: 680, margin: "0 auto", padding: "0 24px", position: "relative", zIndex: 1 },
  nav: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 0", borderBottom: "1px solid rgba(255,255,255,0.07)", marginBottom: 28 },
  navLogo: { color: "#fff", fontWeight: 700, fontSize: 18 },
  navLinks: { display: "flex", gap: 24 },
  navLink: { color: "rgba(255,255,255,0.5)", textDecoration: "none", fontSize: 14, fontWeight: 500 },
  statsRow: { display: "flex", gap: 14, marginBottom: 28 },
  statCard: { flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 16, textAlign: "center" },
  statCardOrange: { borderColor: "rgba(249,115,22,0.3)", background: "rgba(249,115,22,0.08)" },
  statCardGreen:  { borderColor: "rgba(34,197,94,0.3)",  background: "rgba(34,197,94,0.08)" },
  statNum: { fontSize: 28, fontWeight: 800, color: "#fff", lineHeight: 1 },
  statLabel: { fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 6 },
  pageHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  title: { fontSize: 26, fontWeight: 800, color: "#fff", margin: 0 },
  batchBtn: { padding: "10px 18px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #059669, #047857)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" },
  addBtn:   { padding: "10px 18px", borderRadius: 10, border: "1px solid rgba(0,180,216,0.4)", background: "rgba(0,180,216,0.1)", color: "#00b4d8", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  addCard: { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "18px 20px", marginBottom: 18 },
  addRow: { display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" },
  fieldGroup: { display: "flex", flexDirection: "column", gap: 6, flex: 1, minWidth: 130 },
  label: { color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 500 },
  input: { padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.07)", color: "#fff", fontSize: 14, outline: "none" },
  confirmBtn: { padding: "10px 20px", borderRadius: 8, border: "none", background: "linear-gradient(135deg, #00b4d8, #0077b6)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", alignSelf: "flex-end" },
  error: { padding: "12px 16px", borderRadius: 10, marginBottom: 16, background: "rgba(255,80,80,0.12)", border: "1px solid rgba(255,80,80,0.25)", color: "#ff8080", fontSize: 13 },
  loadingBox: { textAlign: "center", padding: 80 },
  spinner: { width: 36, height: 36, border: "3px solid rgba(255,255,255,0.08)", borderTop: "3px solid #00b4d8", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto" },
  emptyBox: { textAlign: "center", padding: 80 },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 12px" },
  itemCard: { display: "flex", alignItems: "center", gap: 14, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "14px 18px", marginBottom: 8 },
  checkbox: { width: 24, height: 24, borderRadius: 7, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s" },
  itemInfo: { flex: 1, display: "flex", flexDirection: "column", gap: 2 },
  itemName: { fontSize: 15, fontWeight: 600 },
  itemQty:  { fontSize: 12, color: "rgba(255,255,255,0.35)" },
  pendingTag: { fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20, background: "rgba(249,115,22,0.15)", color: "#fb923c" },
  fridgeTag:  { fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20, background: "rgba(0,180,216,0.15)", color: "#00b4d8" },
  modalOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
  modalCard: { background: "#1a2a3a", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 20, padding: "32px 36px", width: "100%", maxWidth: 400 },
  modalTitle:    { color: "#fff", fontSize: 18, fontWeight: 700, margin: "0 0 8px" },
  modalSubtitle: { color: "rgba(255,255,255,0.5)", fontSize: 14, margin: "0 0 24px" },
  modalBtns: { display: "flex", gap: 12, marginTop: 20 },
  modalCancelBtn:  { flex: 1, padding: 12, borderRadius: 10, border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "rgba(255,255,255,0.6)", fontSize: 14, fontWeight: 600, cursor: "pointer" },
  modalConfirmBtn: { flex: 2, padding: 12, borderRadius: 10, border: "none", background: "linear-gradient(135deg, #00b4d8, #0077b6)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" },
  batchRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" },
  batchName: { color: "#fff", fontSize: 14, fontWeight: 600 },
};