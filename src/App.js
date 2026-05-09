import React, { useState, useEffect } from 'react';

function App() {
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [baseShoppingList, setBaseShoppingList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [volumeAdjustments, setVolumeAdjustments] = useState({});
  const [store, setStore] = useState("ロピア");

  const API_URL = "https://shopping-app-8egl.onrender.com";

  useEffect(() => {
    document.title = "Kon-Date";
    const saved = localStorage.getItem('kon_date_final');
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  // 履歴保存（重複防止）
  const saveToHistory = (newData) => {
    if (!newData || !newData.id) return;
    setHistory(prev => {
      if (prev.some(h => h.id === newData.id)) return prev;
      const updated = [newData, ...prev].slice(0, 10);
      localStorage.setItem('kon_date_final', JSON.stringify(updated));
      return updated;
    });
  };

  // 分量リアルタイム計算
  useEffect(() => {
    if (!data || !baseShoppingList.length) return;
    // 全ての日付の加算率を合計 (初期値は1.0x7日分のようなイメージではなく、各メニューの基本量を1とした時の追加分)
    const totalMultiplier = Object.values(volumeAdjustments).reduce((a, b) => a + (b - 1), 1);
    const updatedList = baseShoppingList.map(item => ({
      ...item,
      amount: typeof item.amount === 'number' ? Math.round(item.amount * totalMultiplier * 10) / 10 : item.amount
    }));
    setData(prev => ({ ...prev, shopping_list: updatedList }));
  }, [volumeAdjustments, baseShoppingList]);

  const generateFullMenu = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/generate_menu`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store, stock: [], rejected_menus: [] })
      });
      const json = await res.json();
      if (json.menu) {
        const newEntry = { ...json, id: Date.now(), timestamp: new Date().toLocaleString('ja-JP'), savedStore: store };
        setData(newEntry);
        setBaseShoppingList(json.shopping_list || []);
        setVolumeAdjustments({});
        saveToHistory(newEntry);
      }
    } catch (e) { alert("生成失敗"); }
    setLoading(false);
  };

  const syncWithAI = async (updatedMenu, updatedAdjustments, rejected = []) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/generate_menu`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store,
          stock: data?.stock || [],
          rejected_menus: rejected,
          current_menu_names: updatedMenu.map(m => ({ day: m.day, main: m.main.name, side: m.side.name }))
        })
      });
      const json = await res.json();
      if (json.menu) {
        setBaseShoppingList(json.shopping_list || []);
        const updatedEntry = { ...json, menu: updatedMenu, id: data.id, timestamp: data.timestamp, savedStore: store };
        setData(updatedEntry);
        setVolumeAdjustments(updatedAdjustments);
        setHistory(prev => prev.map(h => h.id === data.id ? updatedEntry : h));
      }
    } catch (e) { alert("更新失敗"); }
    setLoading(false);
  };

  const handleVolumeChange = (idx, type) => {
    const newAdj = { ...volumeAdjustments };
    const newMenu = [...data.menu];
    
    if (type === 'next') {
        newMenu[idx].isNextDayMade = true; // ボタン消去用フラグ
        if (idx < 6) {
            newMenu[idx+1].main = {...newMenu[idx].main};
            newMenu[idx+1].side = {...newMenu[idx].side};
            newMenu[idx+1].type = "前日の残り";
        }
        newAdj[idx] = (newAdj[idx] || 1) + 1.0; // 材料2倍
    } else if (type === 'lunch') {
        newMenu[idx].showLunch = true;
        newAdj[idx] = (newAdj[idx] || 1) + 0.5; // 材料1.5倍
    }
    
    // 分量が変わるのでAIと同期して買い物リストを再計算
    syncWithAI(newMenu, newAdj);
  };

  const moveItem = (index, fromStock) => {
    if (fromStock) {
      const itemStr = data.stock[index];
      const match = itemStr.match(/(.+) \(([\d.]+)(.+)\)/);
      const restored = match ? { item: match[1], amount: parseFloat(match[2]), unit: match[3] } : { item: itemStr, amount: 1, unit: "個" };
      setBaseShoppingList([...baseShoppingList, restored]);
      setData({ ...data, stock: data.stock.filter((_, i) => i !== index) });
    } else {
      const item = data.shopping_list[index];
      const newStock = [...(data.stock || []), `${item.item} (${item.amount}${item.unit})`];
      setBaseShoppingList(baseShoppingList.filter((_, i) => i !== index));
      setData({ ...data, stock: newStock });
    }
  };

  return (
    <div style={{ background: "#f2f2f7", minHeight: "100vh", padding: "15px", fontFamily: "-apple-system, sans-serif" }}>
      <h1 style={{ textAlign: "center", color: "#FF3B30", fontWeight: "900", letterSpacing: "-1px" }}>Kon-Date</h1>

      <button onClick={() => setShowHistory(!showHistory)} style={{ width: "100%", padding: "10px", background: "#8e8e93", color: "white", border: "none", borderRadius: "10px", marginBottom: "10px", fontSize: "13px" }}>
        {showHistory ? "▲ 履歴を閉じる" : "🕒 過去の献立履歴を呼び出す"}
      </button>

      {showHistory && (
        <div style={{ background: "white", borderRadius: "12px", padding: "10px", marginBottom: "15px", boxShadow: "0 4px 10px rgba(0,0,0,0.1)" }}>
          {history.map(h => (
            <div key={h.id} onClick={() => loadHistory(h)} style={{ padding: "12px", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
              <span>{h.timestamp}</span><span style={{ color: "#007AFF" }}>{h.savedStore} ＞</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: "8px", marginBottom: "15px" }}>
        {["ロピア", "業務スーパー"].map(s => (
          <button key={s} onClick={() => setStore(s)} style={{ flex: 1, padding: "12px", borderRadius: "10px", border: "none", background: store === s ? "#FF3B30" : "#ddd", color: store === s ? "white" : "#666", fontWeight: "bold" }}>{s}</button>
        ))}
      </div>

      <button onClick={generateFullMenu} style={{ width: "100%", padding: "16px", background: "#34c759", color: "white", border: "none", borderRadius: "14px", fontWeight: "bold", fontSize: "16px", marginBottom: "20px", boxShadow: "0 4px 12px rgba(52,199,89,0.3)" }}>
        1週間の献立を作成
      </button>

      {data?.usage_tips && (
        <div style={{ background: "#fff9db", padding: "12px", borderRadius: "10px", fontSize: "13px", marginBottom: "15px", border: "1px solid #ffeeba", lineHeight: "1.4" }}>
          🍎 <b>Kon-Date 診断 (Score: {data.score}):</b><br/>{data.usage_tips}
        </div>
      )}

      {data?.menu?.map((m, i) => (
        <div key={i} style={{ background: "white", borderRadius: "15px", padding: "15px", marginBottom: "12px", boxShadow: "0 2px 5px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize: "12px", color: "#8e8e93", display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            <span>{m.day}曜日</span><span style={{ color: "#ff9500", fontWeight: "bold" }}>{m.type}</span>
          </div>

          <div style={{ marginBottom: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "#007AFF", fontSize: "10px", fontWeight: "bold" }}>【主菜】</span>
              <button onClick={() => syncWithAI(data.menu, volumeAdjustments, [m.main.name])} style={{ background: "none", border: "none", color: "#ff3b30", fontSize: "11px" }}>NG</button>
            </div>
            <div onClick={() => setSelectedRecipe(m.main)} style={{ fontSize: "16px", fontWeight: "bold", cursor: "pointer", textDecoration: "underline", color: "#1c1c1e" }}>{m.main.name}</div>
          </div>

          <div style={{ marginBottom: m.showLunch ? "12px" : "0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "#34c759", fontSize: "10px", fontWeight: "bold" }}>【副菜】</span>
              <button onClick={() => syncWithAI(data.menu, volumeAdjustments, [m.side.name])} style={{ background: "none", border: "none", color: "#ff3b30", fontSize: "11px" }}>NG</button>
            </div>
            <div onClick={() => setSelectedRecipe(m.side)} style={{ fontSize: "14px", cursor: "pointer", textDecoration: "underline", color: "#3a3a3c" }}>{m.side.name}</div>
          </div>

          {m.showLunch && (
            <div style={{ marginTop: "10px", background: "#f0f9ff", padding: "10px", borderRadius: "10px", border: "1px solid #c7e7ff" }}>
              <span style={{ color: "#007AFF", fontSize: "10px", fontWeight: "bold" }}>🍱 昼ごはん分 (増量済)</span>
              <div onClick={() => setSelectedRecipe(m.lunch)} style={{ fontSize: "14px", fontWeight: "bold", cursor: "pointer", textDecoration: "underline" }}>{m.lunch?.name}</div>
            </div>
          )}

          <div style={{ display: "flex", gap: "8px", marginTop: "15px" }}>
            {!m.isNextDayMade && i < 6 && (
              <button onClick={() => handleVolumeChange(i, 'next')} style={{ flex: 1, fontSize: "11px", padding: "8px", borderRadius: "8px", border: "1px solid #007AFF", color: "#007AFF", background: "none", fontWeight: "600" }}>翌日分も作る</button>
            )}
            {!m.showLunch && (
              <button onClick={() => handleVolumeChange(i, 'lunch')} style={{ flex: 1, fontSize: "11px", padding: "8px", borderRadius: "8px", border: "1px solid #34c759", color: "#34c759", background: "none", fontWeight: "600" }}>昼ごはん追加</button>
            )}
          </div>
        </div>
      ))}

      <div style={{ background: "white", borderRadius: "15px", padding: "15px", border: "1px solid #34c759", marginBottom: "15px" }}>
        <h3 style={{ fontSize: "14px", color: "#34c759", margin: "0 0 10px 0" }}>🥦 冷蔵庫在庫 (チェックで買い物へ)</h3>
        {data?.stock?.map((s, idx) => (
          <div key={idx} style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
            <input type="checkbox" checked onChange={() => moveItem(idx, true)} style={{ width: "18px", height: "18px", marginRight: "10px" }} />
            <span style={{ fontSize: "13px", color: "#3a3a3c" }}>{s}</span>
          </div>
        ))}
        {(!data?.stock || data.stock.length === 0) && <p style={{ fontSize: "12px", color: "#8e8e93", textAlign: "center" }}>在庫はありません</p>}
      </div>

      {data?.shopping_list && (
        <div style={{ background: "white", borderRadius: "15px", padding: "15px", border: "2px solid #007AFF", marginBottom: "30px" }}>
          <h3 style={{ fontSize: "16px", marginBottom: "12px", color: "#007AFF" }}>🛒 買い物リスト ({store})</h3>
          {data.shopping_list.map((item, idx) => (
            <div key={idx} style={{ display: "flex", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #eee" }}>
              <input type="checkbox" onChange={() => moveItem(idx, false)} style={{ width: "22px", height: "22px", marginRight: "12px" }} />
              <span style={{ fontSize: "15px", fontWeight: "500" }}>{item.item} : {item.amount}{item.unit}</span>
            </div>
          ))}
        </div>
      )}

      {selectedRecipe && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3000 }} onClick={() => setSelectedRecipe(null)}>
          <div style={{ background: "white", padding: "20px", borderRadius: "24px", width: "90%", maxHeight: "80vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0, color: "#1c1c1e" }}>{selectedRecipe.name}</h3>
            <p style={{ whiteSpace: "pre-wrap", fontSize: "14px", lineHeight: "1.7", color: "#3a3a3c" }}>{selectedRecipe.recipe}</p>
            <button onClick={() => setSelectedRecipe(null)} style={{ width: "100%", padding: "14px", background: "#FF3B30", color: "white", border: "none", borderRadius: "12px", marginTop: "15px", fontWeight: "bold" }}>閉じる</button>
          </div>
        </div>
      )}

      {loading && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(255,255,255,0.9)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 4000 }}>
          <div style={{ border: "4px solid #f3f3f3", borderTop: "4px solid #FF3B30", borderRadius: "50%", width: "40px", height: "40px", animation: "spin 1s linear infinite" }}></div>
          <p style={{ marginTop: "15px", color: "#FF3B30", fontWeight: "bold" }}>Kon-Date AI 計算中...</p>
        </div>
      )}
      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default App;
