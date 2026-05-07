import React, { useState } from 'react';

function App() {
  // --- 1. ステート定義 (すべてApp関数の直下で定義) ---
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [store, setStore] = useState("ロピア");
  const [stock, setStock] = useState("");
  const [mustUse, setMustUse] = useState("");
  const [fridgeList, setFridgeList] = useState([]);
  const [rejectedMenus, setRejectedMenus] = useState([]);
  const [volumeAdjustments, setVolumeAdjustments] = useState({}); // 分量調整を保持

  const API_URL = "https://shopping-app-8egl.onrender.com";

  // --- 2. 献立生成ロジック ---
  const generateMenu = async (isRetry = false) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/generate_menu`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store,
          stock: stock.split(",").map(s => s.trim()),
          must_use: mustUse,
          needs_lunch: [],
          use_bento: true,
          rejected_menus: isRetry ? rejectedMenus : [],
          volume_adjustments: volumeAdjustments // 分量調整データを送信
        })
      });
      
      const json = await res.json();
      if (!json || json.error) throw new Error(json?.message || json?.error || "生成失敗");

      const menuWithStatus = json.menu.map(m => ({ ...m, status: "OK" }));
      setData({ ...json, menu: menuWithStatus });
    } catch (e) {
      alert("エラー: " + e.message);
    }
    setLoading(false);
  };

  // --- 3. 操作ロジック ---
  const handleNG = (index) => {
    const rejectedName = data.menu[index].name;
    setRejectedMenus(prev => [...prev, rejectedName]);
    alert(`${rejectedName}を却下しました。再計算します。`);
    // rejectedMenusの更新を反映させるため、setTimeout等を使わず直接渡すか再生成
    setTimeout(() => generateMenu(true), 100); 
  };

  const adjustVolume = (index, type) => {
    const multiplier = type === 'next' ? 2.0 : 1.5;
    const newAdjustments = { ...volumeAdjustments, [index]: multiplier };
    setVolumeAdjustments(newAdjustments);
    
    const newMenu = [...data.menu];
    if (type === 'next' && index < 6) {
      newMenu[index + 1] = { ...newMenu[index], day: newMenu[index + 1].day };
    }
    setData({ ...data, menu: newMenu });
    
    alert("分量を計算し直します。");
    // 更新したadjustmentsを使って再計算
    setLoading(true);
    fetch(`${API_URL}/generate_menu`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        store,
        stock: stock.split(",").map(s => s.trim()),
        must_use: mustUse,
        needs_lunch: [],
        use_bento: true,
        rejected_menus: rejectedMenus,
        volume_adjustments: newAdjustments
      })
    }).then(res => res.json()).then(json => {
      const menuWithStatus = json.menu.map(m => ({ ...m, status: "OK" }));
      setData({ ...json, menu: menuWithStatus });
      setLoading(false);
    });
  };

  const handleCheckItem = (index) => {
    const item = data.shopping_list[index];
    setFridgeList(prev => [...prev, `${item.item} (${item.amount}${item.unit || ''})`]);
    const newList = data.shopping_list.filter((_, i) => i !== index);
    setData({ ...data, shopping_list: newList });
  };

  const cardStyle = { background: "white", borderRadius: "16px", padding: "16px", marginBottom: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" };

  return (
    <div style={{ background: "#f2f2f7", minHeight: "100vh", padding: "20px", fontFamily: "-apple-system, sans-serif" }}>
      <h1 style={{ fontWeight: "700" }}>献立くん Pro +</h1>

      {/* 設定 */}
      <div style={cardStyle}>
        <label style={{ fontWeight: "600" }}>🌟 必須食材</label>
        <input type="text" value={mustUse} onChange={(e) => setMustUse(e.target.value)} placeholder="例：たけのこ" style={{ width: "100%", padding: "12px", border: "1px solid #ccc", borderRadius: "8px", marginTop: "5px", boxSizing: "border-box" }} />
      </div>

      <button onClick={() => generateMenu(false)} disabled={loading} style={{ width: "100%", padding: "18px", borderRadius: "12px", background: "#007AFF", color: "white", fontSize: "18px", fontWeight: "700", border: "none", marginBottom: "20px", opacity: loading ? 0.6 : 1 }}>
        {loading ? "計算中..." : "献立とリストを作成"}
      </button>

      {data && (
        <>
          {/* スコア表示（3行制限） */}
          <div style={{ ...cardStyle, background: "#fff9c4" }}>
            <div style={{ fontWeight: "700" }}>📊 スコア: {data.score}/10</div>
            <div style={{ fontSize: "14px", whiteSpace: "pre-wrap", marginTop: "5px" }}>{data.usage_tips}</div>
          </div>

          {data.menu.map((m, i) => (
            <div key={i} style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>
                  <span style={{ color: "#8e8e93", fontSize: "12px" }}>{m.day}曜日</span>
                  <div style={{ fontSize: "18px", fontWeight: "700" }}>
                    <a href={m.recipe_url} target="_blank" rel="noreferrer" style={{ color: "#007AFF", textDecoration: "none" }}>{m.name} 🔗</a>
                  </div>
                </div>
                <button onClick={() => handleNG(i)} style={{ background: "#ff3b30", color: "white", border: "none", borderRadius: "12px", padding: "8px 12px" }}>NG</button>
              </div>
              
              <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                <button onClick={() => adjustVolume(i, 'next')} style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "1px solid #007AFF", background: "none", color: "#007AFF", fontSize: "12px" }}>翌日分も作る</button>
                <button onClick={() => adjustVolume(i, 'lunch')} style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "1px solid #34c759", background: "none", color: "#34c759", fontSize: "12px" }}>昼に回す</button>
              </div>
            </div>
          ))}

          <h2>🛒 買い物リスト</h2>
          <div style={cardStyle}>
            {data.shopping_list.map((item, i) => (
              <div key={i} style={{ padding: "10px 0", borderBottom: "1px solid #eee", display: "flex", alignItems: "center" }}>
                <input type="checkbox" onChange={() => handleCheckItem(i)} style={{ marginRight: "10px" }} />
                {item.item} : {item.amount}{item.unit}
              </div>
            ))}
          </div>

          <h2>❄️ 冷蔵庫にあるもの</h2>
          <div style={{ ...cardStyle, background: "#e1f5fe" }}>
            {fridgeList.map((f, i) => <div key={i}>✅ {f}</div>)}
          </div>
        </>
      )}
    </div>
  );
}

export default App;
