import React, { useState } from 'react';

function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  const API_URL = "https://shopping-app-8egl.onrender.com";

  // --- 1. 初期生成（全入れ替え） ---
  const generateFullMenu = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/generate_menu`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store: "ロピア", stock: [], must_use: "", use_bento: true })
      });
      const json = await res.json();
      setData(json);
    } catch (e) {
      alert("エラー: " + e.message);
    }
    setLoading(false);
  };

  // --- 2. 特定のメニューだけNGにする（その料理だけ差し替え） ---
  const handleNG = async (dayIndex, type) => {
    setLoading(true);
    const targetDish = data.menu[dayIndex][type].name;
    try {
      const res = await fetch(`${API_URL}/generate_menu`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          store: "ロピア", 
          rejected_menus: [targetDish],
          must_use: `現在の${type === 'main' ? '主菜' : '副菜'}「${targetDish}」に代わる、同系統の栄養バランスのメニューを1つ提案してください`
        })
      });
      const json = await res.json();
      const newDish = json.menu[0][type];
      
      // 他の日は変えずに、対象の料理だけ書き換える
      const newMenu = [...data.menu];
      newMenu[dayIndex][type] = newDish;
      setData({ ...data, menu: newMenu });
    } catch (e) {
      alert("再計算に失敗しました");
    }
    setLoading(false);
  };

  // --- 3. 翌日分も作る（その日の分量だけAIに再計算させる） ---
  const adjustVolume = async (dayIndex) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/generate_menu`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          store: "ロピア",
          volume_adjustments: { [dayIndex]: 2.0 }, // 翌日分＝2倍
          must_use: `${data.menu[dayIndex].main.name}の分量を2倍にして買い物リストを更新して`
        })
      });
      const json = await res.json();
      // 買い物リストのみを最新（更新された分量）に差し替え
      setData({ ...data, shopping_list: json.shopping_list });
      alert(`${data.menu[dayIndex].day}曜日の分量を2倍にして買い物リストを更新しました。`);
    } catch (e) {
      alert("更新に失敗しました");
    }
    setLoading(false);
  };

  const cardStyle = { background: "white", borderRadius: "16px", padding: "16px", marginBottom: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" };
  const ngBtnStyle = { background: "#fff5f5", color: "#ff3b30", border: "none", borderRadius: "6px", padding: "4px 8px", fontSize: "11px", marginLeft: "8px" };
  const spinnerStyle = { border: "4px solid #f3f3f3", borderTop: "4px solid #007AFF", borderRadius: "50%", width: "40px", height: "40px", animation: "spin 1s linear infinite" };

  return (
    <div style={{ background: "#f2f2f7", minHeight: "100vh", padding: "20px", fontFamily: "-apple-system, sans-serif" }}>
      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      
      <h1 style={{ textAlign: "center", fontSize: "20px" }}>献立くん Pro +</h1>

      {/* ローディングオーバーレイ */}
      {loading && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(255,255,255,0.7)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
          <div style={spinnerStyle}></div>
          <p style={{ marginTop: "10px", color: "#007AFF", fontWeight: "bold" }}>栄養バランスを計算中...</p>
        </div>
      )}

      <button onClick={generateFullMenu} style={{ width: "100%", padding: "16px", background: "#007AFF", color: "white", border: "none", borderRadius: "12px", fontWeight: "bold", marginBottom: "20px", fontSize: "16px" }}>
        1週間の献立を新規作成
      </button>

      {data && data.menu.map((m, i) => (
        <div key={i} style={cardStyle}>
          <div style={{ color: "#8e8e93", fontSize: "13px", fontWeight: "600" }}>{m.day}曜日</div>
          
          <div style={{ marginTop: "10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span onClick={() => setSelectedRecipe(m.main)} style={{ color: "#007AFF", fontSize: "17px", fontWeight: "bold", cursor: "pointer" }}>主菜: {m.main.name}</span>
              <button onClick={() => handleNG(i, 'main')} style={ngBtnStyle}>NG</button>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px", paddingLeft: "10px", borderLeft: "3px solid #34c759" }}>
              <span onClick={() => setSelectedRecipe(m.side)} style={{ fontSize: "15px", cursor: "pointer" }}>副菜: {m.side.name}</span>
              <button onClick={() => handleNG(i, 'side')} style={ngBtnStyle}>NG</button>
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
            <button onClick={() => adjustVolume(i)} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #007AFF", color: "#007AFF", background: "white", fontSize: "13px" }}>翌日分も作る</button>
          </div>
        </div>
      ))}

      {/* 買い物リストセクション */}
      {data && data.shopping_list && (
        <div style={{ ...cardStyle, marginTop: "20px", background: "#e5f1ff" }}>
          <h2 style={{ fontSize: "18px", marginBottom: "12px" }}>🛒 買い物リスト</h2>
          {data.shopping_list.map((item, idx) => (
            <div key={idx} style={{ display: "flex", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #d1d1d6" }}>
              <input type="checkbox" style={{ width: "20px", height: "20px", marginRight: "12px" }} />
              <span style={{ fontSize: "16px" }}>{item.item} ({item.amount}{item.unit})</span>
            </div>
          ))}
        </div>
      )}

      {/* レシピ表示モーダル */}
      {selectedRecipe && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", zIndex: 10000 }} onClick={() => setSelectedRecipe(null)}>
          <div style={{ background: "white", padding: "24px", borderRadius: "20px", width: "100%", maxWidth: "400px" }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>{selectedRecipe.name}</h3>
            <p style={{ whiteSpace: "pre-wrap", fontSize: "15px", lineHeight: "1.6", color: "#3a3a3c" }}>{selectedRecipe.recipe}</p>
            <button onClick={() => setSelectedRecipe(null)} style={{ width: "100%", padding: "12px", marginTop: "16px", background: "#007AFF", color: "white", border: "none", borderRadius: "10px" }}>閉じる</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
