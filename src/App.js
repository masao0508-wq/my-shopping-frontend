import React, { useEffect, useMemo, useState } from 'react';

const API_URL = "https://shopping-app-8egl.onrender.com";
const STORAGE_KEY = "kon_date_stable_v101";

const roundAmount = (value) => Math.round(Number(value || 0) * 10) / 10;

const toNumber = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(String(value ?? "").replace(/[^\d.]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeName = (name) => String(name || "").trim();

const parseIngredientsFromRecipe = (recipe = "") => {
  if (typeof recipe !== "string") return [];

  return recipe
    .split("\n")
    .map((line) => {
      const match = line.match(/^\s*[-・]?\s*([^:：\d]+?)\s*[:：]?\s*([\d.]+)\s*([^\s、,。]*)/);
      if (!match) return null;

      const item = normalizeName(match[1]);
      const amount = toNumber(match[2]);
      const unit = normalizeName(match[3]);
      if (!item || amount <= 0) return null;
      return { item, amount, unit };
    })
    .filter(Boolean);
};

const normalizeIngredients = (recipeObj) => {
  if (!recipeObj) return [];
  const explicit = Array.isArray(recipeObj.ingredients) ? recipeObj.ingredients : [];
  const parsed = explicit.length > 0 ? explicit : parseIngredientsFromRecipe(recipeObj.recipe);

  return parsed
    .map((ing) => ({
      item: normalizeName(ing.item || ing.name),
      amount: toNumber(ing.amount),
      unit: normalizeName(ing.unit),
    }))
    .filter((ing) => ing.item && ing.amount > 0);
};

const getDinnerIngredients = (menuDay) => [
  ...normalizeIngredients(menuDay?.main),
  ...normalizeIngredients(menuDay?.side),
];

const getLunchIngredients = (menuDay) => normalizeIngredients(menuDay?.lunch);

const normalizeShoppingItem = (item) => ({
  item: normalizeName(item?.item || item?.name),
  amount: roundAmount(toNumber(item?.amount)),
  unit: normalizeName(item?.unit),
});

const mergeShoppingItems = (items) => {
  const map = new Map();

  items.forEach((raw) => {
    const item = normalizeShoppingItem(raw);
    if (!item.item || item.amount <= 0) return;
    const key = `${item.item}__${item.unit}`;
    const current = map.get(key) || { ...item, amount: 0 };
    current.amount = roundAmount(current.amount + item.amount);
    map.set(key, current);
  });

  return Array.from(map.values());
};

const applyIngredients = (shoppingList, ingredients, multiplier) => {
  const map = new Map(
    mergeShoppingItems(shoppingList).map((item) => [`${item.item}__${item.unit}`, item])
  );

  normalizeIngredients({ ingredients }).forEach((ing) => {
    const key = `${ing.item}__${ing.unit}`;
    const current = map.get(key) || { item: ing.item, amount: 0, unit: ing.unit };
    current.amount = roundAmount(Math.max(0, current.amount + ing.amount * multiplier));

    if (current.amount > 0) {
      map.set(key, current);
    } else {
      map.delete(key);
    }
  });

  return Array.from(map.values()).sort((a, b) => a.item.localeCompare(b.item, "ja"));
};

const normalizeStockItem = (item) => {
  if (typeof item === "string") {
    const match = item.match(/^(.*?)\s*\((.*?)\)$/);
    const amountUnit = String(match?.[2] || "");
    const amountMatch = amountUnit.match(/^([\d.]+)\s*(.*)$/);
    return {
      item: normalizeName(match?.[1] || item),
      amount: amountMatch ? toNumber(amountMatch[1]) : "",
      unit: normalizeName(amountMatch ? amountMatch[2] : amountUnit),
    };
  }
  return normalizeShoppingItem(item);
};

const normalizeEntry = (json, store) => {
  const menu = Array.isArray(json?.menu) ? json.menu : [];
  const shoppingList = mergeShoppingItems(Array.isArray(json?.shopping_list) ? json.shopping_list : []);

  return {
    ...json,
    menu: menu.map((day) => ({
      ...day,
      main: day.main || { name: "主菜未設定", recipe: "" },
      side: day.side || { name: "副菜未設定", recipe: "" },
      lunch: day.lunch || { name: "昼食未設定", recipe: "" },
    })),
    shopping_list: shoppingList,
    stock: Array.isArray(json?.stock) ? json.stock.map(normalizeStockItem) : [],
    id: json?.id || Date.now(),
    timestamp: json?.timestamp || new Date().toLocaleString(),
    savedStore: json?.savedStore || store,
  };
};

function App() {
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [store, setStore] = useState("ロピア");
  const [rejectedMenus, setRejectedMenus] = useState([]);
  const [error, setError] = useState("");
  const [requiredIngredients, setRequiredIngredients] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setHistory(JSON.parse(saved));
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const saveToHistory = (newData) => {
    if (!newData?.id) return;
    setHistory((prev) => {
      const updated = [newData, ...prev.filter((h) => h.id !== newData.id)].slice(0, 10);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const generateFullMenu = async (currentRejected = []) => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/generate_menu`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store,
          rejected_menus: currentRejected,
          required_ingredients: requiredIngredients
            .split(/[、,\n]/)
            .map((item) => item.trim())
            .filter(Boolean),
        }),
      });

      const responseText = await res.text();
      let body;
      try {
        body = responseText ? JSON.parse(responseText) : {};
      } catch {
        body = responseText;
      }

      if (!res.ok) {
        const detail = typeof body === "object" ? body?.detail || body?.error : body;
        throw new Error(detail || `API error: ${res.status}`);
      }

      const json = typeof body === "string" ? JSON.parse(body) : body;
      if (json?.error) throw new Error(json.error);
      if (!Array.isArray(json?.menu)) throw new Error("献立データの形式が不正です。");

      const newEntry = normalizeEntry(json, store);
      setData(newEntry);
      saveToHistory(newEntry);
    } catch (e) {
      setError(e?.message || "データ取得に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  const handleVolumeChange = (idx, type) => {
    setData((current) => {
      if (!current?.menu?.[idx]) return current;

      const nextData = structuredClone(current);
      const target = nextData.menu[idx];

      try {
        if (type === "next") {
          if (idx >= nextData.menu.length - 1 || target.isNextDayMade) return current;

          const originalNext = nextData.menu[idx + 1].replacedOriginal || nextData.menu[idx + 1];
          if (originalNext.type !== "前日の残り") {
            nextData.shopping_list = applyIngredients(nextData.shopping_list, getDinnerIngredients(originalNext), -1);
            if (originalNext.showLunch) {
              nextData.shopping_list = applyIngredients(nextData.shopping_list, getLunchIngredients(originalNext), -0.5);
            }
          }

          nextData.shopping_list = applyIngredients(nextData.shopping_list, getDinnerIngredients(target), 1);
          target.isNextDayMade = true;
          nextData.menu[idx + 1] = {
            ...target,
            day: nextData.menu[idx + 1].day,
            type: "前日の残り",
            showLunch: false,
            isNextDayMade: false,
            replacedOriginal: originalNext,
          };
        }

        if (type === "lunch") {
          if (target.showLunch) return current;
          target.showLunch = true;
          nextData.shopping_list = applyIngredients(nextData.shopping_list, getLunchIngredients(target), 0.5);
        }

        saveToHistory(nextData);
        return nextData;
      } catch (e) {
        setError("数量計算に失敗しました。献立表示は維持しています。");
        return current;
      }
    });
  };

  const moveItem = (index, fromStock) => {
    setData((current) => {
      if (!current) return current;
      const nextData = structuredClone(current);

      if (fromStock) {
        const item = normalizeStockItem(nextData.stock[index]);
        nextData.shopping_list = mergeShoppingItems([...nextData.shopping_list, item]);
        nextData.stock.splice(index, 1);
      } else {
        const item = normalizeShoppingItem(nextData.shopping_list[index]);
        nextData.stock.push(item);
        nextData.shopping_list.splice(index, 1);
      }

      saveToHistory(nextData);
      return nextData;
    });
  };

  const rejectMenu = (menuName) => {
    const next = [...new Set([...rejectedMenus, menuName].filter(Boolean))];
    setRejectedMenus(next);
    generateFullMenu(next);
  };

  const usageTips = useMemo(() => {
    const text = String(data?.usage_tips || "");
    return text.split("\n").filter(Boolean).slice(0, 3);
  }, [data]);

  return (
    <div style={{ background: "#f2f2f7", minHeight: "100vh", padding: "15px", fontFamily: "sans-serif" }}>
      <h1 style={{ textAlign: "center", color: "#FF3B30" }}>Kon-Date</h1>
      <button onClick={() => setShowHistory(!showHistory)} style={{ width: "100%", padding: "10px", marginBottom: "10px" }}>履歴</button>

      {showHistory && history.map((h) => (
        <div key={h.id} onClick={() => { setData(normalizeEntry(h, h.savedStore || store)); setShowHistory(false); }} style={{ padding: "10px", background: "#fff", marginBottom: "5px" }}>
          {h.timestamp} - {h.savedStore}
        </div>
      ))}

      <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
        {["ロピア", "業務スーパー"].map((s) => (
          <button key={s} onClick={() => setStore(s)} style={{ flex: 1, padding: "10px", background: store === s ? "#FF3B30" : "#ccc", color: store === s ? "#fff" : "#111" }}>
            {s}
          </button>
        ))}
      </div>

      <div style={{ marginBottom: "10px", background: "#fff", padding: "12px", borderRadius: "8px" }}>
        <label style={{ display: "block", fontWeight: "bold", marginBottom: "6px" }}>必須食材</label>
        <textarea
          value={requiredIngredients}
          onChange={(e) => setRequiredIngredients(e.target.value)}
          placeholder="例: タケノコ、白菜、豚こま"
          rows={2}
          style={{ width: "100%", boxSizing: "border-box", padding: "8px", resize: "vertical" }}
        />
      </div>

      <button onClick={() => generateFullMenu()} disabled={loading} style={{ width: "100%", padding: "15px", background: "#34c759", color: "#fff", fontWeight: "bold" }}>
        1週間の献立を作成
      </button>

      {error && <div style={{ marginTop: "10px", padding: "10px", background: "#fff3cd", color: "#8a5a00" }}>{error}</div>}

      {usageTips.length > 0 && (
        <div style={{ marginTop: "12px", background: "#fff", padding: "12px", borderRadius: "8px" }}>
          <strong>AI診断</strong>
          {usageTips.map((line, idx) => <div key={idx}>{line}</div>)}
        </div>
      )}

      {data?.menu?.map((m, i) => (
        <div key={`${m.day}-${i}`} style={{ background: "#fff", padding: "15px", marginTop: "10px", borderRadius: "10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
            <span>{m.day} ({m.type})</span>
            <button onClick={() => rejectMenu(m.main?.name)} style={{ color: "#FF3B30" }}>NG</button>
          </div>

          <div onClick={() => setSelectedRecipe(m.main)} style={{ fontWeight: "bold", cursor: "pointer", textDecoration: "underline" }}>
            主菜: {m.main?.name || "未設定"}
          </div>
          <div onClick={() => setSelectedRecipe(m.side)} style={{ fontSize: "14px", cursor: "pointer", color: "#666", textDecoration: "underline" }}>
            副菜: {m.side?.name || "未設定"}
          </div>
          {m.showLunch && <div onClick={() => setSelectedRecipe(m.lunch)} style={{ color: "#007AFF", fontSize: "12px", cursor: "pointer", textDecoration: "underline" }}>昼: {m.lunch?.name || "未設定"}</div>}

          <div style={{ display: "flex", gap: "5px", marginTop: "10px" }}>
            {i < 6 && m.type !== "前日の残り" && !m.isNextDayMade && (
              <button onClick={() => handleVolumeChange(i, "next")} style={{ flex: 1, fontSize: "11px" }}>翌日分も作る</button>
            )}
            {!m.showLunch && (
              <button onClick={() => handleVolumeChange(i, "lunch")} style={{ flex: 1, fontSize: "11px" }}>昼ごはん追加</button>
            )}
          </div>
        </div>
      ))}

      <div style={{ marginTop: "20px", background: "#ddd", padding: "10px" }}>
        <h4>冷蔵庫の在庫</h4>
        {data?.stock?.length > 0 ? (
          data.stock.map((item, idx) => (
            <label key={`${item.item}-${idx}`} style={{ display: "block", padding: "5px 0", textDecoration: "line-through" }}>
              <input type="checkbox" checked onChange={() => moveItem(idx, true)} /> {item.item}: {item.amount}{item.unit}
            </label>
          ))
        ) : (
          <div style={{ color: "#666", fontSize: "14px" }}>買い物リストでチェックした食材がここに移動します。</div>
        )}
      </div>

      {data?.shopping_list && (
        <div style={{ marginTop: "20px", background: "#fff", padding: "15px", border: "2px solid #007AFF" }}>
          <h4>買い物リスト ({data.savedStore || store})</h4>
          {data.shopping_list.map((item, idx) => (
            <label key={`${item.item}-${item.unit}-${idx}`} style={{ display: "block", padding: "5px 0", borderBottom: "1px solid #eee" }}>
              <input type="checkbox" checked={false} onChange={() => moveItem(idx, false)} /> {item.item}: {item.amount}{item.unit}
            </label>
          ))}
        </div>
      )}

      {selectedRecipe && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={() => setSelectedRecipe(null)}>
          <div style={{ background: "#fff", padding: "20px", width: "100%", maxWidth: "560px", maxHeight: "80vh", overflow: "auto", borderRadius: "10px" }} onClick={(e) => e.stopPropagation()}>
            <h3>{selectedRecipe.name}</h3>
            <p style={{ whiteSpace: "pre-wrap" }}>{selectedRecipe.recipe}</p>
            <button onClick={() => setSelectedRecipe(null)} style={{ width: "100%", padding: "10px" }}>閉じる</button>
          </div>
        </div>
      )}

      {loading && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(255,255,255,0.8)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p>Kon-Date AI 計算中...</p>
        </div>
      )}
    </div>
  );
}

export default App;
