import React, { useState } from 'react';

function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [volumeAdjustments, setVolumeAdjustments] = useState({});
  const [rejectedMenus, setRejectedMenus] = useState([]);
  const [selectedRecipe, setSelectedRecipe] = useState(null); // レシピ表示用

  const API_URL = "https://shopping-app-8egl.onrender.com";

  // --- 献立生成ロジック ---
  const generateMenu = async (isRetry = false, currentAdjustments = null) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/generate_menu`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store: "ロピア", // 固定またはStateから
          stock: [], 
          must_use: "",
          use_bento: true,
          rejected_menus: rejectedMenus,
          volume_adjustments: currentAdjustments || volumeAdjustments
        })
      });
      const json = await res.json();
      if (json.error) throw new Error(json.message);
      setData(json);
    } catch (e) {
      alert("エラー: " + e.message);
    }
    setLoading(false);
  };

  // --- NGボタン（主菜・副菜別） ---
  const handleNG = (dishName) => {
    const newRejected = [...rejectedMenus, dishName];
    setRejectedMenus(newRejected);
    alert(`${dishName} を除外してバランスを考えた別メニューを再計算します。`);
    generateMenu(true); 
  };

  // --- 分量調整 ---
  const adjustVolume = (index, type) => {
    const multiplier = type === 'next' ? 2.0 : 1.5;
    const newAdjustments = { ...volumeAdjustments, [index]: multiplier };
    setVolumeAdjustments(newAdjustments);
    
    // 全体を書き換えず、AIに計算だけやり直させる
    generateMenu(true, newAdjustments);
  };

  const cardStyle = { background: "white", borderRadius: "16px", padding: "16px", marginBottom: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" };
  const ngBtnStyle = { background: "#fff5f5", color: "#ff3b30", border: "1px solid #ff3b30", borderRadius: "6px", padding: "2px 8px", fontSize: "11px", marginLeft: "8px" };

  return (
    <div style={{ background: "#f2f2f7", minHeight: "100vh", padding: "20px", fontFamily: "-apple-system, sans-serif" }}>
      <h1 style={{ textAlign: "center" }}>献立くん Pro +</h1>
      
      <button onClick={() => generateMenu(false)} disabled={loading} style={{ width: "100%", padding: "15px", background: "#007AFF", color: "white", border: "none", borderRadius: "12px", fontWeight: "bold", marginBottom: "20px" }}>
        {loading ? "計算中..." : "1週間の献立を作成"}
      </button>

      {data && data.menu && data.menu.map((m, i) => (
        <div key={i} style={cardStyle}>
          <div style={{ color: "#8e8e93", fontSize: "12px" }}>{m.day}曜日</div>
          
          {/* 主菜セクション */}
          <div style={{ marginTop: "10px" }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <b onClick={() => setSelectedRecipe(m.main)} style={{ color: "#007AFF", cursor: "pointer", fontSize: "17px" }}>主菜: {m.main.name}</b>
              <button onClick={() => handleNG(m.main.name)} style={ngBtnStyle}>NG</button>
            </div>
          </div>

          {/* 副菜セクション */}
          <div style={{ marginTop: "10px", paddingLeft: "10px", borderLeft: "3px solid #34c759" }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <span onClick={() => setSelectedRecipe(m.side)} style={{ cursor: "pointer", fontSize: "15px" }}>副菜: {m.side.name}</span>
              <button onClick={() => handleNG(m.side.name)} style={ngBtnStyle}>NG</button>
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px", marginTop: "15px" }}>
            <button onClick={() => adjustVolume(i, 'next')} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #007AFF", color: "#007AFF", background: "none" }}>翌日分も作る</button>
            <button onClick={() => adjustVolume(i, 'lunch')} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #34c759", color: "#34c759", background: "none" }}>昼ごはん追加</button>
          </div>
        </div>
      ))}

      {/* レシピ表示モーダル（簡易） */}
      {selectedRecipe && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", zIndex: 1000 }} onClick={() => setSelectedRecipe(null)}>
          <div style={{ background: "white", padding: "20px", borderRadius: "16px", maxWidth: "90%", maxHeight: "80%", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <h3>{selectedRecipe.name}</h3>
            <p style={{ whiteSpace: "pre-wrap", fontSize: "14px", lineHeight: "1.6" }}>{selectedRecipe.recipe}</p>
            <button onClick={() => setSelectedRecipe(null)} style={{ width: "100%", padding: "10px", marginTop: "10px", background: "#007AFF", color: "white", border: "none", borderRadius: "8px" }}>閉じる</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
