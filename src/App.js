import React, { useState } from 'react';

function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [volumeAdjustments, setVolumeAdjustments] = useState({});

  const API_URL = "https://shopping-app-8egl.onrender.com";

  // --- 買い物リストの再計算のみを行う関数 ---
  const updateShoppingList = async (currentMenu, currentAdjustments) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/generate_menu`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          store: "ロピア",
          volume_adjustments: currentAdjustments,
          must_use: `現在の献立：${currentMenu.map(m => m.main.name).join(', ')} を維持して買い物リストの分量だけ再計算して`
        })
      });
      const json = await res.json();
      
      // 既存のデータを壊さず、買い物リストだけを最新に差し替える
      if (json.shopping_list) {
        setData(prev => ({
          ...prev,
          shopping_list: json.shopping_list
        }));
      }
    } catch (e) {
      console.error("Update failed", e);
    }
    setLoading(false);
  };

  // --- 初回生成 ---
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
      setVolumeAdjustments({});
    } catch (e) {
      alert("エラー: " + e.message);
    }
    setLoading(false);
  };

  // --- 分量変更（翌日分・昼ごはん） ---
  const handleVolumeChange = (dayIndex, mode) => {
    const newMenu = [...data.menu];
    const newAdjustments = { ...volumeAdjustments };
    
    if (mode === 'next') {
      if (dayIndex < 6) {
        newMenu[dayIndex + 1].main = { ...newMenu[dayIndex].main };
        newMenu[dayIndex + 1].type = "前日の残り";
      }
      newAdjustments[dayIndex] = 2.0;
    } else if (mode === 'lunch') {
      newAdjustments[dayIndex] = (newAdjustments[dayIndex] || 1.0) + 0.5;
    }

    setData({ ...data, menu: newMenu });
    setVolumeAdjustments(newAdjustments);
    updateShoppingList(newMenu, newAdjustments);
  };

  // --- NGボタン ---
  const handleNG = async (dayIndex, type) => {
    setLoading(true);
    const targetDish = data.menu[dayIndex][type].name;
    try {
      const res = await fetch(`${API_URL}/generate_menu`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store: "ロピア", rejected_menus: [targetDish] })
      });
      const json = await res.json();
      const newMenu = [...data.menu];
      newMenu[dayIndex][type] = json.menu[0][type];
      setData({ ...data, menu: newMenu });
      updateShoppingList(newMenu, volumeAdjustments);
    } catch (e) {
      alert("再計算に失敗しました");
      setLoading(false);
    }
  };

  const cardStyle = { background: "white", borderRadius: "16px", padding: "16px", marginBottom: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" };
  const ngBtnStyle = { background: "#fff5f5", color: "#ff3b30", border: "none", borderRadius: "6px", padding: "4px 8px", fontSize: "11px" };
  const spinnerStyle = { border: "4px solid #f3f3f3", borderTop: "4px solid #007AFF", borderRadius: "50%", width: "40px", height: "40px", animation: "spin 1s linear infinite" };

  return (
    <div style={{ background: "#f2f2f7", minHeight: "100vh", padding: "20px", fontFamily: "-apple-system, sans-serif" }}>
      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      
      {loading && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(255,255,255,0.8)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
          <div style={spinnerStyle}></div>
          <p style={{ marginTop: "12px", color: "#007AFF", fontWeight: "bold" }}>栄養バランスを計算中...</p>
        </div>
      )}

      <h1 style={{ textAlign: "center", fontSize: "22px" }}>献立くん Pro +</h1>

      <button onClick={generateFullMenu} style={{ width: "100%", padding: "16px", background: "#007AFF", color: "white", border: "none", borderRadius: "14px", fontWeight: "bold", marginBottom: "20px", fontSize: "16px" }}>
        1週間の献立を作成
      </button>

      {data && data.menu.map((m, i) => (
        <div key={i} style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", color: "#8e8e93", fontSize: "13px" }}>
            <span>{m.day}曜日</span>
            <span>{m.type}</span>
          </div>
          
          <div style={{ marginTop: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div onClick={() => setSelectedRecipe(m.main)} style={{ flex: 1, cursor: "pointer" }}>
                <div style={{ fontSize: "11px", color: "#007AFF" }}>主菜</div>
                <div style={{ fontSize: "17px", fontWeight: "bold" }}>{m.main.name}</div>
              </div>
              <button onClick={() => handleNG(i, 'main')} style={ngBtnStyle}>NG</button>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: "12px", paddingLeft: "10px", borderLeft: "3px solid #34c759" }}>
              <div onClick={() => setSelectedRecipe(m.side)} style={{ flex: 1, cursor: "pointer" }}>
                <div style={{ fontSize: "11px", color: "#34c759" }}>副菜</div>
                <div style={{ fontSize: "15px" }}>{m.side.name}</div>
              </div>
              <button onClick={() => handleNG(i, 'side')} style={ngBtnStyle}>NG</button>
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "18px" }}>
            <button onClick={() => handleVolumeChange(i, 'next')} style={{ flex: 1, padding: "10px", borderRadius: "10px", border: "1px solid #007AFF", color: "#007AFF", background: "white", fontSize: "12px" }}>翌日分も作る</button>
            <button onClick={() => handleVolumeChange(i, 'lunch')} style={{ flex: 1, padding: "10px", borderRadius: "10px", border: "1px solid #34c759", color: "#34c759", background: "white", fontSize: "12px" }}>昼ごはん追加</button>
          </div>
        </div>
      ))}

      {data && data.shopping_list && (
        <div style={{ ...cardStyle, border: "2px solid #007AFF" }}>
          <h2 style={{ fontSize: "18px" }}>🛒 買い物リスト</h2>
          {data.shopping_list.map((item, idx) => (
            <div key={idx} style={{ display: "flex", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f2f2f7" }}>
              <input type="checkbox" style={{ width: "22px", height: "22px", marginRight: "12px" }} />
              <span style={{ fontSize: "15px" }}>{item.item} : {item.amount}{item.unit}</span>
            </div>
          ))}
        </div>
      )}

      {/* レシピ表示モーダル */}
      {selectedRecipe && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", zIndex: 10000 }} onClick={() => setSelectedRecipe(null)}>
          <div style={{ background: "white", padding: "25px", borderRadius: "24px", width: "100%", maxWidth: "450px" }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>{selectedRecipe.name}</h3>
            <div style={{ whiteSpace: "pre-wrap", fontSize: "15px", lineHeight: "1.7", maxHeight: "50vh", overflowY: "auto" }}>
              {selectedRecipe.recipe}
            </div>
            <button onClick={() => setSelectedRecipe(null)} style={{ width: "100%", padding: "14px", marginTop: "20px", background: "#007AFF", color: "white", border: "none", borderRadius: "12px", fontWeight: "bold" }}>閉じる</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
