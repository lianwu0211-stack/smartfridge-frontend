import { useState, useRef, useEffect } from "react";
import axios from "axios";

const API = "https://localhost:8000";

export default function AIChat() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "你好！我是 SmartFridge AI 厨师助手 🍳\n\n请告诉我你冰箱里有什么食材，以及你的饮食目标，我来为你推荐合适的菜谱！\n\n例如：「我有西红柿2个、鸡蛋3个，目标是减脂，喜欢粤菜」",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [conversationId, setConversationId] = useState("");

  // ✅ 新增：购物清单相关状态
  const [addingToShopping, setAddingToShopping] = useState(false);
  const [shoppingAdded, setShoppingAdded] = useState([]);  // 最近一次添加的食材
  const [lastUserMessage, setLastUserMessage] = useState(""); // 最后一条用户消息

  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const userId = localStorage.getItem("user_id") || "1";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setError("");
    setShoppingAdded([]); // 清空上次购物添加结果
    setLastUserMessage(text);
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);

    try {
      const res = await axios.post(`${API}/ai/chat`, {
        message: text,
        user_id: userId,
        conversation_id: conversationId || "",
      });
      const reply = res.data.answer || "收到！";
      if (res.data.conversation_id) setConversationId(res.data.conversation_id);
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setError("AI 服务暂时不可用，请稍后再试");
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "⚠️ 抱歉，我暂时无法回答，请稍后再试。" },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  // ✅ 新增：点击按钮后调用 /ai/chat-with-shopping，把缺少的食材加入购物清单
  const handleAddToShopping = async () => {
    if (!lastUserMessage) return;
    setAddingToShopping(true);
    setError("");
    setShoppingAdded([]);
    try {
      const res = await axios.post(`${API}/ai/chat-with-shopping`, {
        message: lastUserMessage,
        user_id: userId,
        conversation_id: conversationId || "",
      });
      const added = res.data.added_to_shopping || [];
      if (added.length > 0) {
        setShoppingAdded(added);
      } else {
        setShoppingAdded(["冰箱已有所有食材，无需补货 ✅"]);
      }
    } catch {
      setError("添加购物清单失败，请重试");
    } finally {
      setAddingToShopping(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const quickPrompts = [
    "我有西红柿、鸡蛋，目标减脂，喜欢粤菜",
    "我有牛肉200g、西兰花，要增肌，喜欢川菜",
    "冰箱里有牛奶和鸡蛋，推荐健康早餐",
  ];

  // 是否显示"加入购物清单"按钮（有 AI 回复且不在加载中）
  const showShoppingBtn = messages.length > 1 && !loading && lastUserMessage;

  return (
    <div style={styles.bg}>
      <div style={styles.blob1} />
      <div style={styles.blob2} />

      {/* Nav */}
      <div style={styles.nav}>
        <div style={styles.navLogo}>❄️ SmartFridge</div>
        <div style={styles.navLinks}>
          <a href="/fridge" style={styles.navLink}>冰箱</a>
          <a href="/shopping" style={styles.navLink}>购物清单</a>
          <a href="/ai" style={{ ...styles.navLink, color: "#a78bfa" }}>AI推荐</a>
        </div>
      </div>

      <div style={styles.layout}>
        {/* Sidebar */}
        <div style={styles.sidebar}>
          <h3 style={styles.sidebarTitle}>💡 快速提问</h3>
          {quickPrompts.map((p, i) => (
            <button key={i} style={styles.quickBtn} onClick={() => setInput(p)}>
              {p}
            </button>
          ))}

          <div style={styles.sidebarDivider} />

          <h3 style={styles.sidebarTitle}>🧠 AI 能力</h3>
          {[
            ["🥬", "优先推荐快过期食材"],
            ["🏷️", "按你的 Tag 筛选"],
            ["📊", "提供卡路里参考"],
            ["🛒", "自动补全购物清单"],
          ].map(([icon, text]) => (
            <div key={text} style={styles.featureItem}>
              <span>{icon}</span>
              <span style={styles.featureText}>{text}</span>
            </div>
          ))}
        </div>

        {/* Chat area */}
        <div style={styles.chatWrapper}>
          <div style={styles.chatHeader}>
            <div style={styles.aiAvatar}>🤖</div>
            <div>
              <div style={styles.aiName}>SmartFridge AI</div>
              <div style={styles.aiStatus}>
                <span style={styles.statusDot} />
                在线 · RAG 个性化推荐
              </div>
            </div>
          </div>

          {/* Messages */}
          <div style={styles.messages}>
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  ...styles.msgRow,
                  justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                }}
              >
                {msg.role === "assistant" && <div style={styles.msgAvatar}>🤖</div>}
                <div style={{
                  ...styles.bubble,
                  ...(msg.role === "user" ? styles.bubbleUser : styles.bubbleAI),
                }}>
                  {msg.content.split("\n").map((line, j) => (
                    <span key={j}>{line}{j < msg.content.split("\n").length - 1 && <br />}</span>
                  ))}
                </div>
                {msg.role === "user" && <div style={styles.msgAvatar}>👤</div>}
              </div>
            ))}

            {loading && (
              <div style={styles.msgRow}>
                <div style={styles.msgAvatar}>🤖</div>
                <div style={{ ...styles.bubble, ...styles.bubbleAI, ...styles.typingBubble }}>
                  <span style={styles.dot} />
                  <span style={{ ...styles.dot, animationDelay: "0.2s" }} />
                  <span style={{ ...styles.dot, animationDelay: "0.4s" }} />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* ✅ 新增：购物清单按钮区域 */}
          {showShoppingBtn && (
            <div style={styles.shoppingBtnArea}>
              <button
                style={{
                  ...styles.shoppingBtn,
                  opacity: addingToShopping ? 0.7 : 1,
                }}
                onClick={handleAddToShopping}
                disabled={addingToShopping}
              >
                {addingToShopping ? "⏳ 分析中..." : "🛒 缺少的食材加入购物清单"}
              </button>

              {/* 显示添加结果 */}
              {shoppingAdded.length > 0 && (
                <div style={styles.shoppingResult}>
                  {shoppingAdded[0].includes("无需") ? (
                    <span>{shoppingAdded[0]}</span>
                  ) : (
                    <>
                      <span style={{ marginRight: 6 }}>✅ 已加入购物清单：</span>
                      <span style={{ color: "#34d399", fontWeight: 600 }}>
                        {shoppingAdded.join("、")}
                      </span>
                      <a href="/shopping" style={styles.goShoppingLink}>→ 查看清单</a>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {error && <div style={styles.error}>⚠️ {error}</div>}

          {/* Input */}
          <div style={styles.inputArea}>
            <textarea
              ref={inputRef}
              style={styles.textarea}
              rows={2}
              placeholder="输入你的食材和饮食偏好... （Enter 发送，Shift+Enter 换行）"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button
              style={{ ...styles.sendBtn, opacity: loading || !input.trim() ? 0.5 : 1 }}
              onClick={handleSend}
              disabled={loading || !input.trim()}
            >
              {loading ? "..." : "发送"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  bg: {
    minHeight: "100vh",
    background: "linear-gradient(160deg, #0f2027, #1a1a2e, #16213e)",
    fontFamily: "'Segoe UI', sans-serif",
    position: "relative",
    display: "flex",
    flexDirection: "column",
  },
  blob1: {
    position: "fixed", width: 500, height: 500, borderRadius: "50%",
    background: "rgba(167,139,250,0.06)", top: -150, right: -100, filter: "blur(100px)", zIndex: 0,
  },
  blob2: {
    position: "fixed", width: 400, height: 400, borderRadius: "50%",
    background: "rgba(0,180,216,0.05)", bottom: -80, left: -80, filter: "blur(80px)", zIndex: 0,
  },
  nav: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "18px 32px", borderBottom: "1px solid rgba(255,255,255,0.07)",
    position: "relative", zIndex: 2,
  },
  navLogo: { color: "#fff", fontWeight: 700, fontSize: 18 },
  navLinks: { display: "flex", gap: 24 },
  navLink: { color: "rgba(255,255,255,0.5)", textDecoration: "none", fontSize: 14, fontWeight: 500 },
  layout: {
    display: "flex", flex: 1, maxWidth: 1100, margin: "0 auto", width: "100%",
    padding: "28px 24px", gap: 24, position: "relative", zIndex: 1,
  },
  sidebar: {
    width: 240, flexShrink: 0, display: "flex", flexDirection: "column", gap: 8,
  },
  sidebarTitle: {
    fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.4)",
    textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 6px",
  },
  quickBtn: {
    padding: "10px 14px", borderRadius: 10,
    border: "1px solid rgba(167,139,250,0.2)", background: "rgba(167,139,250,0.07)",
    color: "rgba(255,255,255,0.65)", fontSize: 12, cursor: "pointer",
    textAlign: "left", lineHeight: 1.4, marginBottom: 4,
  },
  sidebarDivider: { borderTop: "1px solid rgba(255,255,255,0.07)", margin: "12px 0" },
  featureItem: { display: "flex", alignItems: "center", gap: 8, padding: "6px 0" },
  featureText: { fontSize: 12, color: "rgba(255,255,255,0.45)" },
  chatWrapper: {
    flex: 1, display: "flex", flexDirection: "column",
    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 20, overflow: "hidden", minHeight: 0,
  },
  chatHeader: {
    display: "flex", alignItems: "center", gap: 12, padding: "16px 20px",
    borderBottom: "1px solid rgba(255,255,255,0.07)",
    background: "rgba(255,255,255,0.02)",
  },
  aiAvatar: { fontSize: 28 },
  aiName: { color: "#fff", fontWeight: 700, fontSize: 15 },
  aiStatus: {
    display: "flex", alignItems: "center", gap: 6,
    color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 2,
  },
  statusDot: {
    width: 7, height: 7, borderRadius: "50%", background: "#22c55e",
    boxShadow: "0 0 6px #22c55e",
  },
  messages: {
    flex: 1, overflowY: "auto", padding: "20px",
    display: "flex", flexDirection: "column", gap: 14, minHeight: 300, maxHeight: 460,
  },
  msgRow: { display: "flex", gap: 10, alignItems: "flex-end" },
  msgAvatar: { fontSize: 22, flexShrink: 0 },
  bubble: { maxWidth: "72%", padding: "12px 16px", borderRadius: 16, fontSize: 14, lineHeight: 1.65 },
  bubbleUser: {
    background: "linear-gradient(135deg, #6d28d9, #4c1d95)",
    color: "#fff", borderBottomRightRadius: 4,
  },
  bubbleAI: {
    background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)",
    color: "rgba(255,255,255,0.85)", borderBottomLeftRadius: 4,
  },
  typingBubble: { display: "flex", alignItems: "center", gap: 5, padding: "14px 18px" },
  dot: {
    display: "inline-block", width: 7, height: 7, borderRadius: "50%",
    background: "rgba(255,255,255,0.4)",
    animation: "bounce 0.9s ease-in-out infinite",
  },

  // ✅ 新增样式：购物清单按钮区
  shoppingBtnArea: {
    padding: "10px 20px 4px",
    borderTop: "1px solid rgba(255,255,255,0.06)",
    display: "flex", flexDirection: "column", gap: 8,
  },
  shoppingBtn: {
    padding: "10px 20px", borderRadius: 10, border: "none", cursor: "pointer",
    background: "linear-gradient(135deg, #059669, #047857)",
    color: "#fff", fontSize: 13, fontWeight: 700,
    boxShadow: "0 3px 12px rgba(5,150,105,0.3)", transition: "opacity 0.2s",
    alignSelf: "flex-start",
  },
  shoppingResult: {
    fontSize: 13, color: "rgba(255,255,255,0.7)",
    background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)",
    borderRadius: 8, padding: "8px 14px", display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap",
  },
  goShoppingLink: {
    marginLeft: 8, color: "#34d399", fontWeight: 700,
    textDecoration: "none", fontSize: 13,
  },

  error: {
    margin: "0 20px 12px", padding: "10px 14px", borderRadius: 10,
    background: "rgba(255,80,80,0.12)", border: "1px solid rgba(255,80,80,0.25)",
    color: "#ff8080", fontSize: 13,
  },
  inputArea: {
    display: "flex", gap: 12, padding: "14px 16px",
    borderTop: "1px solid rgba(255,255,255,0.07)",
    background: "rgba(255,255,255,0.02)",
  },
  textarea: {
    flex: 1, borderRadius: 12, padding: "12px 16px",
    border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.07)",
    color: "#fff", fontSize: 14, resize: "none", outline: "none", lineHeight: 1.5,
    fontFamily: "'Segoe UI', sans-serif",
  },
  sendBtn: {
    padding: "0 24px", borderRadius: 12, border: "none",
    background: "linear-gradient(135deg, #7c3aed, #4c1d95)",
    color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer",
    boxShadow: "0 4px 16px rgba(124,58,237,0.3)", transition: "opacity 0.2s",
    flexShrink: 0,
  },
};