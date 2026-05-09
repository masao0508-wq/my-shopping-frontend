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

  // 初期起動：履歴読み込み
  useEffect(() => {
    const saved = localStorage.getItem('menu_history');
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  // データ更新時に自動保存
  useEffect(() => {
    if (data && !loading && data.menu) {
      const timestamp = new Date().toLocaleString('ja-JP');
      // 同じ内容の重複保存を避けるため、簡易的なチェック
      setHistory(prev => {
        const newHist = [{ timestamp, ...data, savedStore: store, savedAdjustments: volumeAdjustments }, ...prev.filter(h => h.timestamp !== timestamp).slice(0, 9)];
        localStorage.setItem('menu_history', JSON.stringify(newHist));
        return newHist;
      });
    }
  }, [data]);

  // 分量計算 (翌日・昼ごはん倍率適用)
  useEffect(() => {
    if (!data || !baseShoppingList.length) return;
    const totalMultiplier = Object.values(volumeAdjustments).reduce((a, b) => a + (b - 1), 1);
    const updatedList = baseShoppingList.map(item => ({
      ...item,
      amount: typeof item.amount === 'number' ? Math.round(item.amount * totalMultiplier * 10) / 10 : item.amount
    }));
    setData(prev => ({ ...prev, shopping_list: updatedList }));
  }, [volumeAdjustments, baseShoppingList]);

  // AIと同期 (NG、翌日分、昼ごはんなど、構成が変わる時に買い物リストを再計算)
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
        setData({ ...json, menu: updatedMenu });
        setVolumeAdjustments(updatedAdjustments);
      }
    } catch (e) { alert("同期エラー: " + e.message); }
    setLoading(false);
  };

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
        setData(json);
        setBaseShoppingList(json.shopping_list || []);
        setVolumeAdjustments({});
      }
    } catch (e) { alert("生成失敗"); }
    setLoading(false);
  };

  const handleVolumeChange = (dayIndex, mode) => {
    if (!data) return;
    const newMenu = [...data.menu];
    const newAdjustments = { ...volumeAdjustments };
    if (mode === 'next') {
      if (dayIndex < 6) {
        newMenu[dayIndex + 1].main = { ...newMenu[dayIndex].main };
        newMenu[dayIndex + 1].side = { ...newMenu[dayIndex].side };
        newMenu[dayIndex + 1].type = "前日の残り";
      }
      newAdjustments[dayIndex] = (newAdjustments[dayIndex] || 1.0) + 1.0;
    } else if (mode === 'lunch') {
      newMenu[dayIndex].hasLunch = true;
      newAdjustments[dayIndex] = (newAdjustments[dayIndex] || 1.0) + 0.5;
    }
    syncWithAI(newMenu, newAdjustments);
  };

  const handleNG = (dayIndex, type) => {
    const targetDish = data.menu[dayIndex][type].name;
    syncWithAI(data.menu, volumeAdjustments, [targetDish]);
  };

  const moveItem = (index, fromStock) => {
    if (fromStock) {
      const itemStr = data.stock[index];
      const match = itemStr.match(/(.+) \(([\d.]+)(.+)\)/);
      const newItem = match ? { item: match[1], amount: parseFloat(match[2]), unit: match[3] } : { item: itemStr, amount: 1, unit: "個" };
      setBaseShoppingList([...baseShoppingList, newItem]);
      setData({ ...data, stock: data.stock.filter((_, i) => i !== index) });
    } else {
      const item = data.shopping_list[index];
      const newStock = [...(data.stock || []), `${item.item} (${item.amount}${item.unit})`];
      setBaseShoppingList(baseShoppingList.filter((_, i) => i !== index));
      setData({ ...data, shopping_list: data.shopping_list.filter((_, i) => i !== index), stock: newStock });
    }
  };

  const loadFromHistory = (item) => {
    setData(item);
    setBaseShoppingList(item.shopping_list || []);
    setStore(item.savedStore || "ロピア");
    setVolumeAdjustments(item.savedAdjustments || {});
    setShowHistory(false);
  };

  const cardStyle = { background: "white", borderRadius: "16px", padding: "16px", marginBottom: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" };

  return (
    <div style={{ background: "#f2f2f7", minHeight: "100vh", padding: "20px", fontFamily: "-apple-system, sans-serif" }}>
      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      <h1 style={{ textAlign: "center", fontSize: "20px", marginBottom: "20px" }}>献立くん Pro +</h1>

      {/* 履歴セクション */}
      <button onClick={() => setShowHistory(!showHistory)} style={{ width: "100%", padding: "10px", background: "#8e8e93", color: "white", border: "none", borderRadius: "10px", marginBottom: "15px", fontSize: "13px" }}>
        {showHistory ? "▲ 閉じる" : "🕒 過去の献立履歴を確認する"}
      </button>
      {showHistory && (
        <div style={{ background: "white", borderRadius: "12px", padding: "10px", marginBottom: "20px", boxShadow: "0 4px 10px rgba(0,0,0,0.1)" }}>
          {history.map((h, idx) => (
            <div key={idx} onClick={() => loadFromHistory(h)} style={{ padding: "12px", borderBottom: "1px solid #eee", fontSize: "13px", cursor: "pointer", display: "flex", justifyContent: "space-between" }}>
              <span>{h.timestamp}</span><span style={{ color: "#007AFF" }}>{h.savedStore} ＞</span>
            </div>
          ))}
          {history.length === 0 && <p style={{ fontSize: "12px", color: "#8e8e93", textAlign: "center" }}>履歴はありません</p>}
        </div>
      )}

      {/* メイン操作 */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <button onClick={() => setStore("ロピア")} style={{ flex: 1, padding: "12px", background: store === "ロピア" ? "#007AFF" : "#e5e5ea", color: store === "ロピア" ? "white" : "#8e8e93", border: "none", borderRadius: "10px", fontWeight: "bold" }}>ロピア</button>
        <button onClick={() => setStore("業務スーパー")} style={{ flex: 1, padding: "12px", background: store === "業務スーパー" ? "#007AFF" : "#e5e5ea", color: store === "業務スーパー" ? "white" : "#8e8e93", border: "none", borderRadius: "10px", fontWeight: "bold" }}>業務スーパー</button>
      </div>

      <button onClick={generateFullMenu} style={{ width: "100%", padding: "16px", background: "#34c759", color: "white", border: "none", borderRadius: "14px", fontWeight: "bold", fontSize: "16px", marginBottom: "20px" }}>
        1週間の献立を新規作成
      </button>

      {data?.usage_tips && (
        <div style={{ background: "#fff9db", padding: "12px", borderRadius: "12px", marginBottom: "15px", fontSize: "13px", border: "1px solid #ffeeba" }}>
          💡 <b>コツ:</b> {data.usage_tips} (満足度: {data.score}/10)
        </div>
      )}

      {data?.menu?.map((m, i) => (
        <div key={i} style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#8e8e93", marginBottom: "8px" }}>
            <span>{m.day}曜日</span><span style={{ color: "#ff9500" }}>{m.type}</span>
          </div>
          <div style={{ borderLeft: "4px solid #007AFF", paddingLeft: "12px", marginBottom: "10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "10px", color: "#007AFF" }}>主菜</span>
              <button onClick={() => handleNG(i, 'main')} style={{ background: "none", border: "1px solid #ff3b30", color: "#ff3b30", fontSize: "10px", borderRadius: "4px", padding: "2px 6px" }}>NG</button>
            </div>
            <div onClick={() => setSelectedRecipe(m.main)} style={{ fontSize: "16px", fontWeight: "bold", cursor: "pointer" }}>{m.main.name}</div>
          </div>
          {m.hasLunch && <div style={{ background: "#f0f9ff", padding: "6px", borderRadius: "8px", fontSize: "12px", color: "#007AFF", marginBottom: "10px" }}>🍱 昼ごはん分を追加済</div>}
          <div style={{ borderLeft: "4px solid #34c759", paddingLeft: "12px", marginBottom: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "10px", color: "#34c759" }}>副菜</span>
              <button onClick={() => handleNG(i, 'side')} style={{ background: "none", border: "1px solid #ff3b30", color: "#ff3b30", fontSize: "10px", borderRadius: "4px", padding: "2px 6px" }}>NG</button>
            </div>
            <div onClick={() => setSelectedRecipe(m.side)} style={{ fontSize: "15px", cursor: "pointer" }}>{m.side.name}</div>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={() => handleVolumeChange(i, 'next')} style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "1px solid #007AFF", color: "#007AFF", fontSize: "11px", background: "none" }}>翌日分も作る</button>
            <button onClick={() => handleVolumeChange(i, 'lunch')} style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "1px solid #34c759", color: "#34c759", fontSize: "11px", background: "none" }}>昼ごはん追加</button>
          </div>
        </div>
      ))}

      {/* 冷蔵庫在庫（双方向） */}
      <div style={{ ...cardStyle, border: "1px solid #34c759" }}>
        <h3 style={{ fontSize: "14px", color: "#34c759", margin: "0 0 10px 0" }}>🥦 在庫リスト (チェックで買い物に戻す)</h3>
        {data?.stock?.map((s, idx) => (
          <div key={idx} style={{ display: "flex", alignItems: "center", marginBottom: "6px" }}>
            <input type="checkbox" checked onChange={() => moveItem(idx, true)} style={{ width: "18px", height: "18px", marginRight: "10px" }} />
            <span style={{ fontSize: "13px" }}>{s}</span>
          </div>
        ))}
      </div>

      {/* 買い物リスト */}
      {data?.shopping_list?.length > 0 && (
        <div style={{ ...cardStyle, border: "2px solid #007AFF" }}>
          <h3 style={{ fontSize: "18px", marginBottom: "10px" }}>🛒 買い物リスト ({store})</h3>
          {data.shopping_list.map((item, idx) => (
            <div key={idx} style={{ display: "flex", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #eee" }}>
              <input type="checkbox" onChange={() => moveItem(idx, false)} style={{ width: "22px", height: "22px", marginRight: "12px" }} />
              <span style={{ fontSize: "15px" }}>{item.item} : {item.amount}{item.unit}</span>
            </div>
          ))}
        </div>
      )}

      {/* レシピ表示モーダル */}
      {selectedRecipe && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", zIndex: 10000 }} onClick={() => setSelectedRecipe(null)}>
          <div style={{ background: "white", padding: "25px", borderRadius: "24px", width: "100%", maxWidth: "450px" }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>{selectedRecipe.name}</h3>
            <div style={{ whiteSpace: "pre-wrap", fontSize: "14px", lineHeight: "1.7", maxHeight: "60vh", overflowY: "auto" }}>{selectedRecipe.recipe}</div>
            <button onClick={() => setSelectedRecipe(null)} style={{ width: "100%", padding: "12px", marginTop: "20px", background: "#007AFF", color: "white", border: "none", borderRadius: "10px" }}>閉じる</button>
          </div>
        </div>
      )}

      {loading && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(255,255,255,0.8)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
          <div style={{ border: "4px solid #f3f3f3", borderTop: "4px solid #34c759", borderRadius: "50%", width: "40px", height: "40px", animation: "spin 1s linear infinite" }}></div>
          <p style={{ marginTop: "10px", color: "#34c759", fontWeight: "bold" }}>AIが計算中...</p>
        </div>
      )}
    </div>
  );
}

export default App;
