import React, { useState, useEffect } from 'react';

function App() {
  const [data, setData] = useState(null);
  const [baseShoppingList, setBaseShoppingList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [volumeAdjustments, setVolumeAdjustments] = useState({});
  const [store, setStore] = useState("ロピア"); // 店舗選択

  const API_URL = "https://shopping-app-8egl.onrender.com";

  const generateFullMenu = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/generate_menu`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store, stock: data?.stock || [], rejected_menus: [] })
      });
      const json = await res.json();
      if (json && json.menu) {
        setData(json);
        setBaseShoppingList(json.shopping_list || []);
        setVolumeAdjustments({});
      }
    } catch (e) { alert("エラー: " + e.message); }
    setLoading(false);
  };

  useEffect(() => {
    if (!data || !baseShoppingList.length) return;
    const totalMultiplier = Object.values(volumeAdjustments).reduce((a, b) => a + (b - 1), 1);
    const updatedList = baseShoppingList.map(item => ({
      ...item,
      amount: typeof item.amount === 'number' ? Math.round(item.amount * totalMultiplier * 10) / 10 : item.amount
    }));
    setData(prev => ({ ...prev, shopping_list: updatedList }));
  }, [volumeAdjustments, baseShoppingList]);

  const handleVolumeChange = (dayIndex, mode) => {
    if (!data) return;
    const newMenu = [...data.menu];
    const newAdjustments = { ...volumeAdjustments };
    if (mode === 'next') {
      if (dayIndex < 6) { newMenu[dayIndex + 1].main = { ...newMenu[dayIndex].main }; newMenu[dayIndex + 1].type = "前日の残り"; }
      newAdjustments[dayIndex] = (newAdjustments[dayIndex] || 1.0) + 1.0;
    } else if (mode === 'lunch') {
      newMenu[dayIndex].hasLunch = true;
      newAdjustments[dayIndex] = (newAdjustments[dayIndex] || 1.0) + 0.5;
    }
    setData({ ...data, menu: newMenu });
    setVolumeAdjustments(newAdjustments);
  };

  const moveToStock = (index) => {
    const item = data.shopping_list[index];
    const newShoppingList = data.shopping_list.filter((_, i) => i !== index);
    const newBaseList = baseShoppingList.filter((_, i) => i !== index);
    const newStock = [...(data.stock || []), `${item.item} (${item.amount}${item.unit})`];
    setBaseShoppingList(newBaseList);
    setData({ ...data, shopping_list: newShoppingList, stock: newStock });
  };

  const btnStyle = (active) => ({
    flex: 1, padding: "12px", borderRadius: "10px", border: "none",
    background: active ? "#007AFF" : "#e5e5ea", color: active ? "white" : "#8e8e93",
    fontWeight: "bold", cursor: "pointer", transition: "0.2s"
  });

  return (
    <div style={{ background: "#f2f2f7", minHeight: "100vh", padding: "20px", fontFamily: "-apple-system, sans-serif" }}>
      <h1 style={{ textAlign: "center", fontSize: "20px", marginBottom: "20px" }}>献立くん Pro +</h1>

      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <button onClick={() => setStore("ロピア")} style={btnStyle(store === "ロピア")}>ロピア</button>
        <button onClick={() => setStore("業務スーパー")} style={btnStyle(store === "業務スーパー")}>業務スーパー</button>
      </div>

      <button onClick={generateFullMenu} style={{ width: "100%", padding: "16px", background: "#34c759", color: "white", border: "none", borderRadius: "14px", fontWeight: "bold", fontSize: "16px", marginBottom: "20px" }}>
        {store}で1週間の献立を作成
      </button>

      {data?.menu?.map((m, i) => (
        <div key={i} style={{ background: "white", borderRadius: "16px", padding: "16px", marginBottom: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#8e8e93", marginBottom: "8px" }}>
            <span>{m.day}曜日</span><span style={{ color: "#ff9500" }}>{m.type}</span>
          </div>
          <div style={{ borderLeft: "4px solid #007AFF", paddingLeft: "12px", marginBottom: "12px" }}>
            <div style={{ fontSize: "11px", color: "#007AFF" }}>主菜</div>
            <div onClick={() => setSelectedRecipe(m.main)} style={{ fontSize: "16px", fontWeight: "bold", cursor: "pointer" }}>{m.main.name}</div>
          </div>
          {m.hasLunch && <div style={{ background: "#f0f9ff", padding: "8px", borderRadius: "8px", fontSize: "13px", marginBottom: "12px" }}>🍱 昼ごはん分を追加済</div>}
          <div style={{ borderLeft: "4px solid #34c759", paddingLeft: "12px", marginBottom: "12px" }}>
            <div style={{ fontSize: "11px", color: "#34c759" }}>副菜</div>
            <div onClick={() => setSelectedRecipe(m.side)} style={{ fontSize: "15px", cursor: "pointer" }}>{m.side.name}</div>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={() => handleVolumeChange(i, 'next')} style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "1px solid #007AFF", color: "#007AFF", background: "none", fontSize: "11px" }}>翌日分も</button>
            <button onClick={() => handleVolumeChange(i, 'lunch')} style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "1px solid #34c759", color: "#34c759", background: "none", fontSize: "11px" }}>昼ごはん</button>
          </div>
        </div>
      ))}

      {data && (
        <div style={{ background: "white", borderRadius: "16px", padding: "16px", border: "1px solid #34c759", marginBottom: "12px" }}>
          <h3 style={{ fontSize: "14px", color: "#34c759", margin: "0 0 8px 0" }}>🥦 冷蔵庫の在庫</h3>
          <div style={{ fontSize: "13px", color: "#444" }}>{data.stock?.join(' / ') || "なし"}</div>
        </div>
      )}

      {data?.shopping_list && (
        <div style={{ background: "white", borderRadius: "16px", padding: "16px", border: "2px solid #007AFF" }}>
          <h3 style={{ fontSize: "18px", marginBottom: "10px" }}>🛒 買い物リスト ({store})</h3>
          {data.shopping_list.map((item, idx) => (
            <div key={idx} style={{ display: "flex", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #eee" }}>
              <input type="checkbox" onChange={() => moveToStock(idx)} style={{ width: "20px", height: "20px", marginRight: "12px" }} />
              <span style={{ fontSize: "15px" }}>{item.item} : {item.amount}{item.unit}</span>
            </div>
          ))}
        </div>
      )}

      {selectedRecipe && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", zIndex: 10000 }} onClick={() => setSelectedRecipe(null)}>
          <div style={{ background: "white", padding: "25px", borderRadius: "24px", width: "100%", maxWidth: "450px" }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>{selectedRecipe.name}</h3>
            <div style={{ whiteSpace: "pre-wrap", fontSize: "14px", lineHeight: "1.6" }}>{selectedRecipe.recipe}</div>
            <button onClick={() => setSelectedRecipe(null)} style={{ width: "100%", padding: "12px", marginTop: "20px", background: "#007AFF", color: "white", border: "none", borderRadius: "10px" }}>閉じる</button>
          </div>
        </div>
      )}

      {loading && <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(255,255,255,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}><b>計算中...</b></div>}
    </div>
  );
}

export default App;
