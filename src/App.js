import React, { useState } from 'react';

function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [store, setStore] = useState("ロピア");
  const [stock, setStock] = useState("");
  const [needsLunch, setNeedsLunch] = useState([]);

  const API_URL = "https://shopping-app-8egl.onrender.com";

  const toggleLunch = (index) => {
    setNeedsLunch(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const generateMenu = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/generate_menu`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store: store,
          stock: stock.split(",").map(s => s.trim()),
          needs_lunch: needsLunch,
          use_bento: true
        })
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      // 各メニューに初期状態として status="OK" を付与
      const menuWithStatus = json.menu.map(m => ({ ...m, status: "OK" }));
      setData({ ...json, menu: menuWithStatus });
    } catch (e) {
      alert("エラー: " + e.message);
    }
    setLoading(false);
  };

  const toggleStatus = (index) => {
    const newMenu = [...data.menu];
    newMenu[index].status = newMenu[index].status === "OK" ? "NG" : "OK";
    setData({ ...data, menu: newMenu });
  };

  const cardStyle = {
    background: "white", borderRadius: "16px", padding: "16px", marginBottom: "12px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
  };

  return (
    <div style={{ background: "#f2f2f7", minHeight: "100vh", padding: "20px", fontFamily: "-apple-system, sans-serif", color: "#1c1c1e" }}>
      <h1 style={{ fontSize: "28px", fontWeight: "700", marginBottom: "20px" }}>献立くん Pro</h1>

      {/* 設定エリア */}
      <div style={cardStyle}>
        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", fontWeight: "600", marginBottom: "5px" }}>買い物先</label>
          <div style={{ display: "flex", gap: "10px" }}>
            {["ロピア", "業務スーパー"].map(s => (
              <button key={s} onClick={() => setStore(s)} style={{
                flex: 1, padding: "10px", borderRadius: "8px", border: "none",
                background: store === s ? "#007AFF" : "#e5e5ea", color: store === s ? "white" : "#3a3a3c"
              }}>{s}</button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", fontWeight: "600", marginBottom: "5px" }}>冷蔵庫にあるもの (カンマ区切り)</label>
          <input type="text" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="豚肉, キャベツ..." 
            style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #c6c6c8", boxSizing: "border-box" }} />
        </div>

        <div>
          <label style={{ display: "block", fontWeight: "600", marginBottom: "5px" }}>昼ごはんが必要な日</label>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            {["月", "火", "水", "木", "金", "土", "日"].map((d, i) => (
              <button key={d} onClick={() => toggleLunch(i)} style={{
                width: "40px", height: "40px", borderRadius: "20px", border: "none",
                background: needsLunch.includes(i) ? "#34c759" : "#e5e5ea", color: needsLunch.includes(i) ? "white" : "#3a3a3c"
              }}>{d}</button>
            ))}
          </div>
        </div>
      </div>

      <button onClick={generateMenu} disabled={loading} style={{
        width: "100%", padding: "18px", borderRadius: "12px", background: "#007AFF",
        color: "white", fontSize: "18px", fontWeight: "700", border: "none", marginBottom: "20px", opacity: loading ? 0.6 : 1
      }}>
        {loading ? "AIが4人分を計算中..." : "献立とリストを作成"}
      </button>

      {data && (
        <>
          <div style={{ ...cardStyle, background: "#fff9c4" }}>
            <div style={{ fontWeight: "700", fontSize: "18px" }}>📊 スコア: {data.score}/10</div>
            <div style={{ fontSize: "14px", marginTop: "5px", color: "#555" }}>💡 {data.usage_tips}</div>
          </div>

          <h2 style={{ fontSize: "20px", fontWeight: "700", margin: "20px 0 10px" }}>1週間の献立（奥様チェック用）</h2>
          {data.menu.map((m, i) => (
            <div key={i} style={{ ...cardStyle, borderLeft: m.status === "NG" ? "8px solid #ff3b30" : "8px solid #34c759" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <span style={{ fontSize: "14px", color: "#8e8e93" }}>{m.day}曜日 {m.is_easy && "✨手抜き"}</span>
                  <div style={{ fontSize: "18px", fontWeight: "700" }}>{m.name}</div>
                  {m.lunch && <div style={{ fontSize: "14px", color: "#007AFF" }}>昼: {m.lunch}</div>}
                </div>
                <button onClick={() => toggleStatus(i)} style={{
                  padding: "8px 16px", borderRadius: "20px", border: "none",
                  background: m.status === "OK" ? "#34c759" : "#ff3b30", color: "white", fontWeight: "600"
                }}>{m.status}</button>
              </div>
              <div style={{ marginTop: "10px", fontSize: "13px", color: "#48484a", background: "#f8f8f8", padding: "8px", borderRadius: "8px" }}>
                🍱 <b>弁当:</b> {m.bento_tip}<br/>
                🍖 <b>10代向け:</b> {m.volume_tip}
              </div>
            </div>
          ))}

          <h2 style={{ fontSize: "20px", fontWeight: "700", margin: "20px 0 10px" }}>🛒 買い物チェックリスト (4人分)</h2>
          <div style={cardStyle}>
            {data.shopping_list.map((item, i) => (
              <div key={i} style={{ padding: "10px 0", borderBottom: "1px solid #e5e5ea", display: "flex", justifyContent: "space-between" }}>
                <span>{item.item}</span>
                <span style={{ fontWeight: "600" }}>{item.amount}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default App;
