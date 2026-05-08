import React, { useState, useEffect } from 'react';

function App() {
  const [data, setData] = useState(null);
  const [baseShoppingList, setBaseShoppingList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [volumeAdjustments, setVolumeAdjustments] = useState({});

  const API_URL = "https://shopping-app-8egl.onrender.com";

  // 1週間の献立生成
  const generateFullMenu = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/generate_menu`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          store: "ロピア", 
          stock: [], 
          must_use: "", 
          use_bento: true,
          rejected_menus: [],
          volume_adjustments: {}
        })
      });
      const json = await res.json();
      
      if (json.error) {
        alert("AIエラー: " + json.message);
      } else if (json && json.menu && json.menu.length > 0) {
        setData(json);
        setBaseShoppingList(json.shopping_list || []);
        setVolumeAdjustments({});
      } else {
        alert("有効な献立データが受信できませんでした。");
      }
    } catch (e) {
      alert("ネットワークエラー: " + e.message);
    }
    setLoading(false);
  };

  // 分量の自動計算ロジック
  useEffect(() => {
    if (!data || !baseShoppingList || baseShoppingList.length === 0) return;

    const totalMultiplier = Object.values(volumeAdjustments).reduce((a, b) => a + (b - 1), 1);

    const updatedList = baseShoppingList.map(item => ({
      ...item,
      amount: typeof item.amount === 'number' 
        ? Math.round(item.amount * totalMultiplier * 10) / 10 
        : item.amount
    }));

    setData(prev => ({ ...prev, shopping_list: updatedList }));
  }, [volumeAdjustments, baseShoppingList]);

  // ボタン操作（即時反映）
  const handleVolumeChange = (dayIndex, mode) => {
    if (!data) return;
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
  };

  // NGボタン処理
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
          stock: data.stock || []
        })
      });
      const json = await res.json();
      
      if (json.error) throw new Error(json.message);
      
      const newMenu = [...data.menu];
      newMenu[dayIndex][type] = json.menu[0][type];
      
      setBaseShoppingList(json.shopping_list || []);
      setData(prev => ({ ...prev, menu: newMenu }));
    } catch (e) {
      alert("NG処理失敗: " + e.message);
    }
    setLoading(false);
  };

  const cardStyle = { background: "white", borderRadius: "16px", padding: "16px", marginBottom: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" };
  const ngBtnStyle = { background: "#fff5f5", color: "#ff3b30", border: "none", borderRadius: "6px", padding: "4px 8px", fontSize: "11px" };

  return (
    <div style={{ background: "#f2f2f7", minHeight: "100vh", padding: "20px", fontFamily: "-apple-system, sans-serif" }}>
      {loading && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(255,255,255,0.8)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
          <div style={{ border: "4px solid #f3f3f3", borderTop: "4px solid #007AFF", borderRadius: "50%", width: "40px", height: "40px", animation: "spin 1s linear infinite" }}></div>
          <p style={{ marginTop: "12px", color: "#007AFF", fontWeight: "bold" }}>Gemini 2.5が献立を生成中...</p>
        </div>
      )}
      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>

      <h1 style={{ textAlign: "center", fontSize: "22px" }}>献立くん Pro +</h1>

      <button onClick={generateFullMenu} style={{ width: "100%", padding: "16px", background: "#007AFF", color: "white", border: "none", borderRadius: "14px", fontWeight: "bold", marginBottom: "20px", fontSize: "16px" }}>
        1週間の献立を作成
      </button>

      {data && data.menu && data.menu.map((m, i) => (
        <div key={i} style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", color: "#8e8e93", fontSize: "12px" }}>
            <span>{m.day}曜日</span>
            <span>{m.type}</span>
          </div>
          <div style={{ marginTop: "10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
              <div onClick={() => setSelectedRecipe(m.main)} style={{ cursor: "pointer", flex: 1 }}>
                <div style={{ fontSize: "10px", color: "#007AFF" }}>主菜</div>
                <div style={{ fontSize: "17px", fontWeight: "bold" }}>{m.main.name}</div>
              </div>
              <button onClick={() => handleNG(i, 'main')} style={ngBtnStyle}>NG</button>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginTop: "12px", paddingLeft: "10px", borderLeft: "3px solid #34c759" }}>
              <div onClick={() => setSelectedRecipe(m.side)} style={{ cursor: "pointer", flex: 1 }}>
                <div style={{ fontSize: "10px", color: "#34c759" }}>副菜</div>
                <div style={{ fontSize: "15px" }}>{m.side.name}</div>
              </div>
              <button onClick={() => handleNG(i, 'side')} style={ngBtnStyle}>NG</button>
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px", marginTop: "18px" }}>
            <button onClick={() => handleVolumeChange(i, 'next')} style={{ flex: 1, padding: "10px", borderRadius: "10px", border: "1px solid #007AFF", color: "#007AFF", background: "white", fontSize: "11px" }}>翌日分も作る</button>
            <button onClick={() => handleVolumeChange(i, 'lunch')} style={{ flex: 1, padding: "10px", borderRadius: "10px", border: "1px solid #34c759", color: "#34c759", background: "white", fontSize: "11px" }}>昼ごはん追加</button>
          </div>
        </div>
      ))}

      {data && data.stock && data.stock.length > 0 && (
        <div style={{ ...cardStyle, border: "1px solid #34c759" }}>
          <h3 style={{ fontSize: "14px", color: "#34c759", margin: "0 0 8px 0" }}>🥦 冷蔵庫にあるもの</h3>
          <div style={{ fontSize: "13px" }}>{data.stock.join(' / ')}</div>
        </div>
      )}

      {data && data.shopping_list && (
        <div style={{ ...cardStyle, border: "2px solid #007AFF" }}>
          <h3 style={{ fontSize: "18px", margin: "0 0 10px 0" }}>🛒 買い物リスト</h3>
          {data.shopping_list.map((item, idx) => (
            <div key={idx} style={{ display: "flex", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f2f2f7" }}>
              <input type="checkbox" style={{ width: "20px", height: "20px", marginRight: "12px" }} />
              <span style={{ fontSize: "15px" }}>{item.item} : {item.amount}{item.unit}</span>
            </div>
          ))}
        </div>
      )}

      {selectedRecipe && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", zIndex: 10000 }} onClick={() => setSelectedRecipe(null)}>
          <div style={{ background: "white", padding: "25px", borderRadius: "24px", width: "100%", maxWidth: "450px" }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>{selectedRecipe.name}</h3>
            <div style={{ whiteSpace: "pre-wrap", fontSize: "14px", lineHeight: "1.6", maxHeight: "50vh", overflowY: "auto" }}>{selectedRecipe.recipe}</div>
            <button onClick={() => setSelectedRecipe(null)} style={{ width: "100%", padding: "12px", marginTop: "20px", background: "#007AFF", color: "white", border: "none", borderRadius: "10px" }}>閉じる</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
