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

      {data?.stock?.length > 0 && (
        <div style={{ marginTop: "20px", background: "#ddd", padding: "10px" }}>
          <h4>冷蔵庫の在庫</h4>
          {data.stock.map((item, idx) => (
            <label key={`${item.item}-${idx}`} style={{ display: "block", padding: "5px 0", textDecoration: "line-through" }}>
              <input type="checkbox" checked onChange={() => moveItem(idx, true)} /> {item.item}: {item.amount}{item.unit}
            </label>
          ))}
        </div>
      )}

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
