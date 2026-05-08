import React, { useState } from 'react';

function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [store, setStore] = useState("ロピア");
  const [stock, setStock] = useState("");
  const [mustUse, setMustUse] = useState("");
  const [fridgeList, setFridgeList] = useState([]);
  const [rejectedMenus, setRejectedMenus] = useState([]);
  const [volumeAdjustments, setVolumeAdjustments] = useState({});

  const API_URL = "https://shopping-app-8egl.onrender.com";

  const generateMenu = async (isRetry = false, currentAdjustments = null) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/generate_menu`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store,
          stock: stock.split(",").map(s => s.trim()),
          must_use: mustUse,
          use_bento: true,
          rejected_menus: isRetry ? rejectedMenus : [],
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

  const adjustVolume = (index, type) => {
    const multiplier = type === 'next' ? 2.0 : 1.5;
    const newAdjustments = { ...volumeAdjustments, [index]: multiplier };
    setVolumeAdjustments(newAdjustments);
    
    // UIを先行して書き換え
    if (type === 'next' && index < 6) {
      const newMenu = [...data.menu];
      newMenu[index + 1] = { ...newMenu[index], day: newMenu[index + 1].day };
      setData({ ...data, menu: newMenu });
    }
    
    // 分量を反映して再取得
    generateMenu(true, newAdjustments);
  };

  const handleCheckItem = (index) => {
    const item = data.shopping_list[index];
    setFridgeList(prev => [...prev, `${item.item} (${item.amount}${item.unit})`]);
    const newList = data.shopping_list.filter((_, i) => i !== index);
    setData({ ...data, shopping_list: newList });
  };

  const cardStyle = { background: "white", borderRadius: "16px", padding: "16px", marginBottom: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" };
  const btnStyle = { padding: "8px 12px", borderRadius: "8px", border: "none", fontSize: "12px", cursor: "pointer" };

  return (
    <div style={{ background: "#f2f2f7", minHeight: "100vh", padding: "20px", fontFamily: "-apple-system, sans-serif" }}>
      <h1 style={{ textAlign: "center", color: "#1c1c1e" }}>献立くん Pro +</h1>
      
      <div style={cardStyle}>
        <div style={{ marginBottom: "10px" }}>
          <label>🏠 スーパー: </label>
          <select value={store} onChange={(e) => setStore(e.target.value)}>
            <option value="ロピア">ロピア</option>
            <option value="業務スーパー">業務スーパー</option>
          </select>
        </div>
        <input type="text" value={mustUse} onChange={(e) => setMustUse(e.target.value)} placeholder="必須食材（例：たけのこ）" style={{ width: "100%", padding: "10px", boxSizing: "border-box" }} />
        <button onClick={() => generateMenu(false)} disabled={loading} style={{ width: "100%", marginTop: "10px", padding: "15px", background: "#007AFF", color: "white", border: "none", borderRadius: "10px", fontWeight: "bold" }}>
          {loading ? "計算中..." : "献立を作成"}
        </button>
      </div>

      {data && (
        <>
          <div style={{ ...cardStyle, background: "#fff9c4", fontSize: "14px", whiteSpace: "pre-wrap" }}>
            <b>💡 スコア: {data.score}</b><br />{data.usage_tips}
          </div>

          {data.menu.map((m, i) => (
            <div key={i} style={cardStyle}>
              <div style={{ color: "#8e8e93", fontSize: "12px" }}>{m.day}曜日 【{m.type}】</div>
              <div style={{ fontWeight: "bold", margin: "5px 0" }}>主菜: <a href={m.recipe_url} target="_blank" rel="noreferrer">{m.main}</a></div>
              <div style={{ color: "#444" }}>副菜: {m.side}</div>
              <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                <button onClick={() => adjustVolume(i, 'next')} style={{ ...btnStyle, background: "#e5f1ff", color: "#007AFF" }}>翌日分も作る</button>
                <button onClick={() => adjustVolume(i, 'lunch')} style={{ ...btnStyle, background: "#e8f5e9", color: "#2e7d32" }}>昼ごはん追加</button>
              </div>
            </div>
          ))}

          <h3>🛒 買い物リスト</h3>
          <div style={cardStyle}>
            {data.shopping_list.map((item, i) => (
              <div key={i} style={{ borderBottom: "1px solid #eee", padding: "8px 0" }}>
                <input type="checkbox" onChange={() => handleCheckItem(i)} /> {item.item}: {item.amount}{item.unit}
              </div>
            ))}
          </div>
          
          <h3>❄️ 冷蔵庫にあるもの</h3>
          <div style={{ ...cardStyle, color: "#666" }}>
            {fridgeList.map((f, i) => <div key={i}>✅ {f}</div>)}
          </div>
        </>
      )}
    </div>
  );
}

export default App; // これが重要！
