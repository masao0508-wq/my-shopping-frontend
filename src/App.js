import React, { useState, useEffect } from 'react';

function App() {
  const [data, setData] = useState(null);
  const [baseShoppingList, setBaseShoppingList] = useState([]); // 基準となる分量を保存
  const [loading, setLoading] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [volumeAdjustments, setVolumeAdjustments] = useState({});

  const API_URL = "https://shopping-app-8egl.onrender.com";

  // --- 1. 初回生成（1週間の基本献立） ---
  const generateFullMenu = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/generate_menu`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store: "ロピア", stock: [], use_bento: true })
      });
      const json = await res.json();
      setData(json);
      setBaseShoppingList(json.shopping_list); // 基準リストを保存
      setVolumeAdjustments({});
    } catch (e) {
      alert("エラー: " + e.message);
    }
    setLoading(false);
  };

  // --- 2. アプリ側での分量計算ロジック ---
  useEffect(() => {
    if (!data || baseShoppingList.length === 0) return;

    // 全ての日の倍率を合計して平均的な係数を出す、または特定食材を狙い撃ちする
    // 今回はシンプルに「最大倍率」を適用するか、全体の合計倍率を算出
    const totalMultiplier = Object.values(volumeAdjustments).reduce((a, b) => a + (b - 1), 1);

    const updatedList = baseShoppingList.map(item => ({
      ...item,
      // 数値が含まれている場合のみ掛け算（「適量」などはそのまま）
      amount: typeof item.amount === 'number' ? Math.round(item.amount * totalMultiplier * 10) / 10 : item.amount
    }));

    setData(prev => ({ ...prev, shopping_list: updatedList }));
  }, [volumeAdjustments]);

  // --- 3. ボタン操作（通信なしで即時反映） ---
  const handleVolumeChange = (dayIndex, mode) => {
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
    // updateData 通信を呼ばずに useEffect で計算される
  };

  // --- 4. NGボタン（これだけは新しい料理案が必要なので通信する） ---
  const handleNG = async (dayIndex, type) => {
    setLoading(true);
    const targetDish = data.menu[dayIndex][type].name;
    try {
      const res = await fetch(`${API_URL}/generate_menu`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store: "ロピア", rejected_menus: [targetDish] })
      });
      const json = await res.json();
      
      const newMenu = [...data.menu];
      newMenu[dayIndex][type] = json.menu[0][type];
      
      // 新しい料理に合わせて買い物リストも一部差し替えが必要なため、ベースを更新
      setBaseShoppingList(json.shopping_list);
      setData(prev => ({ ...prev, menu: newMenu, shopping_list: json.shopping_list }));
    } catch (e) {
      alert("再計算に失敗しました");
    }
    setLoading(false);
  };

  // スタイル等は変更なし（前回のものを継続）
  const cardStyle = { background: "white", borderRadius: "16px", padding: "16px", marginBottom: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" };
  const ngBtnStyle = { background: "#fff5f5", color: "#ff3b30", border: "none", borderRadius: "6px", padding: "4px 8px", fontSize: "11px" };

  return (
    <div style={{ background: "#f2f2f7", minHeight: "100vh", padding: "20px", fontFamily: "-apple-system, sans-serif" }}>
      <h1 style={{ textAlign: "center", fontSize: "22px" }}>献立くん Pro +</h1>

      {loading && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(255,255,255,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
          <p>計算中...</p>
        </div>
      )}

      <button onClick={generateFullMenu} style={{ width: "100%", padding: "16px", background: "#007AFF", color: "white", border: "none", borderRadius: "14px", fontWeight: "bold", marginBottom: "20px" }}>
        1週間の献立を作成
      </button>

      {data && data.menu.map((m, i) => (
        <div key={i} style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", color: "#8e8e93", fontSize: "12px" }}>
            <span>{m.day}曜日</span>
            <span>{m.type}</span>
          </div>
          <div style={{ marginTop: "10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <b onClick={() => setSelectedRecipe(m.main)} style={{ cursor: "pointer", color: "#007AFF" }}>主菜: {m.main.name}</b>
              <button onClick={() => handleNG(i, 'main')} style={ngBtnStyle}>NG</button>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "10px" }}>
              <span onClick={() => setSelectedRecipe(m.side)} style={{ cursor: "pointer" }}>副菜: {m.side.name}</span>
              <button onClick={() => handleNG(i, 'side')} style={ngBtnStyle}>NG</button>
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px", marginTop: "15px" }}>
            <button onClick={() => handleVolumeChange(i, 'next')} style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "1px solid #007AFF", color: "#007AFF", background: "none", fontSize: "11px" }}>翌日分も作る</button>
            <button onClick={() => handleVolumeChange(i, 'lunch')} style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "1px solid #34c759", color: "#34c759", background: "none", fontSize: "11px" }}>昼ごはん追加</button>
          </div>
        </div>
      ))}

      {data && data.stock && (
        <div style={{ ...cardStyle, borderLeft: "5px solid #34c759" }}>
          <h3 style={{ fontSize: "14px", margin: 0 }}>🥦 冷蔵庫の在庫</h3>
          <div style={{ fontSize: "13px", marginTop: "5px" }}>{data.stock.join(' / ')}</div>
        </div>
      )}

      {data && data.shopping_list && (
        <div style={{ ...cardStyle, borderTop: "4px solid #007AFF" }}>
          <h3 style={{ fontSize: "16px" }}>🛒 買い物リスト</h3>
          {data.shopping_list.map((item, idx) => (
            <div key={idx} style={{ padding: "8px 0", borderBottom: "1px solid #eee", fontSize: "14px" }}>
              <input type="checkbox" style={{ marginRight: "10px" }} />
              {item.item} : {item.amount} {item.unit}
            </div>
          ))}
        </div>
      )}

      {/* レシピモーダル */}
      {selectedRecipe && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", zIndex: 10000 }} onClick={() => setSelectedRecipe(null)}>
          <div style={{ background: "white", padding: "20px", borderRadius: "16px", width: "100%", maxWidth: "400px" }} onClick={e => e.stopPropagation()}>
            <h4>{selectedRecipe.name}</h4>
            <p style={{ whiteSpace: "pre-wrap", fontSize: "14px" }}>{selectedRecipe.recipe}</p>
            <button onClick={() => setSelectedRecipe(null)} style={{ width: "100%", padding: "10px", background: "#007AFF", color: "white", border: "none", borderRadius: "8px" }}>閉じる</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
