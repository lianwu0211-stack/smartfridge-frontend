import { useState, useRef, useEffect } from "react";
import axios from "axios";

const API = "https://smartfridge.cc.cd/api";

export default function AIChat() {
  const userId = localStorage.getItem("user_id") || "1";

  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem(`messages_${userId}`);
    return saved ? JSON.parse(saved) : [
      { role: "assistant", content: "你好！我是 SmartFridge AI 厨师助手 🍳\n\n点击「📦 读取冰箱推荐」，我会根据你冰箱里的食材和饮食偏好，为你推荐合适的菜谱！\n\n也可以直接告诉我你的需求。" },
    ];
  });
  const [input, setInput]             = useState("");
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");
  const [conversationId, setConversationId] = useState(
    localStorage.getItem(`conv_${userId}`) || ""
  );
  const [recipes, setRecipes] = useState(() => {
  try {
    const saved = localStorage.getItem(`recipes_${localStorage.getItem("user_id") || "1"}`);
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
});
  const [selectedRecipe, setSelectedRecipe]     = useState(null);
  const [addingToShopping, setAddingToShopping] = useState(false);
  const [shoppingAdded, setShoppingAdded]       = useState([]);
  const [lastUserMessage, setLastUserMessage]   = useState("");
  const [savingMeal, setSavingMeal]             = useState(false);
  const [fetchingInstructions, setFetchingInstructions] = useState(false);

  // ✅ 食材不足弹窗 —— 从 localStorage 恢复，切页回来不消失
  const [insufficientModal, setInsufficientModal] = useState(() => {
    try {
      const saved = localStorage.getItem(`insufficient_${localStorage.getItem("user_id") || "1"}`);
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  // ✅ 已选菜谱 —— 从 localStorage 恢复，切页回来不消失
  const [completedRecipe, setCompletedRecipe] = useState(() => {
    try {
      const saved = localStorage.getItem(`completedRecipe_${localStorage.getItem("user_id") || "1"}`);
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => {
    localStorage.setItem(`messages_${userId}`, JSON.stringify(messages));
  }, [messages, userId]);

  // ✅ persist insufficientModal —— 有值就存，null 就刪
  useEffect(() => {
    const key = `insufficient_${userId}`;
    if (insufficientModal) {
      localStorage.setItem(key, JSON.stringify(insufficientModal));
    } else {
      localStorage.removeItem(key);
    }
  }, [insufficientModal, userId]);

  useEffect(() => {
  const key = `recipes_${userId}`;
  if (recipes.length > 0) {
    localStorage.setItem(key, JSON.stringify(recipes));
  } else {
    localStorage.removeItem(key);
  }
}, [recipes, userId]);

  // ✅ persist completedRecipe —— 有值就存，null 就刪
  useEffect(() => {
    const key = `completedRecipe_${userId}`;
    if (completedRecipe) {
      localStorage.setItem(key, JSON.stringify(completedRecipe));
    } else {
      localStorage.removeItem(key);
    }
  }, [completedRecipe, userId]);

  const updateConversationId = (id) => {
    if (id) { setConversationId(id); localStorage.setItem(`conv_${userId}`, id); }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput(""); setError(""); setShoppingAdded([]); setRecipes([]);
    setLastUserMessage(text);
    setMessages(prev => [...prev, { role: "user", content: text }]);
    setLoading(true);
    try {
      const res = await axios.post(`${API}/ai/chat`, {
        message: text, user_id: userId, conversation_id: conversationId,
      });
      updateConversationId(res.data.conversation_id);
      setMessages(prev => [...prev, { role: "assistant", content: res.data.answer || "收到！" }]);
    } catch {
      setError("AI 服务暂时不可用");
      setMessages(prev => [...prev, { role: "assistant", content: "⚠️ 抱歉，我暂时无法回答，请稍后再试。" }]);
    } finally { setLoading(false); inputRef.current?.focus(); }
  };

  // ✅ 点击读取冰箱推荐时先弹出人数输入
  const handleFridgeRecommendClick = async () => {
    setLoading(true); setError(""); setRecipes([]); setShoppingAdded([]); setCompletedRecipe(null);
    const userMsg = `请根据我冰箱里的食材和我的饮食偏好，推荐适合的菜谱`;
    setLastUserMessage(userMsg);
    setMessages(prev => [...prev, { role: "user", content: `📦 读取冰箱推荐菜谱` }]);
    try {
      const res = await axios.post(`${API}/ai/fridge-recommend`, {
        message: userMsg, user_id: userId, conversation_id: conversationId,
      });
      updateConversationId(res.data.conversation_id);
      setMessages(prev => [...prev, { role: "assistant", content: res.data.answer || "收到！" }]);
      if (res.data.recipes?.length > 0) setRecipes(res.data.recipes);
    } catch {
      setError("读取冰箱失败，请重试");
      setMessages(prev => [...prev, { role: "assistant", content: "⚠️ 无法读取冰箱，请稍后再试。" }]);
    } finally { setLoading(false); }
  };

  // ✅ 选择菜谱
  const handleSelectRecipe = async (recipe) => {
    setSelectedRecipe(recipe.name);
    setAddingToShopping(true); setError(""); setShoppingAdded([]); setCompletedRecipe(null);
    try {
      // 先静默获取做法 + 食材用量（含正确份量），再加入购物清单
      setFetchingInstructions(true);
      let instructions = "";
      let ingredientAmounts = [];
      try {
        const instrRes = await axios.post(`${API}/ai/recipe-instructions`, {
          recipe_name: recipe.name,
          ingredients: recipe.ingredients,
          user_id: userId,
          conversation_id: "",
        });
        instructions = instrRes.data.instructions || "";
        ingredientAmounts = instrRes.data.ingredient_amounts || [];
      } catch {
        // ✅ fallback：用 servings 倍数估算，不再写死 1 份
        instructions = `食材：${recipe.ingredients.join("、")}`;
        ingredientAmounts = recipe.ingredients.map(i => ({ name: i, quantity: 1, unit: "份" }));
      } finally {
        setFetchingInstructions(false);
      }

      // ✅ 加入购物清单时用 ingredientAmounts 里的正确数量
      const missing = recipe.missing || [];
      const added = [];
      for (const ingredient of missing) {
        try {
          // 从 ingredientAmounts 找到对应数量，找不到才用 1
          const amountInfo = ingredientAmounts.find(a => a.name === ingredient);
          const qty = amountInfo ? amountInfo.quantity : 1;
          const unit = amountInfo ? amountInfo.unit : "份";
          await axios.post(`${API}/shopping`, {
            user_id: parseInt(userId), ingredient, quantity: qty, unit,
          });
          added.push(ingredient);
        } catch {}
      }
      setShoppingAdded(added);

      setCompletedRecipe({
        name: recipe.name,
        ingredients: recipe.ingredients,
        ingredientAmounts,
        instructions,
      });

      if (added.length > 0) {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: `✅ 已选择「${recipe.name}」！\n缺少的食材已加入购物清单：${added.join("、")}\n\n烹饪完成后点击「✅ 完成这餐」记录到日历！`,
        }]);
      } else {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: `✅ 已选择「${recipe.name}」！冰箱里已有所有所需食材 🎉\n\n烹饪完成后点击「✅ 完成这餐」记录到日历！`,
        }]);
      }
      setRecipes([]);
    } catch { setError("操作失败，请重试"); }
    finally { setAddingToShopping(false); }
  };

  // ✅ 完成这餐：发给后端检查冰箱数量
  const handleCompleteMeal = async () => {
    if (!completedRecipe) return;
    setSavingMeal(true); setError("");
    try {
      const res = await axios.post(`${API}/meal/complete`, {
        user_id: parseInt(userId),
        recipe_name: completedRecipe.name,
        ingredients: completedRecipe.ingredients,
        ingredient_amounts: completedRecipe.ingredientAmounts,
        instructions: completedRecipe.instructions,
      });

      if (res.data.status === "insufficient") {
        // 食材不足，弹出提示
        setInsufficientModal({ items: res.data.insufficient });
      } else {
        // 成功
        handleMealSaved();
      }
    } catch {
      setError("保存失败，请重试");
    } finally { setSavingMeal(false); }
  };

  // ✅ 食材不足 → 用户选择加入购物清单
  const handleInsufficientAddShopping = async () => {
    const items = insufficientModal.items;
    setInsufficientModal(null);
    for (const item of items) {
      try {
        await axios.post(`${API}/shopping`, {
          user_id: parseInt(userId),
          ingredient: item.name,
          quantity: item.needed - item.available,
          unit: item.unit,
        });
      } catch {}
    }
    setMessages(prev => [...prev, {
      role: "assistant",
      content: `🛒 缺少的食材已加入购物清单：${items.map(i => i.name).join("、")}\n\n购买并在购物清单勾选后，再点「✅ 完成这餐」即可记录！`,
    }]);
  };

  // ✅ 食材不足 → 用户选择直接制作（强制扣减）
  const handleInsufficientForce = async () => {
    setInsufficientModal(null);
    setSavingMeal(true);
    try {
      await axios.post(`${API}/meal/force-complete`, {
        user_id: parseInt(userId),
        recipe_name: completedRecipe.name,
        ingredients: completedRecipe.ingredients,
        ingredient_amounts: completedRecipe.ingredientAmounts,
        instructions: completedRecipe.instructions,
      });
      handleMealSaved();
    } catch {
      setError("保存失败，请重试");
    } finally { setSavingMeal(false); }
  };

  // ✅ 食材不足 → 用户选择取消这餐，重新推荐
  const handleInsufficientCancel = async () => {
    setInsufficientModal(null);
    setCompletedRecipe(null);
    // 重新推荐
    setLoading(true); setError(""); setRecipes([]);
    setMessages(prev => [...prev, {
      role: "assistant",
      content: "已取消这餐。根据冰箱现有食材，我重新为你推荐其他菜谱...",
    }]);
    try {
      const res = await axios.post(`${API}/ai/fridge-recommend`, {
        message: "请根据我冰箱里现有的食材重新推荐菜谱",
        user_id: userId,
        conversation_id: conversationId,
      });
      updateConversationId(res.data.conversation_id);
      setMessages(prev => [...prev, { role: "assistant", content: res.data.answer || "收到！" }]);
      if (res.data.recipes?.length > 0) setRecipes(res.data.recipes);
    } catch {
      setError("推荐失败，请重试");
    } finally { setLoading(false); }
  };

  // ✅ 餐记录保存成功后的统一处理
  const handleMealSaved = () => {
    const resetMsg = [{ role: "assistant", content: `🎉 「${completedRecipe.name}」已记录到饮食日历！\n\n想再做一道菜？点击「📦 读取冰箱推荐」继续吧！` }];
    setMessages(resetMsg);
    setConversationId("");
    localStorage.removeItem(`conv_${userId}`);
    localStorage.removeItem(`insufficient_${userId}`);
    localStorage.removeItem(`completedRecipe_${userId}`);
    localStorage.removeItem(`recipes_${userId}`);
    localStorage.setItem(`messages_${userId}`, JSON.stringify(resetMsg));
    setCompletedRecipe(null); setShoppingAdded([]); setRecipes([]);
  };

  const handleClearChat = () => {
    const resetMsg = [{ role: "assistant", content: "你好！我是 SmartFridge AI 厨师助手 🍳\n\n点击「📦 读取冰箱推荐」开始吧！" }];
    setMessages(resetMsg);
    setConversationId("");
    localStorage.removeItem(`conv_${userId}`);
    localStorage.removeItem(`insufficient_${userId}`);
    localStorage.removeItem(`completedRecipe_${userId}`);
    localStorage.removeItem(`recipes_${userId}`);
    localStorage.setItem(`messages_${userId}`, JSON.stringify(resetMsg));
    setCompletedRecipe(null); setRecipes([]); setShoppingAdded([]);
  };

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

  const showShoppingBtn = messages.length > 1 && !loading && lastUserMessage && recipes.length === 0 && !completedRecipe;

  return (
    <div style={styles.bg}>
      <div style={styles.blob1} /><div style={styles.blob2} />

      {/* ✅ 食材不足弹窗 */}
      {insufficientModal && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modalCard, maxWidth: 480 }}>
            <h3 style={styles.modalTitle}>⚠️ 冰箱食材不足</h3>
            <p style={styles.modalSubtitle}>以下食材数量不够，请选择处理方式：</p>
            <div style={styles.insufficientList}>
              {insufficientModal.items.map((item, i) => (
                <div key={i} style={styles.insufficientItem}>
                  <span style={styles.insufficientName}>{item.name}</span>
                  <span style={styles.insufficientDetail}>
                    需要 {item.needed}{item.unit}，冰箱有 {item.available}{item.unit}
                  </span>
                </div>
              ))}
            </div>
            <div style={styles.insufficientBtns}>
              <button style={styles.insufficientShoppingBtn} onClick={handleInsufficientAddShopping}>
                🛒 加入购物清单
              </button>
              <button style={styles.insufficientForceBtn} onClick={handleInsufficientForce}>
                🍳 直接制作
              </button>
              <button style={styles.insufficientCancelBtn} onClick={handleInsufficientCancel}>
                ❌ 取消这餐
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <div style={styles.nav}>
        <div style={styles.navLogo}>❄️ SmartFridge</div>
        <div style={styles.navLinks}>
          <a href="/fridge"   style={styles.navLink}>冰箱</a>
          <a href="/shopping" style={styles.navLink}>购物清单</a>
          <a href="/ai"       style={{ ...styles.navLink, color: "#a78bfa" }}>AI推荐</a>
          <a href="/calendar" style={styles.navLink}>📅 日历</a>
        </div>
      </div>

      <div style={styles.layout}>
        <div style={styles.sidebar}>
          <h3 style={styles.sidebarTitle}>💡 快速提问</h3>
          {["我有西红柿、鸡蛋，目标减脂，喜欢粤菜",
            "我有牛肉200g、西兰花，要增肌，喜欢川菜",
            "冰箱里有牛奶和鸡蛋，推荐健康早餐"].map((p, i) => (
            <button key={i} style={styles.quickBtn} onClick={() => setInput(p)}>{p}</button>
          ))}
          <div style={styles.sidebarDivider} />
          <h3 style={styles.sidebarTitle}>🧠 AI 能力</h3>
          {[["📦","读取冰箱自动推荐"],["🏷️","按偏好 Tag 筛选"],["🧠","多轮对话记忆"],["🛒","自动补全购物清单"],["📅","记录饮食日历"]].map(([icon, text]) => (
            <div key={text} style={styles.featureItem}><span>{icon}</span><span style={styles.featureText}>{text}</span></div>
          ))}
          <div style={styles.sidebarDivider} />
          <button style={styles.clearBtn} onClick={handleClearChat}>🗑 清空对话</button>
          <a href="/calendar" style={styles.calendarBtn}>📅 查看饮食日历</a>
        </div>

        <div style={styles.chatWrapper}>
          <div style={styles.chatHeader}>
            <div style={styles.aiAvatar}>🤖</div>
            <div>
              <div style={styles.aiName}>SmartFridge AI 助手</div>
              <div style={styles.aiStatus}><span style={styles.statusDot} />在线</div>
            </div>
            <button style={styles.fridgeRecommendBtn} onClick={handleFridgeRecommendClick} disabled={loading}>
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
                    <div style={styles.recipeIngredients}>需要：{recipe.ingredients?.join("、")}</div>
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

          {completedRecipe && (
            <div style={styles.completeMealArea}>
              {fetchingInstructions ? (
                <div style={styles.fetchingTip}>⏳ 正在获取做法和食材用量...</div>
              ) : (
                <button
                  style={{ ...styles.completeMealBtn, opacity: savingMeal ? 0.7 : 1 }}
                  onClick={handleCompleteMeal}
                  disabled={savingMeal}
                >
                  {savingMeal ? "⏳ 检查食材中..." : `✅ 完成这餐「${completedRecipe.name}」并记录到日历`}
                </button>
              )}
            </div>
          )}

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
  sidebar: { width: 220, flexShrink: 0, display: "flex", flexDirection: "column", gap: 8 },
  sidebarTitle: { fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 6px" },
  quickBtn: { padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(167,139,250,0.2)", background: "rgba(167,139,250,0.07)", color: "rgba(255,255,255,0.65)", fontSize: 12, cursor: "pointer", textAlign: "left", lineHeight: 1.4, marginBottom: 4 },
  sidebarDivider: { borderTop: "1px solid rgba(255,255,255,0.07)", margin: "12px 0" },
  featureItem: { display: "flex", alignItems: "center", gap: 8, padding: "6px 0" },
  featureText: { fontSize: 12, color: "rgba(255,255,255,0.45)" },
  clearBtn: { padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(255,80,80,0.3)", background: "rgba(255,80,80,0.08)", color: "#f87171", fontSize: 12, cursor: "pointer", textAlign: "center", marginBottom: 8 },
  calendarBtn: { padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(167,139,250,0.3)", background: "rgba(167,139,250,0.08)", color: "#a78bfa", fontSize: 12, cursor: "pointer", textAlign: "center", textDecoration: "none", display: "block" },
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
  recipesArea: { padding: "12px 20px", borderTop: "1px solid rgba(255,255,255,0.06)" },
  recipesTitle: { color: "rgba(255,255,255,0.7)", fontSize: 13, margin: "0 0 10px", fontWeight: 600 },
  recipeCards: { display: "flex", gap: 10, flexWrap: "wrap" },
  recipeCard: { flex: 1, minWidth: 180, maxWidth: 260, padding: "12px 14px", borderRadius: 12, border: "1px solid rgba(167,139,250,0.3)", background: "rgba(167,139,250,0.08)", cursor: "pointer", textAlign: "left", transition: "all 0.2s" },
  recipeName: { color: "#fff", fontWeight: 700, fontSize: 14, marginBottom: 6 },
  recipeIngredients: { color: "rgba(255,255,255,0.5)", fontSize: 11, marginBottom: 6, lineHeight: 1.4 },
  recipeMissing: { color: "#f87171", fontSize: 11, fontWeight: 600 },
  recipeReady:   { color: "#4ade80", fontSize: 11, fontWeight: 600 },
  completeMealArea: { padding: "12px 20px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 12 },
  completeMealBtn: { padding: "12px 24px", borderRadius: 12, border: "none", background: "linear-gradient(135deg, #059669, #047857)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", transition: "opacity 0.2s" },
  fetchingTip: { color: "rgba(255,255,255,0.5)", fontSize: 13 },
  shoppingBtnArea: { padding: "10px 20px 4px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", gap: 8 },
  shoppingBtn: { padding: "10px 20px", borderRadius: 10, border: "none", cursor: "pointer", background: "linear-gradient(135deg, #059669, #047857)", color: "#fff", fontSize: 13, fontWeight: 700, alignSelf: "flex-start" },
  shoppingResult: { fontSize: 13, color: "rgba(255,255,255,0.7)", background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)", borderRadius: 8, padding: "8px 14px", display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" },
  goShoppingLink: { marginLeft: 8, color: "#34d399", fontWeight: 700, textDecoration: "none", fontSize: 13 },
  error: { margin: "0 20px 12px", padding: "10px 14px", borderRadius: 10, background: "rgba(255,80,80,0.12)", border: "1px solid rgba(255,80,80,0.25)", color: "#ff8080", fontSize: 13 },
  inputArea: { display: "flex", gap: 12, padding: "14px 16px", borderTop: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" },
  textarea: { flex: 1, borderRadius: 12, padding: "12px 16px", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.07)", color: "#fff", fontSize: 14, resize: "none", outline: "none", lineHeight: 1.5, fontFamily: "'Segoe UI', sans-serif" },
  sendBtn: { padding: "0 24px", borderRadius: 12, border: "none", background: "linear-gradient(135deg, #7c3aed, #4c1d95)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", flexShrink: 0 },
  // 弹窗
  modalOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.7)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" },
  modalCard: { background: "#1a2a3a", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 20, padding: "32px 36px", width: "100%", maxWidth: 360, boxShadow: "0 24px 60px rgba(0,0,0,0.5)", textAlign: "center" },
  modalTitle: { color: "#fff", fontSize: 20, fontWeight: 700, margin: "0 0 8px" },
  modalSubtitle: { color: "rgba(255,255,255,0.5)", fontSize: 14, margin: "0 0 24px" },
  modalBtns: { display: "flex", gap: 12, marginTop: 24 },
  modalCancelBtn: { flex: 1, padding: "12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "rgba(255,255,255,0.6)", fontSize: 14, fontWeight: 600, cursor: "pointer" },
  modalConfirmBtn: { flex: 2, padding: "12px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #7c3aed, #4c1d95)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" },
  servingsInput: { width: 100, padding: "14px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.08)", color: "#fff", fontSize: 28, fontWeight: 700, textAlign: "center", outline: "none" },
  servingsHint: { color: "rgba(255,255,255,0.5)", fontSize: 14, margin: "8px 0 0" },
  // 食材不足弹窗
  insufficientList: { margin: "0 0 20px", display: "flex", flexDirection: "column", gap: 10 },
  insufficientItem: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "rgba(255,80,80,0.08)", border: "1px solid rgba(255,80,80,0.2)", borderRadius: 10 },
  insufficientName: { color: "#fff", fontWeight: 600, fontSize: 14 },
  insufficientDetail: { color: "#f87171", fontSize: 13 },
  insufficientBtns: { display: "flex", flexDirection: "column", gap: 10 },
  insufficientShoppingBtn: { padding: "12px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #0077b6, #00b4d8)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" },
  insufficientForceBtn: { padding: "12px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #059669, #047857)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" },
  insufficientCancelBtn: { padding: "12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "rgba(255,255,255,0.6)", fontSize: 14, fontWeight: 600, cursor: "pointer" },
};
