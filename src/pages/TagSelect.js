import { useState, useEffect } from "react";
import axios from "axios";

const API = "https://localhost:8000";

const TAG_ICONS = {
  goal: "🎯",
  diet: "🥗",
  region: "🍜",
};

const TAG_LABELS = {
  goal: "目标",
  diet: "饮食方式",
  region: "菜系偏好",
};

const TAG_COLORS = {
  goal: { active: "#f97316", bg: "rgba(249,115,22,0.15)", border: "rgba(249,115,22,0.5)" },
  diet: { active: "#22c55e", bg: "rgba(34,197,94,0.15)", border: "rgba(34,197,94,0.5)" },
  region: { active: "#a78bfa", bg: "rgba(167,139,250,0.15)", border: "rgba(167,139,250,0.5)" },
};

export default function TagSelect() {
  // ✅ 修改1：初始化为 object，不是 []
  const [tags, setTags] = useState({ goal: [], diet: [], region: [] });
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const userId = localStorage.getItem("user_id");

  useEffect(() => {
    axios
      .get(`${API}/tags`)
      // ✅ 修改2：res.data 本身就是 { goal:[...], diet:[...], region:[...] }，直接 setTags
      .then((res) => setTags(res.data))
      .catch(() => setError("无法加载标签，请检查后端服务"))
      .finally(() => setLoading(false));
  }, []);

  const toggleTag = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    if (selected.length === 0) { setError("请至少选择一个标签"); return; }
    setError("");
    setSaving(true);
    try {
      await axios.post(
        // ✅ 修改3：接口路径改为 /user/tags，user_id 放进 body
        `${API}/user/tags`,
        { user_id: Number(userId), tag_ids: selected },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      setSuccess("偏好已保存！正在跳转...");
      setTimeout(() => (window.location.href = "/fridge"), 1000);
    } catch {
      setError("保存失败，请重试");
    } finally {
      setSaving(false);
    }
  };

  // ✅ 修改4：删掉原来的 tags.reduce(...)，直接用 tags（已经是分好组的 object）

  return (
    <div style={styles.bg}>
      <div style={styles.blob1} />
      <div style={styles.blob2} />

      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.logoRow}>
            <span style={styles.logoIcon}>❄️</span>
            <span style={styles.logoText}>SmartFridge</span>
          </div>
          <h1 style={styles.title}>告诉我你的偏好</h1>
          <p style={styles.subtitle}>
            选择你的饮食目标和菜系喜好，AI 将为你量身推荐菜谱
          </p>
        </div>

        {loading ? (
          <div style={styles.loadingBox}>
            <div style={styles.spinner} />
            <p style={styles.loadingText}>加载中...</p>
          </div>
        ) : (
          <div style={styles.groups}>
            {/* ✅ 修改5：直接用 tags，不用 grouped */}
            {Object.entries(tags).map(([type, tagList]) => {
              const color = TAG_COLORS[type] || TAG_COLORS.goal;
              return (
                <div key={type} style={styles.group}>
                  <div style={styles.groupHeader}>
                    <span style={styles.groupIcon}>{TAG_ICONS[type] || "🏷️"}</span>
                    <span style={{ ...styles.groupLabel, color: color.active }}>
                      {TAG_LABELS[type] || type}
                    </span>
                  </div>
                  <div style={styles.tagRow}>
                    {tagList.map((tag) => {
                      // ✅ 修改6：字段名用 tag.tag_id 和 tag.tag_name
                      const isSelected = selected.includes(tag.tag_id);
                      return (
                        <button
                          key={tag.tag_id}
                          onClick={() => toggleTag(tag.tag_id)}
                          style={{
                            ...styles.tag,
                            background: isSelected ? color.bg : "rgba(255,255,255,0.04)",
                            border: `1.5px solid ${isSelected ? color.border : "rgba(255,255,255,0.1)"}`,
                            color: isSelected ? color.active : "rgba(255,255,255,0.6)",
                            transform: isSelected ? "scale(1.05)" : "scale(1)",
                          }}
                        >
                          {isSelected && <span style={{ marginRight: 5 }}>✓</span>}
                          {tag.tag_name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {error && <div style={styles.error}>⚠️ {error}</div>}
        {success && <div style={styles.successMsg}>✅ {success}</div>}

        <div style={styles.footer}>
          <span style={styles.countBadge}>已选 {selected.length} 个</span>
          <button
            style={{ ...styles.saveBtn, opacity: saving ? 0.7 : 1 }}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "保存中..." : "保存并继续 →"}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  bg: {
    minHeight: "100vh",
    background: "linear-gradient(160deg, #0f2027, #203a43, #2c5364)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 20px",
    fontFamily: "'Segoe UI', sans-serif",
    position: "relative",
    overflow: "hidden",
  },
  blob1: {
    position: "fixed", width: 500, height: 500, borderRadius: "50%",
    background: "rgba(249,115,22,0.06)", top: -150, right: -100, filter: "blur(80px)",
  },
  blob2: {
    position: "fixed", width: 400, height: 400, borderRadius: "50%",
    background: "rgba(167,139,250,0.07)", bottom: -100, left: -80, filter: "blur(80px)",
  },
  container: {
    width: "100%", maxWidth: 680, zIndex: 1,
  },
  header: { textAlign: "center", marginBottom: 40 },
  logoRow: { display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 20 },
  logoIcon: { fontSize: 28 },
  logoText: { fontSize: 22, fontWeight: 700, color: "#fff" },
  title: { fontSize: 32, fontWeight: 800, color: "#fff", margin: "0 0 10px", letterSpacing: "-0.5px" },
  subtitle: { fontSize: 15, color: "rgba(255,255,255,0.5)", margin: 0 },
  loadingBox: { textAlign: "center", padding: 60 },
  spinner: {
    width: 40, height: 40, border: "3px solid rgba(255,255,255,0.1)",
    borderTop: "3px solid #00b4d8", borderRadius: "50%",
    animation: "spin 0.8s linear infinite", margin: "0 auto 16px",
  },
  loadingText: { color: "rgba(255,255,255,0.5)", fontSize: 15 },
  groups: { display: "flex", flexDirection: "column", gap: 24 },
  group: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 18, padding: "24px 28px",
  },
  groupHeader: { display: "flex", alignItems: "center", gap: 8, marginBottom: 16 },
  groupIcon: { fontSize: 20 },
  groupLabel: { fontSize: 15, fontWeight: 700, letterSpacing: "0.3px" },
  tagRow: { display: "flex", flexWrap: "wrap", gap: 10 },
  tag: {
    padding: "9px 18px", borderRadius: 50, fontSize: 14, fontWeight: 600,
    cursor: "pointer", transition: "all 0.2s", letterSpacing: "0.2px",
  },
  error: {
    margin: "20px 0 0", padding: "12px 16px", borderRadius: 10,
    background: "rgba(255,80,80,0.12)", border: "1px solid rgba(255,80,80,0.25)",
    color: "#ff8080", fontSize: 13,
  },
  successMsg: {
    margin: "20px 0 0", padding: "12px 16px", borderRadius: 10,
    background: "rgba(0,220,130,0.12)", border: "1px solid rgba(0,220,130,0.25)",
    color: "#00dc82", fontSize: 13,
  },
  footer: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    marginTop: 32, padding: "20px 0 0",
    borderTop: "1px solid rgba(255,255,255,0.08)",
  },
  countBadge: {
    background: "rgba(255,255,255,0.08)", borderRadius: 20,
    padding: "8px 16px", color: "rgba(255,255,255,0.6)", fontSize: 14,
  },
  saveBtn: {
    padding: "13px 30px", borderRadius: 12, border: "none",
    background: "linear-gradient(135deg, #00b4d8, #0077b6)",
    color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer",
    boxShadow: "0 4px 20px rgba(0,180,216,0.3)", transition: "opacity 0.2s",
  },
};