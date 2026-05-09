import React, { useState, useEffect } from 'react';

function App() {
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [baseShoppingList, setBaseShoppingList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("Kon-Date AI 計算中...");
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [volumeAdjustments, setVolumeAdjustments] = useState({});
  const [store, setStore] = useState("ロピア");
  const [rejectedMenus, setRejectedMenus] = useState([]);

  const API_URL = "https://shopping-app-8egl.onrender.com";

  useEffect(() => {
    document.title = "Kon-Date";
    const saved = localStorage.getItem('kon_date_final_v1');
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  const saveToHistory = (newData) => {
    if (!newData || !newData.id) return;
    setHistory(prev => {
      const updated = [newData, ...prev.filter(h => h.id !== newData.id)].slice(0, 10);
      localStorage.setItem('kon_date_final_v1', JSON.stringify(updated));
      return updated;
    });
  };

  useEffect(() => {
    if (!data || !baseShoppingList.length) return;
    const totalMultiplier = Object.values(volumeAdjustments).reduce((a, b) => a + (b - 1), 1);
    const updatedList = baseShoppingList.map(item => ({
      ...item,
      amount: typeof item.amount === 'number' ? Math.round(item.amount * totalMultiplier * 10) / 10 : item.amount
    }));
    setData(prev => ({ ...prev, shopping_list: updatedList }));
  }, [volumeAdjustments, baseShoppingList, data?.id]);

  const generateFullMenu = async (currentRejected = []) => {
    setLoading(true);
    setLoadingText("Kon-Date AI 計算中...");
    try {
      const res = await fetch(`${API_URL}/generate_menu`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store, stock: [], rejected_menus: currentRejected })
      });
      const json = await res.json();
      if (json && json.menu) {
        const newEntry = { ...json, id: Date.now(), timestamp: new Date().toLocaleString('ja-JP'), savedStore: store, stock: [] };
        setData(newEntry);
        setBaseShoppingList(json.shopping_list || []);
        setVolumeAdjustments({});
        saveToHistory(newEntry);
      }
    } catch (e) { alert("通信エラーが発生しました。"); }
    setLoading(false);
  };

  const syncWithAI = async (updatedMenu, updatedAdjustments, rejected = rejectedMenus) => {
    setLoading(true);
    setLoadingText("メニューを再計算中...");
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
      if (json && json.menu) {
        setBaseShoppingList(json.shopping_list || []);
        const updatedEntry = { ...json, menu: updatedMenu, id: data.id, timestamp: data.timestamp, savedStore: store, stock: data.stock || [] };
        setData(updatedEntry);
        setVolumeAdjustments(updatedAdjustments);
        saveToHistory(updatedEntry);
      }
    } catch (e) { alert("更新に失敗しました。"); }
    setLoading(false);
  };

  const handleVolumeChange = (idx, type) => {
    const newAdj = { ...volumeAdjustments };
    const newMenu = JSON.parse(JSON.stringify(data.menu));
    if (type === 'next') {
        newMenu[idx].isNextDayMade = true;
        if (idx < 6) {
            newMenu[idx+1].main = {...newMenu[idx].main};
            newMenu[idx+1].side = {...newMenu[idx].side};
            newMenu[idx+1].type = "前日の残り";
        }
        newAdj[idx] = (newAdj[idx] || 1) + 1.0;
    } else if (type === 'lunch') {
        newMenu[idx].showLunch = true;
        newAdj[idx] = (newAdj[idx] || 1) + 0.5;
    }
    syncWithAI(newMenu, newAdj);
  };

  const handleReject = (menuName) => {
    const newRejected = [...rejectedMenus, menuName];
    setRejectedMenus(newRejected);
    generateFullMenu(newRejected);
  };

  const moveItem = (index, fromStock) => {
    const newData = { ...data };
    if (fromStock) {
      const itemStr = newData.stock[index];
      const match = itemStr.match(/(.+) \(([\d.]+)(.+)\)/);
      const restored = match ? { item: match[1], amount: parseFloat(match[2]), unit: match[3] } : { item: itemStr, amount: 1, unit: "個" };
      setBaseShoppingList([...baseShoppingList, restored]);
      newData.stock = newData.stock.filter((_, i) => i !== index);
    } else {
      const item = data.shopping_list[index];
      newData.stock = [...(data.stock || []), `${item.item} (${item.amount}${item.unit})`];
      setBaseShoppingList(baseShoppingList.filter((_, i) => i !== index));
    }
    setData(newData);
    saveToHistory(newData);
  };

  return (
    <div style={{ background: "#f2f2f7", minHeight: "100vh", padding: "15px", fontFamily: "-apple-system, sans-serif" }}>
      <h1 style={{ textAlign: "center", color: "#FF3B30", fontWeight: "bold" }}>Kon-Date</h1>
      
      <button onClick={() => setShowHistory(!showHistory)} style={{ width: "100%", padding: "10px", background: "#8e8e93", color: "white", border: "none", borderRadius: "10px", marginBottom: "10px" }}>🕒 履歴を表示</button>

      {showHistory && (
        <div style={{ background: "white", borderRadius: "12px", padding: "10px", marginBottom: "15px" }}>
          {history.map(h => (
            <div key={h.id} onClick={() => { setData(h); setBaseShoppingList(h.shopping_list || []); setShowHistory(false); }} style={{ padding: "12px", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between" }}>
              <span>{h.timestamp}</span><span style={{ color: "#007AFF" }}>{h.savedStore} ＞</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: "8px", marginBottom: "15px" }}>
        {["ロピア", "業務スーパー"].map(s => (
          <button key={s} onClick={() => setStore(s)} style={{ flex: 1, padding: "12px", borderRadius: "10px", border: "none", background: store === s ? "#FF3B30" : "#ddd", color: "white", fontWeight: "bold" }}>{s}</button>
        ))}
      </div>

      <button onClick={() => generateFullMenu()} style={{ width: "100%", padding: "16px", background: "#34c759", color: "white", border: "none", borderRadius: "14px", fontWeight: "bold", fontSize: "16px" }}>1週間の献立を作成</button>

      {data?.usage_tips && <div style={{ marginTop: "15px", padding: "10px", background: "#fff", borderRadius: "10px", borderLeft: "5px solid #34c759", fontSize: "13px" }}>📝 AI診断: {data.usage_tips}</div>}

      {data?.menu?.map((m, i) => (
        <div key={i} style={{ background: "white", borderRadius: "15px", padding: "15px", marginTop: "12px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div style={{ fontSize: "12px", color: "#8e8e93" }}>{m.day}曜日 ({m.type})</div>
            <button onClick={() => handleReject(m.main.name)} style={{ background: "none", border: "none", color: "#FF3B30", fontSize: "12px" }}>✖ NG</button>
          </div>
          <div onClick={() => setSelectedRecipe(m.main)} style={{ fontWeight: "bold", fontSize: "16px", textDecoration: "underline", cursor: "pointer" }}>{m.main.name}</div>
          <div onClick={() => setSelectedRecipe(m.side)} style={{ fontSize: "14px", textDecoration: "underline", cursor: "pointer", color: "#3a3a3c" }}>{m.side.name}</div>
          {m.showLunch && <div style={{ color: "#007AFF", fontSize: "12px", marginTop: "5px" }}>🍱 昼: {m.lunch?.name}</div>}
          <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
            {i < 6 && <button onClick={() => handleVolumeChange(i, 'next')} style={{ flex: 1, fontSize: "10px", padding: "6px", borderRadius: "6px", border: "1px solid #007AFF", color: "#007AFF", background: "none" }}>翌日分も作る</button>}
            <button onClick={() => handleVolumeChange(i, 'lunch')} style={{ flex: 1, fontSize: "10px", padding: "6px", borderRadius: "6px", border: "1px solid #34c759", color: "#34c759", background: "none" }}>昼ごはん追加</button>
          </div>
        </div>
      ))}

      {data?.stock?.length > 0 && (
        <div style={{ marginTop: "20px", background: "#e5e5ea", padding: "15px", borderRadius: "15px" }}>
          <h3 style={{ margin: "0 0 10px 0", fontSize: "16px" }}>🥦 冷蔵庫の在庫（戻し機能付き）</h3>
          {data.stock.map((item, idx) => (
            <div key={idx} style={{ display: "flex", alignItems: "center", padding: "5px 0" }}>
              <input type="checkbox" checked readOnly onClick={() => moveItem(idx, true)} />
              <span style={{ marginLeft: "10px", fontSize: "14px", textDecoration: "line-through", color: "#8e8e93" }}>{item}</span>
            </div>
          ))}
        </div>
      )}

      {data?.shopping_list && (
        <div style={{ marginTop: "20px", background: "white", padding: "15px", borderRadius: "15px", border: "2px solid #007AFF" }}>
          <h3 style={{ margin: "0 0 10px 0", color: "#007AFF", fontSize: "16px" }}>🛒 買い物リスト ({store})</h3>
          {data.shopping_list.map((item, idx) => (
            <div key={idx} style={{ display: "flex", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f0f0f0" }}>
              <input type="checkbox" onChange={() => moveItem(idx, false)} style={{ width: "20px", height: "20px" }} />
              <span style={{ marginLeft: "10px", fontSize: "14px" }}>{item.item} : {item.amount}{item.unit}</span>
            </div>
          ))}
        </div>
      )}

      {selectedRecipe && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }} onClick={() => setSelectedRecipe(null)}>
          <div style={{ background: "white", padding: "20px", borderRadius: "20px", width: "85%", maxHeight: "80vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <h3>{selectedRecipe.name}</h3>
            <p style={{ whiteSpace: "pre-wrap", fontSize: "14px" }}>{selectedRecipe.recipe}</p>
            <button onClick={() => setSelectedRecipe(null)} style={{ width: "100%", padding: "12px", background: "#FF3B30", color: "white", border: "none", borderRadius: "10px", marginTop: "10px" }}>閉じる</button>
          </div>
        </div>
      )}

      {loading && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(255,255,255,0.9)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
          <div style={{ border: "4px solid #f3f3f3", borderTop: "4px solid #FF3B30", borderRadius: "50%", width: "40px", height: "40px", animation: "spin 1s linear infinite" }}></div>
          <p style={{ marginTop: "15px", color: "#FF3B30", fontWeight: "bold" }}>{loadingText}</p>
        </div>
      )}
      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default App;
