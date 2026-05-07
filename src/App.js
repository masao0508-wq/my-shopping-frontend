import React, { useState } from 'react';

function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [store, setStore] = useState("ロピア");
  const [stock, setStock] = useState("");
  const [mustUse, setMustUse] = useState(""); // 必須食材
  const [needsLunch, setNeedsLunch] = useState([]);
  const [fridgeList, setFridgeList] = useState([]); // 冷蔵庫にあるものリスト

  const API_URL = "https://shopping-app-8egl.onrender.com";

  const generateMenu = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/generate_menu`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store,
          stock: stock.split(",").map(s => s.trim()),
          must_use: mustUse,
          needs_lunch: needsLunch,
          use_bento: true
        })
      });
      const json = await res.json();
      const menuWithStatus = json.menu.map(m => ({ ...m, status: "OK", isNextDay: false, isLunchTarget: false }));
      setData({ ...json, menu: menuWithStatus });
    } catch (e) {
      alert("エラー: " + e.message);
    }
    setLoading(false);
  };

  // 買い物完了（チェック）時に冷蔵庫へ移動
  const handleCheckItem = (index) => {
    const item = data.shopping_list[index];
    setFridgeList(prev => [...prev, `${item.item} (${item.amount})`]);
    const newList = data.shopping_list.filter((_, i) => i !== index);
    setData({ ...data, shopping_list: newList });
  };

  const cardStyle = {
    background: "white", borderRadius: "16px", padding: "16px", marginBottom: "12px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
  };

  const btnSmall = { padding: "4px 8px", fontSize: "12px", borderRadius: "6px", border: "1px solid #007AFF", background: "none", color: "#007AFF", cursor: "pointer" };

  return (
    <div style={{ background: "#f2f2f7", minHeight: "100vh", padding: "20px", fontFamily: "-apple-system, sans-serif" }}>
      <h1>献立くん Pro +</h1>

      <div style={cardStyle}>
        {/* 必須食材入力 */}
        <div style={{ marginBottom: "15px" }}>
          <label style={{ fontWeight: "600" }}>🌟 必須食材（たけのこ等）</label>
          <input type="text" value={mustUse} onChange={(e) => setMustUse(e.target.value)} placeholder="大量消費したい食材..." 
            style={{ width: "100%", padding: "10px", marginTop: "5px", borderRadius: "8px", border: "1px solid #c6c6c8" }} />
        </div>
        {/* ...（買い物先・在庫入力は維持）... */}
        <div style={{ marginBottom: "15px" }}>
          <label style={{ fontWeight: "600" }}>在庫食材</label>
          <input type="text" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="豚肉, キャベツ..." 
            style={{ width: "100%", padding: "10px", marginTop: "5px", borderRadius: "8px", border: "1px solid #c6c6c8" }} />
        </div>
      </div>

      <button onClick={generateMenu} disabled={loading} style={{ width: "100%", padding: "15px", borderRadius: "12px", background: "#007AFF", color: "white", fontWeight: "700", border: "none", marginBottom: "20px" }}>
        {loading ? "AIが計算中..." : "献立を作成"}
      </button>

      {data && (
        <>
          <h2>献立（奥様チェック）</h2>
          {data.menu.map((m, i) => (
            <div key={i} style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontWeight: "700" }}>{m.day}曜日: {m.name}</div>
                  <div style={{ display: "flex", gap: "5px", marginTop: "5px" }}>
                    <button style={btnSmall}>翌日分も作る</button>
                    <button style={btnSmall}>昼ごはんに回す</button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          <h2>🛒 買い物チェックリスト</h2>
          <div style={cardStyle}>
            {data.shopping_list.map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #eee" }}>
                <input type="checkbox" onChange={() => handleCheckItem(i)} style={{ marginRight: "10px", transform: "scale(1.2)" }} />
                <span>{item.item} - {item.amount}</span>
              </div>
            ))}
          </div>

          <h2>❄️ 冷蔵庫にあるものリスト</h2>
          <div style={{ ...cardStyle, background: "#e1f5fe" }}>
            {fridgeList.length > 0 ? fridgeList.map((f, i) => <div key={i}>✅ {f}</div>) : "空っぽです"}
          </div>
        </>
      )}
    </div>
  );
}

export default App;
