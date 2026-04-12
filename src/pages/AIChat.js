import { useState, useRef, useEffect } from "react";
import axios from "axios";

const API = "http://localhost:8000";

export default function AIChat() {
  const [messages, setMessages]         = useState([
    { role: "assistant", content: "你好！我是 SmartFridge AI 厨师助手 🍳\n\n点击「📦 读取冰箱推荐」，我会根据你冰箱里的食材和饮食偏好，为你推荐合适的菜谱！\n\n也可以直接告诉我你的需求。" },
  ]);
  const [input, setInput]               = useState("");
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState("");
  const [conversationId, setConversationId] = useState("");

  // ✅ 菜谱选择相关（AI读取冰箱返回的结构化菜谱）
  const [recipes, setRecipes]           = useState([]);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [addingToShopping, setAddingToShopping] = useState(false);
  const [shoppingAdded, setShoppingAdded]       = useState([]);

  const [lastUserMessage, setLastUserMessage] = useState("");

  const bottomRef = useRef(null);
  const inputRef  = useRef(null);
  const userId    = localStorage.getItem("user_id") || "1";

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput(""); setError(""); setShoppingAdded([]); setRecipes([]);
    setLastUserMessage(text);
    setMessages(prev => [...prev, { role: "user", content: text }]);
    setLoading(true);
    try {
      // ✅ 传入 conversation_id 实现多轮记忆
      const res = await axios.post(`${API}/ai/chat`, {
        message: text, user_id: userId, conversation_id: conversationId,
      });
      if (res.data.conversation_id) setConversationId(res.data.conversation_id);
      setMessages(prev => [...prev, { role: "assistant", content: res.data.answer || "收到！" }]);
    } catch {
      setError("AI 服务暂时不可用");
      setMessages(prev => [...prev, { role: "assistant", content: "⚠️ 抱歉，我暂时无法回答，请稍后再试。" }]);
    } finally { setLoading(false); inputRef.current?.focus(); }
  };

  // ✅ 读取冰箱 + 关联 Tag 推荐菜谱
  const handleFridgeRecommend = async () => {
    setLoading(true); setError(""); setRecipes([]); setShoppingAdded([]);
    const userMsg = "请根据我冰箱里的食材和我的饮食偏好，推荐适合的菜谱";
    setLastUserMessage(userMsg);
    setMessages(prev => [...prev, { role: "user", content: "📦 读取冰箱，请根据我的食材和偏好推荐菜谱" }]);
    try {
      const res = await axios.post(`${API}/ai/fridge-recommend`, {
        message: userMsg, user_id: userId, conversation_id: conversationId,
      });
      if (res.data.conversation_id) setConversationId(res.data.conversation_id);
      setMessages(prev => [...prev, { role: "assistant", content: res.data.answer || "收到！" }]);
      // ✅ 显示结构化菜谱选择卡片
      if (res.data.recipes?.length > 0) setRecipes(res.data.recipes);
    } catch {
      setError("读取冰箱失败，请重试");
      setMessages(prev => [...prev, { role: "assistant", content: "⚠️ 无法读取冰箱，请稍后再试。" }]);
    } finally { setLoading(false); }
  };

  // ✅ 选择某道菜谱，把缺少的食材加入购物清单
  const handleSelectRecipe = async (recipe) => {
    setSelectedRecipe(recipe.name);
    setAddingToShopping(true); setError(""); setShoppingAdded([]);
    try {
      const missing = recipe.missing || [];
      const added = [];
      for (const ingredient of missing) {
        try {
          await axios.post(`${API}/shopping`, {
            user_id: parseInt(userId), ingredient, quantity: 1, unit: "份",
          });
          added.push(ingredient);
        } catch {}
      }
      setShoppingAdded(added);
      if (added.length > 0) {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: `✅ 已选择「${recipe.name}」！\n缺少的食材已加入购物清单：${added.join("、")}`,
        }]);
      } else {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: `✅ 已选择「${recipe.name}」！冰箱里已有所有所需食材，可以直接开始烹饪 🎉`,
        }]);
      }
      setRecipes([]);
    } catch { setError("添加购物清单失败"); }
    finally { setAddingToShopping(false); }
  };

  // 把缺少食材加购物清单（普通聊天后）
  const handleAddToShopping = async () => {
    if (!lastUserMessage) return;
    setAddingToShopping(true); setError(""); setShoppingAdded([]);
    try {
      const res = await axios.post(`${API}/ai/chat-with-shopping`, {
        message: lastUserMessage, user_id: userId, conversation_id: conversationId,
      });
      const added = res.data.added_to_shopping || [];
      setShoppingAdded(added.length > 0 ? added : ["冰箱已有所有食材 ✅"]);
    } catch { setError("添加购物清单失败"); }
    finally { setAddingToShopping(false); }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const showShoppingBtn = messages.length > 1 && !loading && lastUserMessage && recipes.length === 0;

  return (
    <div style={styles.bg}>
      <div style={styles.blob1} /><div style={styles.blob2} />

      <div style={styles.nav}>
        <div style={styles.navLogo}>❄️ SmartFridge</div>
        <div style={styles.navLinks}>
          <a href="/fridge"   style={styles.navLink}>冰箱</a>
          <a href="/shopping" style={styles.navLink}>购物清单</a>
          <a href="/ai"       style={{ ...styles.navLink, color: "#a78bfa" }}>AI推荐</a>
        </div>
      </div>

      <div style={styles.layout}>
        {/* Sidebar */}
        <div style={styles.sidebar}>
          <h3 style={styles.sidebarTitle}>💡 快速提问</h3>
          {["我有西红柿、鸡蛋，目标减脂，喜欢粤菜",
            "我有牛肉200g、西兰花，要增肌，喜欢川菜",
            "冰箱里有牛奶和鸡蛋，推荐健康早餐"].map((p, i) => (
            <button key={i} style={styles.quickBtn} onClick={() => setInput(p)}>{p}</button>
          ))}
          <div style={styles.sidebarDivider} />
          <h3 style={styles.sidebarTitle}>🧠 AI 能力</h3>
          {[["📦","读取冰箱自动推荐"],["🏷️","按偏好 Tag 筛选"],["🧠","多轮对话记忆"],["🛒","自动补全购物清单"]].map(([icon, text]) => (
            <div key={text} style={styles.featureItem}><span>{icon}</span><span style={styles.featureText}>{text}</span></div>
          ))}
        </div>

        {/* Chat */}
        <div style={styles.chatWrapper}>
          <div style={styles.chatHeader}>
            <div style={styles.aiAvatar}>🤖</div>
            <div>
              <div style={styles.aiName}>SmartFridge AI</div>
              <div style={styles.aiStatus}><span style={styles.statusDot} />在线 · RAG 个性化推荐</div>
            </div>
            {/* ✅ 读取冰箱推荐按钮 */}
            <button style={{ ...styles.fridgeRecommendBtn, opacity: loading ? 0.6 : 1 }}
              onClick={handleFridgeRecommend} disabled={loading}>
              📦 读取冰箱推荐
            </button>
          </div>

          <div style={styles.messages}>
            {messages.map((msg, i) => (
              <div key={i} style={{ ...styles.msgRow, justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                {msg.role === "assistant" && <div style={styles.msgAvatar}>🤖</div>}
                <div style={{ ...styles.bubble, ...(msg.role === "user" ? styles.bubbleUser : styles.bubbleAI) }}>
                  {msg.content.split("\n").map((line, j, arr) => (
                    <span key={j}>{line}{j < arr.length - 1 && <br />}</span>
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

          {/* ✅ 菜谱选择卡片 */}
          {recipes.length > 0 && (
            <div style={styles.recipesArea}>
              <p style={styles.recipesTitle}>🍽️ 请选择一道菜谱，缺少的食材将自动加入购物清单：</p>
              <div style={styles.recipeCards}>
                {recipes.map((recipe, i) => (
                  <button key={i}
                    style={{ ...styles.recipeCard, opacity: addingToShopping && selectedRecipe !== recipe.name ? 0.5 : 1 }}
                    onClick={() => handleSelectRecipe(recipe)}
                    disabled={addingToShopping}>
                    <div style={styles.recipeName}>{recipe.name}</div>
                    <div style={styles.recipeIngredients}>
                      需要：{recipe.ingredients?.join("、")}
                    </div>
                    {recipe.missing?.length > 0 ? (
                      <div style={styles.recipeMissing}>❌ 缺少：{recipe.missing.join("、")}</div>
                    ) : (
                      <div style={styles.recipeReady}>✅ 食材齐全，可直接烹饪</div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 购物清单按钮（普通聊天） */}
          {showShoppingBtn && (
            <div style={styles.shoppingBtnArea}>
              <button style={{ ...styles.shoppingBtn, opacity: addingToShopping ? 0.7 : 1 }}
                onClick={handleAddToShopping} disabled={addingToShopping}>
                {addingToShopping ? "⏳ 分析中..." : "🛒 缺少的食材加入购物清单"}
              </button>
              {shoppingAdded.length > 0 && (
                <div style={styles.shoppingResult}>
                  {shoppingAdded[0].includes("已有") ? (
                    <span>{shoppingAdded[0]}</span>
                  ) : (
                    <>
                      <span>✅ 已加入购物清单：</span>
                      <span style={{ color: "#34d399", fontWeight: 600 }}>{shoppingAdded.join("、")}</span>
                      <a href="/shopping" style={styles.goShoppingLink}>→ 查看清单</a>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {error && <div style={styles.error}>⚠️ {error}</div>}

          <div style={styles.inputArea}>
            <textarea ref={inputRef} style={styles.textarea} rows={2}
              placeholder="输入你的食材和饮食偏好...（Enter 发送，Shift+Enter 换行）"
              value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} />
            <button style={{ ...styles.sendBtn, opacity: loading || !input.trim() ? 0.5 : 1 }}
              onClick={handleSend} disabled={loading || !input.trim()}>
              {loading ? "..." : "发送"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  bg: { minHeight: "100vh", background: "linear-gradient(160deg, #0f2027, #1a1a2e, #16213e)", fontFamily: "'Segoe UI', sans-serif", position: "relative", display: "flex", flexDirection: "column" },
  blob1: { position: "fixed", width: 500, height: 500, borderRadius: "50%", background: "rgba(167,139,250,0.06)", top: -150, right: -100, filter: "blur(100px)", zIndex: 0 },
  blob2: { position: "fixed", width: 400, height: 400, borderRadius: "50%", background: "rgba(0,180,216,0.05)", bottom: -80, left: -80, filter: "blur(80px)", zIndex: 0 },
  nav: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 32px", borderBottom: "1px solid rgba(255,255,255,0.07)", position: "relative", zIndex: 2 },
  navLogo: { color: "#fff", fontWeight: 700, fontSize: 18 },
  navLinks: { display: "flex", gap: 24 },
  navLink: { color: "rgba(255,255,255,0.5)", textDecoration: "none", fontSize: 14, fontWeight: 500 },
  layout: { display: "flex", flex: 1, maxWidth: 1100, margin: "0 auto", width: "100%", padding: "28px 24px", gap: 24, position: "relative", zIndex: 1 },
  sidebar: { width: 240, flexShrink: 0, display: "flex", flexDirection: "column", gap: 8 },
  sidebarTitle: { fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 6px" },
  quickBtn: { padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(167,139,250,0.2)", background: "rgba(167,139,250,0.07)", color: "rgba(255,255,255,0.65)", fontSize: 12, cursor: "pointer", textAlign: "left", lineHeight: 1.4, marginBottom: 4 },
  sidebarDivider: { borderTop: "1px solid rgba(255,255,255,0.07)", margin: "12px 0" },
  featureItem: { display: "flex", alignItems: "center", gap: 8, padding: "6px 0" },
  featureText: { fontSize: 12, color: "rgba(255,255,255,0.45)" },
  chatWrapper: { flex: 1, display: "flex", flexDirection: "column", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, overflow: "hidden" },
  chatHeader: { display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" },
  aiAvatar: { fontSize: 28 },
  aiName: { color: "#fff", fontWeight: 700, fontSize: 15 },
  aiStatus: { display: "flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 2 },
  statusDot: { width: 7, height: 7, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 6px #22c55e" },
  fridgeRecommendBtn: { marginLeft: "auto", padding: "8px 16px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #7c3aed, #4c1d95)", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" },
  messages: { flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 14, minHeight: 280, maxHeight: 400 },
  msgRow: { display: "flex", gap: 10, alignItems: "flex-end" },
  msgAvatar: { fontSize: 22, flexShrink: 0 },
  bubble: { maxWidth: "72%", padding: "12px 16px", borderRadius: 16, fontSize: 14, lineHeight: 1.65 },
  bubbleUser: { background: "linear-gradient(135deg, #6d28d9, #4c1d95)", color: "#fff", borderBottomRightRadius: 4 },
  bubbleAI:   { background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.85)", borderBottomLeftRadius: 4 },
  typingBubble: { display: "flex", alignItems: "center", gap: 5, padding: "14px 18px" },
  dot: { display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: "rgba(255,255,255,0.4)", animation: "bounce 0.9s ease-in-out infinite" },

  // 菜谱选择
  recipesArea: { padding: "12px 20px", borderTop: "1px solid rgba(255,255,255,0.06)" },
  recipesTitle: { color: "rgba(255,255,255,0.7)", fontSize: 13, margin: "0 0 10px", fontWeight: 600 },
  recipeCards: { display: "flex", gap: 10, flexWrap: "wrap" },
  recipeCard: { flex: 1, minWidth: 180, maxWidth: 260, padding: "12px 14px", borderRadius: 12, border: "1px solid rgba(167,139,250,0.3)", background: "rgba(167,139,250,0.08)", cursor: "pointer", textAlign: "left", transition: "all 0.2s" },
  recipeName: { color: "#fff", fontWeight: 700, fontSize: 14, marginBottom: 6 },
  recipeIngredients: { color: "rgba(255,255,255,0.5)", fontSize: 11, marginBottom: 6, lineHeight: 1.4 },
  recipeMissing: { color: "#f87171", fontSize: 11, fontWeight: 600 },
  recipeReady:   { color: "#4ade80", fontSize: 11, fontWeight: 600 },

  // 购物清单
  shoppingBtnArea: { padding: "10px 20px 4px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", gap: 8 },
  shoppingBtn: { padding: "10px 20px", borderRadius: 10, border: "none", cursor: "pointer", background: "linear-gradient(135deg, #059669, #047857)", color: "#fff", fontSize: 13, fontWeight: 700, alignSelf: "flex-start" },
  shoppingResult: { fontSize: 13, color: "rgba(255,255,255,0.7)", background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)", borderRadius: 8, padding: "8px 14px", display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" },
  goShoppingLink: { marginLeft: 8, color: "#34d399", fontWeight: 700, textDecoration: "none", fontSize: 13 },
  error: { margin: "0 20px 12px", padding: "10px 14px", borderRadius: 10, background: "rgba(255,80,80,0.12)", border: "1px solid rgba(255,80,80,0.25)", color: "#ff8080", fontSize: 13 },
  inputArea: { display: "flex", gap: 12, padding: "14px 16px", borderTop: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" },
  textarea: { flex: 1, borderRadius: 12, padding: "12px 16px", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.07)", color: "#fff", fontSize: 14, resize: "none", outline: "none", lineHeight: 1.5, fontFamily: "'Segoe UI', sans-serif" },
  sendBtn: { padding: "0 24px", borderRadius: 12, border: "none", background: "linear-gradient(135deg, #7c3aed, #4c1d95)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", flexShrink: 0 },
};