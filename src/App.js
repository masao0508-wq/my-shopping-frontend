// --- menu表示部分の修正 ---
{data.menu.map((m, i) => (
  <div key={i} style={cardStyle}>
    <div style={{ fontSize: "12px", color: "#8e8e93" }}>{m.day}曜日 【{m.type}】</div>
    
    <div style={{ marginTop: "8px" }}>
      <div style={{ fontWeight: "700", color: "#333" }}>主菜：
        <a href={m.recipe_url} target="_blank" rel="noreferrer" style={{ color: "#007AFF" }}>{m.main}</a>
      </div>
      <div style={{ fontSize: "14px", color: "#555", marginTop: "4px" }}>副菜：{m.side}</div>
    </div>

    <div style={{ display: "flex", gap: "8px", marginTop: "12px", flexWrap: "wrap" }}>
      <button onClick={() => adjustVolume(i, 'next')} style={btnStyleBlue}>翌日分も作る</button>
      
      {/* 昼ごはんボタン：まだ追加されていない場合のみ表示 */}
      {(!volumeAdjustments[i] || volumeAdjustments[i] < 1.5) && (
        <button onClick={() => adjustVolume(i, 'lunch')} style={btnStyleGreen}>昼ごはん追加</button>
      )}
      
      <button onClick={() => handleNG(i)} style={btnStyleRed}>却下(NG)</button>
    </div>
  </div>
))}
