import { useState, useEffect } from "react";
import axios from "axios";

const API = "https://smartfridge.cc.cd/api";

export default function Calendar() {
  const userId = localStorage.getItem("user_id") || "1";
  const [records, setRecords]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [selectedDate, setSelectedDate] = useState(null); // "YYYY-MM-DD"
  const [selectedMeals, setSelectedMeals] = useState([]);
  const [expandedRecord, setExpandedRecord] = useState(null); // record_id
  const [currentYear, setCurrentYear]   = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth()); // 0-11

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      const res = await axios.get(`${API}/meal/${userId}`);
      setRecords(res.data);
    } catch {
      // 静默失败
    } finally {
      setLoading(false);
    }
  };

  // 把records按日期分组：{ "2026-04-12": [record, ...] }
  const recordsByDate = records.reduce((acc, r) => {
    const d = r.meal_date;
    if (!acc[d]) acc[d] = [];
    acc[d].push(r);
    return acc;
  }, {});

  // 生成当月日历格子
  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay(); // 0=Sun

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay    = getFirstDayOfMonth(currentYear, currentMonth);

  const monthNames = ["一月","二月","三月","四月","五月","六月","七月","八月","九月","十月","十一月","十二月"];
  const weekDays   = ["日","一","二","三","四","五","六"];

  const handleDayClick = (day) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    setSelectedDate(dateStr);
    setSelectedMeals(recordsByDate[dateStr] || []);
    setExpandedRecord(null);
  };

  const handlePrevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
    setSelectedDate(null); setSelectedMeals([]);
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
    setSelectedDate(null); setSelectedMeals([]);
  };

  const handleDeleteRecord = async (recordId) => {
    try {
      await axios.delete(`${API}/meal/${recordId}`);
      setRecords(prev => prev.filter(r => r.record_id !== recordId));
      setSelectedMeals(prev => prev.filter(r => r.record_id !== recordId));
    } catch {}
  };

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;

  // 生成格子数组
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div style={styles.bg}>
      <div style={styles.blob1} /><div style={styles.blob2} />

      {/* Nav */}
      <div style={styles.nav}>
        <div style={styles.navLogo}>❄️ SmartFridge</div>
        <div style={styles.navLinks}>
          <a href="/fridge"   style={styles.navLink}>冰箱</a>
          <a href="/shopping" style={styles.navLink}>购物清单</a>
          <a href="/ai"       style={styles.navLink}>AI推荐</a>
          <a href="/calendar" style={{ ...styles.navLink, color: "#a78bfa", fontWeight: "bold" }}>📅 日历</a>
        </div>
      </div>

      <div style={styles.container}>
        <div style={styles.pageHeader}>
          <div>
            <h1 style={styles.title}>📅 饮食日历</h1>
            <p style={styles.subtitle}>记录你每天吃了什么，点击日期查看菜谱详情</p>
          </div>
          <a href="/ai" style={styles.goAiBtn}>+ 去AI推荐</a>
        </div>

        <div style={styles.mainLayout}>
          {/* 日历 */}
          <div style={styles.calendarCard}>
            {/* 月份导航 */}
            <div style={styles.monthNav}>
              <button style={styles.monthNavBtn} onClick={handlePrevMonth}>‹</button>
              <span style={styles.monthLabel}>{currentYear}年 {monthNames[currentMonth]}</span>
              <button style={styles.monthNavBtn} onClick={handleNextMonth}>›</button>
            </div>

            {/* 星期标题 */}
            <div style={styles.weekHeader}>
              {weekDays.map(d => (
                <div key={d} style={styles.weekDay}>{d}</div>
              ))}
            </div>

            {/* 日期格子 */}
            {loading ? (
              <div style={styles.loadingBox}>加载中...</div>
            ) : (
              <div style={styles.daysGrid}>
                {cells.map((day, i) => {
                  if (!day) return <div key={`empty-${i}`} />;
                  const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
                  const hasMeal = !!recordsByDate[dateStr];
                  const isToday = dateStr === todayStr;
                  const isSelected = dateStr === selectedDate;
                  const mealCount = recordsByDate[dateStr]?.length || 0;

                  return (
                    <div
                      key={day}
                      style={{
                        ...styles.dayCell,
                        ...(isToday ? styles.dayCellToday : {}),
                        ...(isSelected ? styles.dayCellSelected : {}),
                        ...(hasMeal && !isSelected ? styles.dayCellHasMeal : {}),
                      }}
                      onClick={() => handleDayClick(day)}
                    >
                      <span style={styles.dayNum}>{day}</span>
                      {hasMeal && (
                        <div style={styles.mealDots}>
                          {Array.from({ length: Math.min(mealCount, 3) }).map((_, i) => (
                            <span key={i} style={{ ...styles.mealDot, background: isSelected ? "#fff" : "#a78bfa" }} />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* 图例 */}
            <div style={styles.legend}>
              <div style={styles.legendItem}><span style={{ ...styles.legendDot, background: "#a78bfa" }} />有记录</div>
              <div style={styles.legendItem}><span style={{ ...styles.legendDot, background: "#00b4d8" }} />今天</div>
            </div>
          </div>

          {/* 右侧详情 */}
          <div style={styles.detailPanel}>
            {!selectedDate ? (
              <div style={styles.emptyDetail}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📅</div>
                <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>点击左侧日期查看当天饮食记录</p>
                <div style={styles.statsBox}>
                  <div style={styles.statItem}>
                    <div style={styles.statNum}>{records.length}</div>
                    <div style={styles.statLabel}>总记录数</div>
                  </div>
                  <div style={styles.statItem}>
                    <div style={styles.statNum}>{Object.keys(recordsByDate).length}</div>
                    <div style={styles.statLabel}>记录天数</div>
                  </div>
                </div>
              </div>
            ) : selectedMeals.length === 0 ? (
              <div style={styles.emptyDetail}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🍽️</div>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14 }}>{selectedDate}</p>
                <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, marginTop: 8 }}>这天没有饮食记录</p>
                <a href="/ai" style={styles.goAiSmallBtn}>去AI推荐菜谱</a>
              </div>
            ) : (
              <div>
                <h3 style={styles.detailTitle}>🍽️ {selectedDate} 的饮食记录</h3>
                <p style={styles.detailSubtitle}>共 {selectedMeals.length} 餐</p>
                {selectedMeals.map((meal) => (
                  <div key={meal.record_id} style={styles.mealCard}>
                    <div style={styles.mealCardHeader}>
                      <div style={styles.mealName}>🥘 {meal.recipe_name}</div>
                      <button
                        style={styles.deleteBtn}
                        onClick={() => handleDeleteRecord(meal.record_id)}
                      >删除</button>
                    </div>

                    {/* 食材 */}
                    <div style={styles.ingredientsRow}>
                      {meal.ingredients?.map((ing, i) => (
                        <span key={i} style={styles.ingredientTag}>{ing}</span>
                      ))}
                    </div>

                    {/* 做法折叠 */}
                    <button
                      style={styles.toggleBtn}
                      onClick={() => setExpandedRecord(expandedRecord === meal.record_id ? null : meal.record_id)}
                    >
                      {expandedRecord === meal.record_id ? "▲ 收起做法" : "▼ 查看做法"}
                    </button>

                    {expandedRecord === meal.record_id && meal.instructions && (
                      <div style={styles.instructions}>
                        {meal.instructions.split("\n").map((line, i) => (
                          <p key={i} style={{ margin: "4px 0", lineHeight: 1.6 }}>{line}</p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  bg: { minHeight: "100vh", background: "linear-gradient(160deg, #0f2027, #1a1a2e, #16213e)", fontFamily: "'Segoe UI', sans-serif", position: "relative", paddingBottom: 60 },
  blob1: { position: "fixed", width: 500, height: 500, borderRadius: "50%", background: "rgba(167,139,250,0.05)", top: -150, right: -100, filter: "blur(100px)", zIndex: 0 },
  blob2: { position: "fixed", width: 400, height: 400, borderRadius: "50%", background: "rgba(0,180,216,0.04)", bottom: -80, left: -80, filter: "blur(80px)", zIndex: 0 },
  nav: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 32px", borderBottom: "1px solid rgba(255,255,255,0.07)", position: "relative", zIndex: 2 },
  navLogo: { color: "#fff", fontWeight: 700, fontSize: 18 },
  navLinks: { display: "flex", gap: 24 },
  navLink: { color: "rgba(255,255,255,0.5)", textDecoration: "none", fontSize: 14, fontWeight: 500 },
  container: { maxWidth: 1100, margin: "0 auto", padding: "28px 24px", position: "relative", zIndex: 1 },
  pageHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 },
  title: { fontSize: 28, fontWeight: 800, color: "#fff", margin: 0 },
  subtitle: { fontSize: 14, color: "rgba(255,255,255,0.4)", margin: "6px 0 0" },
  goAiBtn: { padding: "10px 20px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #7c3aed, #4c1d95)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", textDecoration: "none" },
  mainLayout: { display: "flex", gap: 24, alignItems: "flex-start" },

  // 日历
  calendarCard: { width: 380, flexShrink: 0, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: 24 },
  monthNav: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  monthNavBtn: { width: 36, height: 36, borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  monthLabel: { color: "#fff", fontWeight: 700, fontSize: 16 },
  weekHeader: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 8 },
  weekDay: { textAlign: "center", color: "rgba(255,255,255,0.35)", fontSize: 12, fontWeight: 600, padding: "4px 0" },
  daysGrid: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 },
  dayCell: { aspectRatio: "1", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderRadius: 10, cursor: "pointer", border: "1px solid transparent", transition: "all 0.15s", padding: 2 },
  dayCellToday: { border: "1px solid rgba(0,180,216,0.5)", background: "rgba(0,180,216,0.08)" },
  dayCellSelected: { background: "rgba(167,139,250,0.8)", border: "1px solid #a78bfa" },
  dayCellHasMeal: { background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.2)" },
  dayNum: { fontSize: 13, color: "rgba(255,255,255,0.8)", fontWeight: 500 },
  mealDots: { display: "flex", gap: 2, marginTop: 2 },
  mealDot: { width: 4, height: 4, borderRadius: "50%" },
  legend: { display: "flex", gap: 16, marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.07)" },
  legendItem: { display: "flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.4)", fontSize: 12 },
  legendDot: { width: 8, height: 8, borderRadius: "50%" },
  loadingBox: { textAlign: "center", padding: 40, color: "rgba(255,255,255,0.4)", fontSize: 14 },

  // 详情面板
  detailPanel: { flex: 1, minWidth: 0 },
  emptyDetail: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, padding: 40, textAlign: "center" },
  statsBox: { display: "flex", gap: 24, justifyContent: "center", marginTop: 24 },
  statItem: { textAlign: "center" },
  statNum: { fontSize: 32, fontWeight: 800, color: "#a78bfa" },
  statLabel: { fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 4 },
  detailTitle: { fontSize: 18, fontWeight: 700, color: "#fff", margin: "0 0 4px" },
  detailSubtitle: { fontSize: 13, color: "rgba(255,255,255,0.4)", margin: "0 0 16px" },
  mealCard: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 20, marginBottom: 12 },
  mealCardHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  mealName: { fontSize: 16, fontWeight: 700, color: "#fff" },
  deleteBtn: { padding: "4px 12px", borderRadius: 6, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.1)", color: "#f87171", fontSize: 12, cursor: "pointer" },
  ingredientsRow: { display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  ingredientTag: { padding: "3px 10px", borderRadius: 20, background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.2)", color: "#c4b5fd", fontSize: 12 },
  toggleBtn: { padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.6)", fontSize: 12, cursor: "pointer", marginBottom: 8 },
  instructions: { background: "rgba(0,0,0,0.2)", borderRadius: 10, padding: "12px 16px", color: "rgba(255,255,255,0.7)", fontSize: 13 },
  goAiSmallBtn: { display: "inline-block", marginTop: 16, padding: "8px 18px", borderRadius: 10, background: "rgba(167,139,250,0.15)", border: "1px solid rgba(167,139,250,0.3)", color: "#a78bfa", fontSize: 13, textDecoration: "none" },
};
