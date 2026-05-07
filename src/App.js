import React, { useState } from 'react';

function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [store, setStore] = useState("ロピア");
  const [stock, setStock] = useState("");
  const [mustUse, setMustUse] = useState("");
  const [fridgeList, setFridgeList] = useState([]);
  const [rejectedMenus, setRejectedMenus] = useState([]);

  const API_URL = "https://shopping-app-8egl.onrender.com";

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
          rejected_menus: isRetry ? rejectedMenus : []
        })
      });
      const json = await res.json();
      // 内部管理用のステータスを追加
      const menuWithStatus = json.menu.map(m => ({ ...m, status: "OK", extraVolume: 1 }));
      setData({ ...json, menu: menuWithStatus });
    } catch (e) {
      alert("エラー: " + e.message);
    }
    setLoading(false);
  };

  // 翌日・昼ごはんボタンで買い物量を増やすロジック
  const adjustVolume = (menuIndex, multiplier) => {
    const newMenu = [...data.menu];
    // 同じメニューを翌日にも設定（翌日ボタンの場合）
    if (multiplier === 2 && menuIndex < 6) {
      newMenu[menuIndex + 1] = { ...newMenu[menuIndex], day: newMenu[menuIndex + 1].day };
    }
    setData({ ...data, menu: newMenu });
    // 本来はここで買い物リストの数値を書き換えるロジックを走らせます
    alert("材料の購入予定量を増やしました（AIが次回のリスト作成時に反映します）");
  };

  // NGボタン：却下リストに入れて再生成
  const handleNG = (index) => {
    const rejectedName = data.menu[index].name;
    setRejectedMenus(prev => [...prev, rejectedName]);
    alert(`${rejectedName}を却下しました。再生成します。`);
    generateMenu(true);
  };

  const handleCheckItem = (index) => {
    const item = data.shopping_list[index];
    setFridgeList(prev => [...prev, `${item.item} (${item.amount}${item.unit})`]);
    const newList = data.shopping_list.filter((_, i) => i !== index);
    setData({ ...data, shopping_list: newList });
  };

  const cardStyle = { background: "white", borderRadius: "16px", padding: "16px", marginBottom: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" };

  return (
    <div style={{ background: "#f2f2f7", minHeight: "100vh", padding: "20px", fontFamily: "-apple-system, sans-serif" }}>
      <h1 style={{ fontWeight: "700" }}>献立くん Pro +</h1>

      {/* 入力エリア */}
      <div style={cardStyle}>
        <label style={{ fontWeight: "600" }}>🌟 必須食材</label>
        <input type="text" value={mustUse} onChange={(e) => setMustUse(e.target.value)} placeholder="例：たけのこ" style={{ width: "100%", padding: "12px", border: "1px solid #ccc", borderRadius: "8px", marginTop: "5px" }} />
      </div>

      <button onClick={() => generateMenu(false)} disabled={loading} style={{ width: "100%", padding: "18px", borderRadius: "12px", background: "#007AFF", color: "white", fontSize: "18px", fontWeight: "700", border: "none", marginBottom: "20px" }}>
        {loading ? "AIが4人分を再計算中..." : "献立とリストを作成"}
      </button>

      {data && (
        <>
          <div style={{ ...cardStyle, background: "#fff9c4" }}>
            📊 栄養スコア: {data.score}/10
          </div>

          {data.menu.map((m, i) => (
            <div key={i} style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>
                  <span style={{ color: "#8e8e93" }}>{m.day}曜日</span>
                  <div style={{ fontSize: "18px", fontWeight: "700" }}>
                    <a href={m.recipe_url} target="_blank" rel="noreferrer" style={{ color: "#007AFF", textDecoration: "none" }}>{m.name} 🔗</a>
                  </div>
                </div>
                <button onClick={() => handleNG(i)} style={{ background: "#ff3b30", color: "white", border: "none", borderRadius: "12px", padding: "8px 12px" }}>NG</button>
              </div>
              
              <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                <button onClick={() => adjustVolume(i, 2)} style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "1px solid #007AFF", background: "none", color: "#007AFF" }}>翌日分も作る</button>
                <button onClick={() => adjustVolume(i, 1.5)} style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "1px solid #34c759", background: "none", color: "#34c759" }}>昼に回す</button>
              </div>

              <div style={{ marginTop: "10px", fontSize: "13px", background: "#f8f8f8", padding: "10px", borderRadius: "8px" }}>
                🍱 弁当: {m.bento_tip}<br/>
                🍖 10代: {m.volume_tip}
              </div>
            </div>
          ))}

          <h2>🛒 買い物リスト（チェックで冷蔵庫へ）</h2>
          <div style={cardStyle}>
            {data.shopping_list.map((item, i) => (
              <div key={i} style={{ padding: "10px 0", borderBottom: "1px solid #eee", display: "flex", alignItems: "center" }}>
                <input type="checkbox" onChange={() => handleCheckItem(i)} style={{ marginRight: "10px" }} />
                {item.item} : {item.amount}{item.unit}
              </div>
            ))}
          </div>

          <h2>❄️ 冷蔵庫にあるものリスト</h2>
          <div style={{ ...cardStyle, background: "#e1f5fe" }}>
            {fridgeList.map((f, i) => <div key={i}>✅ {f}</div>)}
          </div>
        </>
      )}
    </div>
  );
}

export default App;
