// --- menu表示ループ部分の修正 ---
{data.menu && data.menu.map((m, i) => (
  <div key={i} style={cardStyle}>
    {/* キー名が 'main' になっていることを確認して表示 */}
    <div style={{ color: "#8e8e93", fontSize: "12px" }}>{m.day}曜日 【{m.type || '献立'}】</div>
    
    <div style={{ marginTop: "8px" }}>
      <div style={{ fontWeight: "700", color: "#1c1c1e", fontSize: "17px" }}>
        主菜：
        {/* レシピリンク。m.main または m.name どちらでも動くようガード */}
        <a href={m.recipe_url} target="_blank" rel="noreferrer" style={{ color: "#007AFF", textDecoration: "none" }}>
          {m.main || m.name} 🔗
        </a>
      </div>
      {/* 副菜の表示 */}
      <div style={{ fontSize: "14px", color: "#3a3a3c", marginTop: "4px", paddingLeft: "10px", borderLeft: "3px solid #34c759" }}>
        副菜：{m.side || "（お好みで）"}
      </div>
    </div>

    <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
      <button onClick={() => adjustVolume(i, 'next')} style={{ ...btnStyle, background: "#e5f1ff", color: "#007AFF", flex: 1 }}>翌日分も作る</button>
      <button onClick={() => adjustVolume(i, 'lunch')} style={{ ...btnStyle, background: "#e8f5e9", color: "#2e7d32", flex: 1 }}>昼ごはん追加</button>
      <button onClick={() => handleNG(i)} style={{ ...btnStyle, background: "#fff5f5", color: "#ff3b30" }}>NG</button>
    </div>
  </div>
))}
