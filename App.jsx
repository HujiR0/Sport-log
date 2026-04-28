import { useState, useEffect, useRef } from "react";

const SETTINGS_KEY = "sports_notebook_settings";
const STORAGE_KEY  = "sports_notebook_entries";
const TRAINING_KEY = "sports_notebook_training";

const SPORTS_LIST = [
  { id:"lacrosse",    name:"ラクロス",         emoji:"🥍" },
  { id:"kickboxing",  name:"キックボクシング",   emoji:"🥊" },
  { id:"baseball",   name:"野球",              emoji:"⚾" },
  { id:"soccer",     name:"サッカー",           emoji:"⚽" },
  { id:"basketball", name:"バスケットボール",   emoji:"🏀" },
  { id:"volleyball", name:"バレーボール",       emoji:"🏐" },
  { id:"tennis",     name:"テニス",             emoji:"🎾" },
  { id:"badminton",  name:"バドミントン",       emoji:"🏸" },
  { id:"swimming",   name:"水泳",              emoji:"🏊" },
  { id:"track",      name:"陸上",              emoji:"🏃" },
  { id:"judo",       name:"柔道",              emoji:"🥋" },
  { id:"kendo",      name:"剣道",              emoji:"⚔️" },
  { id:"rugby",      name:"ラグビー",           emoji:"🏉" },
  { id:"golf",       name:"ゴルフ",             emoji:"⛳" },
  { id:"gymnastics", name:"体操",              emoji:"🤸" },
];

const SPORT_COLORS = {
  lacrosse:"#38bdf8", kickboxing:"#f87171", baseball:"#fb923c",
  soccer:"#4ade80", basketball:"#facc15", volleyball:"#c084fc",
  tennis:"#34d399", badminton:"#60a5fa", swimming:"#22d3ee",
  track:"#f472b6", judo:"#a78bfa", kendo:"#94a3b8",
  rugby:"#fb7185", golf:"#86efac", gymnastics:"#fda4af", custom:"#e2e8f0",
};

const CONDITION_EMOJI = ["😵","😔","😐","😊","🔥"];
const MENTAL_EMOJI    = ["💀","😟","😶","😤","🧠✨"];

// ピックアップできる項目定義
const PICKUP_FIELDS = [
  { id:"reflection", label:"振り返り",     emoji:"📝", color:"#818cf8" },
  { id:"good",       label:"よかった点",   emoji:"✅", color:"#4ade80" },
  { id:"improve",    label:"改善点",       emoji:"🔧", color:"#f87171" },
  { id:"goals",      label:"目標",         emoji:"🎯", color:"#facc15" },
  { id:"weight",     label:"体重",         emoji:"⚖️", color:"#38bdf8" },
  { id:"meals",      label:"食事・カロリー",emoji:"🍽", color:"#fb923c" },
  { id:"videos",     label:"参考動画",     emoji:"▶",  color:"#ef4444" },
];

const mkForm = (sportId) => ({
  date: new Date().toISOString().split("T")[0],
  sport: sportId, type:"練習", title:"",
  reflection:"", good:"", improve:"",
  mental:3, physical:3,
  goals:"", goalDone:false, nextGoal:"",
  weight:"",
  meals:[{ name:"", kcal:"" }],
  videos:[{ url:"", memo:"" }],
});

function getYouTubeId(url) {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([^&\n?#]+)/);
  return m ? m[1] : null;
}

/* ── styles ── */
const btn = {
  border:"none", borderRadius:8, padding:"8px 16px", fontSize:13,
  cursor:"pointer", fontFamily:"'Noto Sans JP',sans-serif", fontWeight:600, transition:"all 0.15s",
};
const inp = {
  width:"100%", background:"#0f172a", border:"1px solid #1e293b",
  borderRadius:8, padding:"10px 12px", color:"#e2e8f0", fontSize:14,
  fontFamily:"'Noto Sans JP',sans-serif", outline:"none", boxSizing:"border-box",
};
const tx = { ...inp, resize:"vertical", minHeight:80, lineHeight:1.6 };

function SL({ c }) {
  return <div style={{ fontSize:11, color:"#475569", letterSpacing:1, marginBottom:8, fontFamily:"monospace" }}>{c}</div>;
}
function Lbl({ c }) {
  return <div style={{ fontSize:12, color:"#64748b", marginBottom:6, letterSpacing:0.5 }}>{c}</div>;
}
function Sec({ title, accent, children }) {
  return (
    <div style={{ background:"#0a0f1e", border:"1px solid #1e293b", borderRadius:12, padding:16, marginBottom:14 }}>
      <div style={{ fontSize:13, fontWeight:700, color:accent, marginBottom:14 }}>{title}</div>
      {children}
    </div>
  );
}
function Tag({ children, color }) {
  return <span style={{ background:color+"22", color, border:`1px solid ${color}44`, borderRadius:4, padding:"2px 8px", fontSize:11, fontWeight:700 }}>{children}</span>;
}
function EmojiPick({ value, onChange, emojis, label }) {
  return (
    <div>
      <div style={{ fontSize:11, color:"#64748b", marginBottom:6, letterSpacing:1, textTransform:"uppercase" }}>{label}</div>
      <div style={{ display:"flex", gap:10, alignItems:"center" }}>
        {emojis.map((e,i) => (
          <span key={i} onClick={() => onChange(i+1)} style={{
            fontSize:i+1===value?30:22, cursor:"pointer",
            opacity:i+1===value?1:0.35, transition:"all 0.15s",
            filter:i+1===value?"none":"grayscale(80%)",
          }}>{e}</span>
        ))}
        <span style={{ fontSize:13, color:"#94a3b8", marginLeft:4 }}>
          {["最悪","悪い","普通","良い","最高"][value-1]}
        </span>
      </div>
    </div>
  );
}
function StatCard({ label, value, unit, color="#38bdf8" }) {
  return (
    <div style={{ background:"#0f172a", border:"1px solid #1e293b", borderRadius:10, padding:12, textAlign:"center" }}>
      <div style={{ fontSize:20, fontWeight:900, color }}>{value}</div>
      <div style={{ fontSize:11, color:"#475569" }}>{unit}</div>
      <div style={{ fontSize:11, color:"#334155", marginTop:2 }}>{label}</div>
    </div>
  );
}

/* ── 体重グラフ ── */
function WeightGraph({ data, accent }) {
  if (data.length < 2) return (
    <div style={{ color:"#334155", fontSize:13, textAlign:"center", padding:"20px 0" }}>体重データが2件以上あるとグラフが表示されます</div>
  );
  const W=320, H=140, pad={t:16,r:16,b:28,l:44};
  const gW=W-pad.l-pad.r, gH=H-pad.t-pad.b;
  const vals=data.map(d=>d.w);
  const minV=Math.min(...vals), maxV=Math.max(...vals), range=maxV-minV||1;
  const px=(i)=>pad.l+(i/(data.length-1))*gW;
  const py=(v)=>pad.t+gH-((v-minV)/range)*gH;
  const points=data.map((d,i)=>`${px(i)},${py(d.w)}`).join(" ");
  const fillPts=`${pad.l},${pad.t+gH} ${points} ${pad.l+gW},${pad.t+gH}`;
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{overflow:"visible"}}>
      {[0,0.5,1].map((f,i)=>{
        const y=pad.t+gH*(1-f), v=(minV+range*f).toFixed(1);
        return <g key={i}><line x1={pad.l} y1={y} x2={pad.l+gW} y2={y} stroke="#1e293b" strokeWidth="1"/><text x={pad.l-6} y={y+4} textAnchor="end" fontSize="9" fill="#475569">{v}</text></g>;
      })}
      <polygon points={fillPts} fill={accent+"18"}/>
      <polyline points={points} fill="none" stroke={accent} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
      {data.map((d,i)=>(
        <g key={i}>
          <circle cx={px(i)} cy={py(d.w)} r="4" fill={accent} stroke="#020617" strokeWidth="2"/>
          <text x={px(i)} y={H-4} textAnchor="middle" fontSize="8" fill="#475569">{d.date.slice(5)}</text>
        </g>
      ))}
    </svg>
  );
}

/* ── Delete Modal ── */
function DeleteModal({ onConfirm, onCancel }) {
  return (
    <div style={{position:"fixed",inset:0,background:"#00000099",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999,padding:24}}>
      <div style={{background:"#0f172a",border:"1px solid #334155",borderRadius:16,padding:28,width:"100%",maxWidth:320,textAlign:"center"}}>
        <div style={{fontSize:36,marginBottom:12}}>🗑</div>
        <div style={{fontSize:15,fontWeight:700,color:"#f1f5f9",marginBottom:8}}>このノートを削除しますか？</div>
        <div style={{fontSize:13,color:"#475569",marginBottom:24}}>この操作は元に戻せません</div>
        <div style={{display:"flex",gap:10}}>
          <button onClick={onCancel} style={{...btn,flex:1,background:"#1e293b",color:"#94a3b8",padding:"11px"}}>キャンセル</button>
          <button onClick={onConfirm} style={{...btn,flex:1,background:"#7f1d1d",color:"#fca5a5",padding:"11px",fontWeight:700}}>削除する</button>
        </div>
      </div>
    </div>
  );
}

/* ── EntryCard ── */
function EntryCard({ entry, onDelete, onEdit, accent }) {
  const [open, setOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const totalKcal = (entry.meals||[]).reduce((s,m)=>s+(parseInt(m.kcal)||0),0);
  const videos = (entry.videos||[]).filter(v=>v.url);

  return (
    <>
      {confirmDel && <DeleteModal onConfirm={()=>{setConfirmDel(false);onDelete(entry.id);}} onCancel={()=>setConfirmDel(false)}/>}
      <div style={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:12,marginBottom:12,overflow:"hidden"}}>
        <div style={{padding:"14px 18px",cursor:"pointer",display:"flex",alignItems:"center",gap:12}} onClick={()=>setOpen(!open)}>
          <div style={{width:4,height:44,borderRadius:2,background:accent,flexShrink:0}}/>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3,flexWrap:"wrap"}}>
              <span style={{color:"#f8fafc",fontWeight:700,fontSize:15}}>{entry.title||entry.date}</span>
              {entry.type && <Tag color={accent}>{entry.type}</Tag>}
              {videos.length>0 && <Tag color="#ef4444">▶ {videos.length}</Tag>}
            </div>
            <div style={{display:"flex",gap:12,color:"#475569",fontSize:12,flexWrap:"wrap"}}>
              <span>{entry.date}</span>
              {entry.weight && <span>⚖️ {entry.weight}kg</span>}
              {totalKcal>0 && <span>🍽 {totalKcal}kcal</span>}
            </div>
          </div>
          <div style={{display:"flex",gap:10,alignItems:"center"}}>
            <div style={{textAlign:"center"}}><div style={{fontSize:18}}>{CONDITION_EMOJI[entry.physical-1]}</div><div style={{fontSize:9,color:"#475569"}}>体調</div></div>
            <div style={{textAlign:"center"}}><div style={{fontSize:18}}>{MENTAL_EMOJI[entry.mental-1]}</div><div style={{fontSize:9,color:"#475569"}}>メンタル</div></div>
            <span style={{color:open?accent:"#475569",fontSize:16}}>{open?"▲":"▼"}</span>
          </div>
        </div>
        {open && (
          <div style={{borderTop:"1px solid #1e293b",padding:"16px 18px"}}>
            {entry.reflection && <><SL c="📝 振り返り"/><p style={{color:"#cbd5e1",fontSize:14,lineHeight:1.7,margin:"0 0 14px"}}>{entry.reflection}</p></>}
            {(entry.good||entry.improve) && (
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:14}}>
                {entry.good    && <div><SL c="✅ よかった点"/><p style={{color:"#86efac",fontSize:13,lineHeight:1.6,margin:0}}>{entry.good}</p></div>}
                {entry.improve && <div><SL c="🔧 改善点"/><p style={{color:"#fda4af",fontSize:13,lineHeight:1.6,margin:0}}>{entry.improve}</p></div>}
              </div>
            )}
            {(entry.meals||[]).some(m=>m.name||m.kcal) && (
              <div style={{marginBottom:14}}>
                <SL c="🍽 食事・カロリー"/>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {entry.meals.filter(m=>m.name||m.kcal).map((m,i)=>(
                    <div key={i} style={{display:"flex",justifyContent:"space-between",background:"#020617",border:"1px solid #1e293b",borderRadius:8,padding:"8px 12px"}}>
                      <span style={{color:"#cbd5e1",fontSize:13}}>{m.name||"(名前なし)"}</span>
                      {m.kcal && <span style={{color:"#fb923c",fontSize:13,fontWeight:700}}>{m.kcal} kcal</span>}
                    </div>
                  ))}
                  {totalKcal>0 && <div style={{textAlign:"right",color:"#fb923c",fontSize:12,fontWeight:700}}>合計 {totalKcal} kcal</div>}
                </div>
              </div>
            )}
            {entry.weight && <div style={{marginBottom:14}}><SL c="⚖️ 体重"/><span style={{color:"#38bdf8",fontSize:20,fontWeight:900}}>{entry.weight}</span><span style={{color:"#64748b",fontSize:13}}> kg</span></div>}
            {videos.length>0 && (
              <div style={{marginBottom:14}}>
                <SL c="▶ 参考動画"/>
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {videos.map((v,i)=>{
                    const ytId=getYouTubeId(v.url);
                    return (
                      <div key={i} style={{background:"#020617",border:"1px solid #1e293b",borderRadius:10}}>
                        {ytId && (
                          <div onClick={()=>window.open(v.url,"_blank")} style={{cursor:"pointer",position:"relative",borderRadius:"10px 10px 0 0",overflow:"hidden"}}>
                            <img src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`} alt="" style={{width:"100%",display:"block"}}/>
                            <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                              <div style={{width:52,height:52,background:"#ef444488",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>▶</div>
                            </div>
                          </div>
                        )}
                        <div onClick={()=>window.open(v.url,"_blank")} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",cursor:"pointer",borderTop:ytId?"1px solid #1e293b":"none",borderRadius:ytId?"0 0 10px 10px":"10px"}}>
                          <span style={{fontSize:16,flexShrink:0}}>🔗</span>
                          <span style={{color:"#60a5fa",fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>{v.url}</span>
                          <span style={{color:"#334155",fontSize:11,flexShrink:0}}>開く ↗</span>
                        </div>
                        {v.memo && <div style={{padding:"8px 14px",color:"#94a3b8",fontSize:12,borderTop:"1px solid #1e293b"}}>{v.memo}</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {(entry.goals||entry.nextGoal) && (
              <div style={{marginBottom:8}}>
                <SL c="🎯 目標"/>
                {entry.goals && <div style={{display:"flex",alignItems:"flex-start",gap:8,marginBottom:6}}><span style={{fontSize:14,marginTop:1}}>{entry.goalDone?"✅":"⬜"}</span><span style={{color:entry.goalDone?"#86efac":"#94a3b8",fontSize:13,textDecoration:entry.goalDone?"line-through":"none"}}>{entry.goals}</span></div>}
                {entry.nextGoal && <div style={{color:accent,fontSize:13,marginTop:4}}>→ 次の目標: {entry.nextGoal}</div>}
              </div>
            )}
            <div style={{display:"flex",gap:8,marginTop:16}}>
              <button onClick={e=>{e.stopPropagation();onEdit(entry);}} style={{...btn,background:"#1e293b",color:"#94a3b8"}}>✏️ 編集</button>
              <button onClick={e=>{e.stopPropagation();setConfirmDel(true);}} style={{...btn,background:"#1e293b",color:"#f87171"}}>🗑 削除</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/* ══════════════════════════════
   PICKUP VIEW
   選択した項目だけを全日付分表示
══════════════════════════════ */
function PickupView({ entries, accent }) {
  const [selected, setSelected] = useState("reflection");
  const field = PICKUP_FIELDS.find(f=>f.id===selected);

  // その項目にデータがあるエントリのみ（日付降順）
  const filtered = [...entries]
    .sort((a,b)=>b.date.localeCompare(a.date))
    .filter(e => {
      if (selected==="meals")  return (e.meals||[]).some(m=>m.name||m.kcal);
      if (selected==="videos") return (e.videos||[]).some(v=>v.url);
      if (selected==="goals")  return e.goals||e.nextGoal;
      return !!e[selected];
    });

  const renderContent = (entry) => {
    const totalKcal = (entry.meals||[]).reduce((s,m)=>s+(parseInt(m.kcal)||0),0);
    const videos = (entry.videos||[]).filter(v=>v.url);

    if (selected==="reflection") return <p style={{color:"#cbd5e1",fontSize:14,lineHeight:1.8,margin:0}}>{entry.reflection}</p>;
    if (selected==="good")       return <p style={{color:"#86efac",fontSize:14,lineHeight:1.8,margin:0}}>{entry.good}</p>;
    if (selected==="improve")    return <p style={{color:"#fda4af",fontSize:14,lineHeight:1.8,margin:0}}>{entry.improve}</p>;
    if (selected==="weight")     return <div><span style={{color:"#38bdf8",fontSize:26,fontWeight:900}}>{entry.weight}</span><span style={{color:"#64748b",fontSize:14}}> kg</span></div>;

    if (selected==="goals") return (
      <div>
        {entry.goals && (
          <div style={{display:"flex",alignItems:"flex-start",gap:8,marginBottom:6}}>
            <span style={{fontSize:16}}>{entry.goalDone?"✅":"⬜"}</span>
            <span style={{color:entry.goalDone?"#86efac":"#e2e8f0",fontSize:14,textDecoration:entry.goalDone?"line-through":"none"}}>{entry.goals}</span>
          </div>
        )}
        {entry.nextGoal && <div style={{color:accent,fontSize:13,marginTop:4}}>→ 次の目標: {entry.nextGoal}</div>}
      </div>
    );

    if (selected==="meals") return (
      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        {entry.meals.filter(m=>m.name||m.kcal).map((m,i)=>(
          <div key={i} style={{display:"flex",justifyContent:"space-between",background:"#020617",border:"1px solid #1e293b",borderRadius:8,padding:"8px 12px"}}>
            <span style={{color:"#cbd5e1",fontSize:13}}>{m.name||"(名前なし)"}</span>
            {m.kcal && <span style={{color:"#fb923c",fontSize:13,fontWeight:700}}>{m.kcal} kcal</span>}
          </div>
        ))}
        {totalKcal>0 && <div style={{textAlign:"right",color:"#fb923c",fontSize:12,fontWeight:700}}>合計 {totalKcal} kcal</div>}
      </div>
    );

    if (selected==="videos") return (
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {videos.map((v,i)=>{
          const ytId=getYouTubeId(v.url);
          return (
            <div key={i} style={{background:"#020617",border:"1px solid #1e293b",borderRadius:10}}>
              {/* サムネイル（YouTubeの場合） */}
              {ytId && (
                <div onClick={()=>window.open(v.url,"_blank")} style={{cursor:"pointer",position:"relative",borderRadius:"10px 10px 0 0",overflow:"hidden"}}>
                  <img src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`} alt="" style={{width:"100%",display:"block"}}/>
                  <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <div style={{width:52,height:52,background:"#ef444488",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>▶</div>
                  </div>
                </div>
              )}
              {/* URLボタン（常に表示） */}
              <div
                onClick={()=>window.open(v.url,"_blank")}
                style={{
                  display:"flex",alignItems:"center",gap:8,
                  padding:"10px 14px",
                  cursor:"pointer",
                  borderTop: ytId ? "1px solid #1e293b" : "none",
                  borderRadius: ytId ? "0 0 10px 10px" : "10px",
                }}
              >
                <span style={{fontSize:16,flexShrink:0}}>🔗</span>
                <span style={{color:"#60a5fa",fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>{v.url}</span>
                <span style={{color:"#334155",fontSize:11,flexShrink:0}}>開く ↗</span>
              </div>
              {v.memo && <div style={{padding:"8px 14px",color:"#94a3b8",fontSize:12,borderTop:"1px solid #1e293b"}}>{v.memo}</div>}
            </div>
          );
        })}
      </div>
    );
    return null;
  };

  return (
    <div>
      <div style={{marginBottom:20}}>
        <div style={{fontSize:13,color:"#64748b",marginBottom:10}}>表示する項目を選択</div>
        {/* 項目タブ — 横スクロール */}
        <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:4}}>
          {PICKUP_FIELDS.map(f=>(
            <button key={f.id} onClick={()=>setSelected(f.id)} style={{
              ...btn,
              flexShrink:0,
              background:selected===f.id ? f.color+"28" : "#0f172a",
              color:selected===f.id ? f.color : "#475569",
              border:selected===f.id ? `1px solid ${f.color}66` : "1px solid #1e293b",
              padding:"7px 14px",
              fontSize:12,
            }}>
              {f.emoji} {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* 件数バッジ */}
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
        <span style={{fontSize:13,color:field.color,fontWeight:700}}>{field.emoji} {field.label}</span>
        <span style={{background:field.color+"22",color:field.color,border:`1px solid ${field.color}44`,borderRadius:12,padding:"2px 10px",fontSize:11,fontWeight:700}}>
          {filtered.length} 件
        </span>
      </div>

      {filtered.length===0 ? (
        <div style={{textAlign:"center",padding:"48px 20px",color:"#334155"}}>
          <div style={{fontSize:40,marginBottom:12}}>{field.emoji}</div>
          <div style={{fontSize:14,color:"#475569"}}>「{field.label}」の記録がまだありません</div>
        </div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {filtered.map(entry=>(
            <div key={entry.id} style={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:12}}>
              {/* 日付ヘッダー */}
              <div style={{
                padding:"10px 16px",
                background:"#0a0f1e",
                borderBottom:"1px solid #1e293b",
                borderRadius:"12px 12px 0 0",
                display:"flex",alignItems:"center",justifyContent:"space-between",
              }}>
                <div style={{display:"flex",alignItems:"center",gap:8,minWidth:0,flex:1}}>
                  <div style={{width:3,height:16,borderRadius:2,background:field.color,flexShrink:0}}/>
                  <span style={{color:"#94a3b8",fontSize:12,fontWeight:600,flexShrink:0}}>{entry.date}</span>
                  {entry.title && <span style={{color:"#64748b",fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>— {entry.title}</span>}
                </div>
                {entry.type && <Tag color={accent}>{entry.type}</Tag>}
              </div>
              {/* コンテンツ — overflow:hidden なし */}
              <div style={{padding:"14px 16px"}}>
                {renderContent(entry)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


/* ══════════════════════════════════════
   TRAINING VIEW  (スタプラ風 運動版)
══════════════════════════════════════ */
function TrainingView({ sportId, accent }) {
  const STORAGE = TRAINING_KEY + "_" + sportId;
  const [logs, setLogs] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE)||"[]"); } catch { return []; }
  });
  useEffect(()=>{ localStorage.setItem(STORAGE, JSON.stringify(logs)); }, [logs, STORAGE]);

  const [tab, setTab] = useState("stopwatch");

  const fmt = (s) => {
    const h=Math.floor(s/3600), m=Math.floor((s%3600)/60), ss=s%60;
    return h>0
      ? `${h}:${String(m).padStart(2,"0")}:${String(ss).padStart(2,"0")}`
      : `${String(m).padStart(2,"0")}:${String(ss).padStart(2,"0")}`;
  };

  const [showSave, setShowSave] = useState(false);
  const [saveForm, setSaveForm] = useState({ menu:"", startTime:"", endTime:"", distance:"", reps:"", sets:"", memo:"" });
  const [saveMode, setSaveMode] = useState("sw");
  const [saveDuration, setSaveDuration] = useState(0);

  const openSave = (mode, duration, startDate) => {
    setSaveMode(mode); setSaveDuration(duration);
    const now = new Date();
    const fmtT = (d) => d.toTimeString().slice(0,5);
    if (startDate) setSaveForm(f=>({...f, startTime:fmtT(startDate), endTime:fmtT(now)}));
    else setSaveForm(f=>({...f, startTime:"", endTime:""}));
    setShowSave(true);
  };

  const saveLog = () => {
    const today = new Date().toISOString().split("T")[0];
    const dur = (() => {
      if (saveDuration > 0) return saveDuration;
      if (saveForm.startTime && saveForm.endTime) {
        const [sh,sm]=saveForm.startTime.split(":").map(Number);
        const [eh,em]=saveForm.endTime.split(":").map(Number);
        return Math.max(0,(eh*60+em)-(sh*60+sm))*60;
      }
      return 0;
    })();
    setLogs(prev=>[{ id:Date.now(), date:today, sport:sportId, ...saveForm, duration:dur }, ...prev]);
    setShowSave(false);
    setSaveForm({ menu:"", startTime:"", endTime:"", distance:"", reps:"", sets:"", memo:"" });
  };

  const deleteLog = (id) => setLogs(prev=>prev.filter(l=>l.id!==id));

  const [calYear,  setCalYear]  = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const daysInMonth = new Date(calYear, calMonth+1, 0).getDate();
  const firstDay    = new Date(calYear, calMonth, 1).getDay();
  const logDates    = new Set(logs.map(l=>l.date));
  const MONTHS = ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];
  const [calSelected, setCalSelected] = useState(null);
  const calDayLogs = calSelected ? logs.filter(l=>l.date===calSelected) : [];
  const thisMonth  = `${calYear}-${String(calMonth+1).padStart(2,"0")}`;
  const monthTotal = logs.filter(l=>l.date.startsWith(thisMonth)).reduce((s,l)=>s+(l.duration||0),0);

  const TABS = [
    {id:"stopwatch", label:"⏱ SW"},
    {id:"timer",     label:"⏳ タイマー"},
    {id:"log",       label:"📋 記録"},
    {id:"calendar",  label:"📅 カレンダー"},
  ];

  return (
    <div>
      {showSave && (
        <div style={{position:"fixed",inset:0,background:"#00000099",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:999}}>
          <div style={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:"20px 20px 0 0",padding:"24px 20px",width:"100%",maxWidth:480,maxHeight:"85vh",overflowY:"auto"}}>
            <div style={{fontSize:16,fontWeight:700,color:"#f1f5f9",marginBottom:16}}>
              {saveMode==="sw"?"⏱ ストップウォッチを記録":saveMode==="cd"?"⏳ タイマーを記録":saveMode==="interval"?"🔄 インターバルを記録":"📝 手動記録"}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <div><Lbl c="メニュー名"/><input type="text" placeholder="例: シャドーボクシング" value={saveForm.menu} onChange={e=>setSaveForm(f=>({...f,menu:e.target.value}))} style={inp}/></div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <div><Lbl c="開始時刻"/><input type="time" value={saveForm.startTime} onChange={e=>setSaveForm(f=>({...f,startTime:e.target.value}))} style={inp}/></div>
                <div><Lbl c="終了時刻"/><input type="time" value={saveForm.endTime} onChange={e=>setSaveForm(f=>({...f,endTime:e.target.value}))} style={inp}/></div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                <div><Lbl c="距離(km)"/><input type="number" step="0.1" placeholder="5.0" value={saveForm.distance} onChange={e=>setSaveForm(f=>({...f,distance:e.target.value}))} style={inp}/></div>
                <div><Lbl c="回数"/><input type="number" placeholder="20" value={saveForm.reps} onChange={e=>setSaveForm(f=>({...f,reps:e.target.value}))} style={inp}/></div>
                <div><Lbl c="セット"/><input type="number" placeholder="3" value={saveForm.sets} onChange={e=>setSaveForm(f=>({...f,sets:e.target.value}))} style={inp}/></div>
              </div>
              <div><Lbl c="メモ"/><input type="text" placeholder="今日の調子など" value={saveForm.memo} onChange={e=>setSaveForm(f=>({...f,memo:e.target.value}))} style={inp}/></div>
              {saveDuration>0 && (
                <div style={{background:"#020617",borderRadius:10,padding:"10px 14px",fontSize:13,color:"#64748b"}}>
                  計測時間: <span style={{color:accent,fontWeight:700}}>{fmt(saveDuration)}</span>
                </div>
              )}
            </div>
            <div style={{display:"flex",gap:10,marginTop:20}}>
              <button onClick={()=>setShowSave(false)} style={{...btn,flex:1,background:"#1e293b",color:"#94a3b8",padding:12}}>キャンセル</button>
              <button onClick={saveLog} style={{...btn,flex:2,background:`linear-gradient(135deg,${accent}99,${accent})`,color:"#000",padding:12,fontWeight:800}}>💾 保存</button>
            </div>
          </div>
        </div>
      )}

      <div style={{display:"flex",gap:6,marginBottom:20}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{
            ...btn, flex:1, fontSize:11, padding:"7px 2px",
            background:tab===t.id?accent+"22":"#0f172a",
            color:tab===t.id?accent:"#475569",
            border:tab===t.id?`1px solid ${accent}44`:"1px solid #1e293b",
          }}>{t.label}</button>
        ))}
      </div>

      {tab==="stopwatch" && <StopwatchTab accent={accent} fmt={fmt} onSave={openSave}/>}
      {tab==="timer" && <TimerTab accent={accent} fmt={fmt} onSave={openSave}/>}

      {tab==="log" && (
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <div style={{fontSize:14,color:"#94a3b8",fontWeight:600}}>記録一覧 <span style={{color:accent}}>({logs.length}件)</span></div>
            <button onClick={()=>openSave("manual",0,null)} style={{...btn,background:`linear-gradient(135deg,${accent}99,${accent})`,color:"#000",padding:"7px 14px",fontWeight:700,fontSize:12}}>＋ 手動記録</button>
          </div>
          {logs.length===0 ? (
            <div style={{textAlign:"center",padding:"48px 20px",color:"#334155"}}>
              <div style={{fontSize:40,marginBottom:12}}>⏱</div>
              <div style={{fontSize:14,color:"#475569"}}>タイマーで計測して記録しよう</div>
            </div>
          ) : logs.map(log=>{
            const extras=[];
            if(log.distance) extras.push(`${log.distance}km`);
            if(log.reps)     extras.push(`${log.reps}回`);
            if(log.sets)     extras.push(`${log.sets}セット`);
            return (
              <div key={log.id} style={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:12,marginBottom:10,padding:"14px 16px"}}>
                <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap"}}>
                      <span style={{color:"#f1f5f9",fontWeight:700,fontSize:15}}>{log.menu||"メニュー未設定"}</span>
                      {log.duration>0 && <span style={{background:accent+"22",color:accent,border:`1px solid ${accent}44`,borderRadius:6,padding:"2px 8px",fontSize:12,fontWeight:700}}>{fmt(log.duration)}</span>}
                    </div>
                    <div style={{display:"flex",gap:10,flexWrap:"wrap",fontSize:12,color:"#475569"}}>
                      <span>📅 {log.date}</span>
                      {log.startTime&&log.endTime&&<span>🕐 {log.startTime}〜{log.endTime}</span>}
                      {extras.map((e,i)=><span key={i}>• {e}</span>)}
                    </div>
                    {log.memo && <div style={{color:"#64748b",fontSize:12,marginTop:6}}>{log.memo}</div>}
                  </div>
                  <button onClick={()=>deleteLog(log.id)} style={{...btn,background:"transparent",color:"#334155",padding:"4px 8px",fontSize:16,flexShrink:0}}>🗑</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab==="calendar" && (
        <div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
            <button onClick={()=>{if(calMonth===0){setCalYear(y=>y-1);setCalMonth(11);}else setCalMonth(m=>m-1);setCalSelected(null);}} style={{...btn,background:"#0f172a",color:"#94a3b8",padding:"6px 14px",border:"1px solid #1e293b"}}>←</button>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:16,fontWeight:700,color:"#f1f5f9"}}>{calYear}年 {MONTHS[calMonth]}</div>
              {monthTotal>0 && <div style={{fontSize:12,color:accent,marginTop:2}}>今月の合計: {fmt(monthTotal)}</div>}
            </div>
            <button onClick={()=>{if(calMonth===11){setCalYear(y=>y+1);setCalMonth(0);}else setCalMonth(m=>m+1);setCalSelected(null);}} style={{...btn,background:"#0f172a",color:"#94a3b8",padding:"6px 14px",border:"1px solid #1e293b"}}>→</button>
          </div>
          <div style={{background:"#0a0f1e",border:"1px solid #1e293b",borderRadius:14,padding:16,marginBottom:16}}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4,marginBottom:8}}>
              {["日","月","火","水","木","金","土"].map(d=>(
                <div key={d} style={{textAlign:"center",fontSize:11,color:"#334155",fontWeight:600}}>{d}</div>
              ))}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4}}>
              {Array.from({length:firstDay}).map((_,i)=><div key={"e"+i}/>)}
              {Array.from({length:daysInMonth}).map((_,i)=>{
                const d=i+1;
                const dateStr=calYear+"-"+String(calMonth+1).padStart(2,"0")+"-"+String(d).padStart(2,"0");
                const hasLog=logDates.has(dateStr);
                const isToday=dateStr===new Date().toISOString().split("T")[0];
                const isSel=calSelected===dateStr;
                return (
                  <div key={d} onClick={()=>setCalSelected(isSel?null:dateStr)} style={{textAlign:"center",padding:"8px 2px",borderRadius:8,cursor:"pointer",background:isSel?accent+"33":isToday?"#1e293b":"transparent",border:isSel?"1px solid "+accent+"66":isToday?"1px solid #334155":"1px solid transparent",transition:"all 0.15s"}}>
                    <div style={{fontSize:13,fontWeight:isToday?700:400,color:isToday?accent:"#94a3b8"}}>{d}</div>
                    {hasLog && <div style={{width:6,height:6,borderRadius:"50%",background:accent,margin:"2px auto 0"}}/>}
                  </div>
                );
              })}
            </div>
          </div>
          {calSelected && (
            <div>
              <div style={{fontSize:13,color:"#64748b",marginBottom:10}}>📅 {calSelected} の記録</div>
              {calDayLogs.length===0
                ? <div style={{textAlign:"center",padding:"24px",color:"#334155",background:"#0f172a",borderRadius:12,fontSize:13}}>この日の記録はありません</div>
                : calDayLogs.map(log=>{
                  const extras=[];
                  if(log.distance) extras.push(log.distance+"km");
                  if(log.reps)     extras.push(log.reps+"回");
                  if(log.sets)     extras.push(log.sets+"セット");
                  return (
                    <div key={log.id} style={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:12,marginBottom:8,padding:"12px 16px"}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap"}}>
                        <span style={{color:"#f1f5f9",fontWeight:700}}>{log.menu||"メニュー未設定"}</span>
                        {log.duration>0 && <span style={{color:accent,fontSize:13,fontWeight:700}}>{fmt(log.duration)}</span>}
                      </div>
                      <div style={{display:"flex",gap:10,flexWrap:"wrap",fontSize:12,color:"#475569"}}>
                        {log.startTime&&log.endTime&&<span>🕐 {log.startTime}〜{log.endTime}</span>}
                        {extras.map((e,i)=><span key={i}>• {e}</span>)}
                      </div>
                      {log.memo && <div style={{color:"#64748b",fontSize:12,marginTop:4}}>{log.memo}</div>}
                    </div>
                  );
                })
              }
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── ストップウォッチ ── */
function StopwatchTab({ accent, fmt, onSave }) {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [startDate, setStartDate] = useState(null);
  const ref = useRef(null);
  useEffect(()=>{
    if(running){ ref.current=setInterval(()=>setElapsed(e=>e+1),1000); }
    else clearInterval(ref.current);
    return ()=>clearInterval(ref.current);
  },[running]);
  const toggle=()=>{ if(!running) setStartDate(new Date()); setRunning(r=>!r); };
  const reset=()=>{ setRunning(false); setElapsed(0); setStartDate(null); };
  const pct=Math.min(100,(elapsed%3600)/3600*100);
  const R=80, C=2*Math.PI*R;
  return (
    <div style={{background:"#0a0f1e",border:"1px solid #1e293b",borderRadius:16,padding:28,textAlign:"center"}}>
      <div style={{fontSize:11,color:"#475569",letterSpacing:2,marginBottom:20,textTransform:"uppercase"}}>Stopwatch</div>
      <div style={{position:"relative",width:200,height:200,margin:"0 auto 24px"}}>
        <svg width="200" height="200" style={{position:"absolute",top:0,left:0,transform:"rotate(-90deg)"}}>
          <circle cx="100" cy="100" r={R} fill="none" stroke="#1e293b" strokeWidth="8"/>
          <circle cx="100" cy="100" r={R} fill="none" stroke={accent} strokeWidth="8"
            strokeDasharray={C} strokeDashoffset={C*(1-pct/100)}
            strokeLinecap="round" style={{transition:"stroke-dashoffset 0.8s ease"}}/>
        </svg>
        <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
          <div style={{fontSize:40,fontWeight:900,color:"#f1f5f9",fontFamily:"monospace",letterSpacing:-2}}>{fmt(elapsed)}</div>
          <div style={{fontSize:11,color:"#475569",marginTop:6}}>経過時間</div>
        </div>
      </div>
      <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
        <button onClick={reset} style={{...btn,background:"#1e293b",color:"#94a3b8",padding:"11px 22px"}}>リセット</button>
        <button onClick={toggle} style={{...btn,padding:"11px 32px",fontWeight:800,background:running?"#ef444422":`linear-gradient(135deg,${accent}99,${accent})`,color:running?"#f87171":"#000",border:running?"1px solid #f8717144":"none"}}>
          {running?"⏸ 止める":"▶ スタート"}
        </button>
        {!running && elapsed>0 && (
          <button onClick={()=>onSave("sw",elapsed,startDate)} style={{...btn,background:accent+"22",color:accent,padding:"11px 18px",border:"1px solid "+accent+"44",fontWeight:700}}>記録する</button>
        )}
      </div>
    </div>
  );
}

/* ── アラーム音（Web Audio API） ── */
// グローバルにAudioContextを保持（ユーザー操作時に初期化）
let _audioCtx = null;
function getAudioCtx() {
  if (!_audioCtx) {
    _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return _audioCtx;
}
// ユーザー操作時に呼んでsuspendを解除しておく
function resumeAudio() {
  try {
    const ctx = getAudioCtx();
    if (ctx.state === "suspended") ctx.resume();
  } catch(e) {}
}
function playAlarm() {
  try {
    const ctx = getAudioCtx();
    const doBeeps = () => {
      const beep = (freq, start, duration, vol=0.6) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = "square";
        gain.gain.setValueAtTime(0, ctx.currentTime + start);
        gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + start + 0.01);
        gain.gain.setValueAtTime(vol, ctx.currentTime + start + duration - 0.02);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + start + duration);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration + 0.05);
      };
      // ピピピピ　ピピピピ (2セット、伸ばしなし)
      const pat = (offset) => {
        beep(1200, offset + 0.00, 0.09);
        beep(1200, offset + 0.13, 0.09);
        beep(1200, offset + 0.26, 0.09);
        beep(1200, offset + 0.39, 0.09);
      };
      pat(0.0);
      pat(0.65);
    };
    if (ctx.state === "suspended") {
      ctx.resume().then(doBeeps);
    } else {
      doBeeps();
    }
  } catch(e) { console.log("Audio error:", e); }
}

/* ── タイマー（カウントダウン＋インターバル） ── */
function TimerTab({ accent, fmt, onSave }) {
  const [mode, setMode] = useState("countdown");
  const [cdMin,     setCdMin]     = useState("5");
  const [cdSec,     setCdSec]     = useState("0");
  const [cdTotal,   setCdTotal]   = useState(300);
  const [cdLeft,    setCdLeft]    = useState(300);
  const [cdRunning, setCdRunning] = useState(false);
  const [cdStart,   setCdStart]   = useState(null);
  const cdRef = useRef(null);
  useEffect(()=>{
    if(cdRunning){
      cdRef.current=setInterval(()=>{
        setCdLeft(l=>{ if(l<=1){clearInterval(cdRef.current);setCdRunning(false);playAlarm();return 0;} return l-1; });
      },1000);
    } else clearInterval(cdRef.current);
    return ()=>clearInterval(cdRef.current);
  },[cdRunning]);
  const cdApply=()=>{ const s=(parseInt(cdMin)||0)*60+(parseInt(cdSec)||0); const total=Math.max(1,s); setCdTotal(total); setCdLeft(total); setCdRunning(false); };
  const cdToggle=()=>{ if(cdLeft===0)return; if(!cdRunning){ setCdStart(new Date()); resumeAudio(); } setCdRunning(r=>!r); };
  const cdReset=()=>{ setCdRunning(false); setCdLeft(cdTotal); setCdStart(null); };
  const cdPct=cdTotal>0?((cdTotal-cdLeft)/cdTotal)*100:0;
  const PRESETS=[1,3,5,10,15,20,30];

  const [ivWorkMin,  setIvWorkMin]  = useState("2");
  const [ivWorkSec,  setIvWorkSec]  = useState("0");
  const [ivRestMin,  setIvRestMin]  = useState("0");
  const [ivRestSec,  setIvRestSec]  = useState("30");
  const [ivSets,     setIvSets]     = useState("");
  const [ivRunning,  setIvRunning]  = useState(false);
  const [ivStarted,  setIvStarted]  = useState(false);
  const [ivPhase,    setIvPhase]    = useState("work");
  const [ivLeft,     setIvLeft]     = useState(120);
  const [ivSet,      setIvSet]      = useState(1);
  const [ivStart,    setIvStart]    = useState(null);
  const [ivElapsed,  setIvElapsed]  = useState(0);
  const ivRef = useRef(null);
  const ivWorkTotal = (parseInt(ivWorkMin)||0)*60+(parseInt(ivWorkSec)||0)||120;
  const ivRestTotal = (parseInt(ivRestMin)||0)*60+(parseInt(ivRestSec)||0)||30;
  const ivMaxSets   = ivSets ? parseInt(ivSets)||1 : null;

  const ivReset=()=>{ clearInterval(ivRef.current); setIvRunning(false); setIvStarted(false); setIvPhase("work"); setIvLeft(120); setIvSet(1); setIvStart(null); setIvElapsed(0); };
  useEffect(()=>{
    if(!ivRunning){ clearInterval(ivRef.current); return; }
    ivRef.current=setInterval(()=>{
      setIvLeft(l=>{
        setIvElapsed(e=>e+1);
        if(l<=1){
          setIvPhase(ph=>{
            if(ph==="work"){
              if(ivRestTotal===0){
                setIvSet(s=>{ const next=s+1; if(ivMaxSets&&next>ivMaxSets){clearInterval(ivRef.current);setIvRunning(false);return s;} return next; });
                setTimeout(()=>setIvLeft(ivWorkTotal),0);
                return "work";
              }
              setTimeout(()=>setIvLeft(ivRestTotal),0);
              return "rest";
            } else {
              setIvSet(s=>{ const next=s+1; if(ivMaxSets&&next>ivMaxSets){clearInterval(ivRef.current);setIvRunning(false);return s;} return next; });
              setTimeout(()=>setIvLeft(ivWorkTotal),0);
              return "work";
            }
          });
          return 0;
        }
        return l-1;
      });
    },1000);
    return ()=>clearInterval(ivRef.current);
  },[ivRunning]);

  const ivToggle=()=>{ if(!ivRunning){ setIvStart(new Date()); setIvLeft(ivWorkTotal); setIvStarted(true); } setIvRunning(r=>!r); };
  const ivPct = ivPhase==="work"
    ? ivWorkTotal>0?(ivWorkTotal-ivLeft)/ivWorkTotal*100:0
    : ivRestTotal>0?(ivRestTotal-ivLeft)/ivRestTotal*100:0;
  const ivPhaseColor = ivPhase==="work" ? accent : "#f59e0b";
  const isDone = ivMaxSets && ivSet>ivMaxSets;
  const R=80, C=2*Math.PI*R;

  return (
    <div>
      <div style={{display:"flex",gap:8,marginBottom:20}}>
        {[{id:"countdown",label:"⏳ カウントダウン"},{id:"interval",label:"🔄 インターバル"}].map(m=>(
          <button key={m.id} onClick={()=>setMode(m.id)} style={{...btn,flex:1,fontSize:12,padding:"8px 4px",background:mode===m.id?accent+"22":"#0f172a",color:mode===m.id?accent:"#475569",border:mode===m.id?"1px solid "+accent+"44":"1px solid #1e293b"}}>
            {m.label}
          </button>
        ))}
      </div>

      {mode==="countdown" && (
        <div style={{background:"#0a0f1e",border:"1px solid #1e293b",borderRadius:16,padding:24,textAlign:"center"}}>
          {!cdRunning && cdLeft===cdTotal && (
            <div style={{marginBottom:16}}>
              <div style={{display:"flex",gap:6,justifyContent:"center",flexWrap:"wrap",marginBottom:12}}>
                {PRESETS.map(m=>(
                  <button key={m} onClick={()=>{setCdMin(String(m));setCdSec("0");}} style={{...btn,padding:"5px 10px",fontSize:12,background:parseInt(cdMin)===m&&cdSec==="0"?accent+"22":"#0f172a",color:parseInt(cdMin)===m&&cdSec==="0"?accent:"#475569",border:parseInt(cdMin)===m&&cdSec==="0"?"1px solid "+accent+"44":"1px solid #1e293b"}}>
                    {m}分
                  </button>
                ))}
              </div>
              <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                <input type="number" min="0" value={cdMin} onChange={e=>setCdMin(e.target.value)} style={{...inp,width:60,textAlign:"center",padding:"8px 4px"}} placeholder="分"/>
                <span style={{color:"#475569"}}>分</span>
                <input type="number" min="0" max="59" value={cdSec} onChange={e=>setCdSec(e.target.value)} style={{...inp,width:60,textAlign:"center",padding:"8px 4px"}} placeholder="秒"/>
                <span style={{color:"#475569"}}>秒</span>
                <button onClick={cdApply} style={{...btn,background:accent+"22",color:accent,border:"1px solid "+accent+"44",padding:"8px 14px",fontSize:12}}>セット</button>
              </div>
            </div>
          )}
          <div style={{position:"relative",width:200,height:200,margin:"0 auto 24px"}}>
            <svg width="200" height="200" style={{position:"absolute",top:0,left:0,transform:"rotate(-90deg)"}}>
              <circle cx="100" cy="100" r={R} fill="none" stroke="#1e293b" strokeWidth="8"/>
              <circle cx="100" cy="100" r={R} fill="none" stroke={cdLeft===0?"#ef4444":accent} strokeWidth="8"
                strokeDasharray={C} strokeDashoffset={C*(1-cdPct/100)}
                strokeLinecap="round" style={{transition:"stroke-dashoffset 0.8s ease"}}/>
            </svg>
            <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
              <div style={{fontSize:40,fontWeight:900,color:cdLeft===0?"#ef4444":"#f1f5f9",fontFamily:"monospace",letterSpacing:-2}}>{fmt(cdLeft)}</div>
              <div style={{fontSize:11,color:"#475569",marginTop:6}}>{cdLeft===0?"完了！":"残り時間"}</div>
            </div>
          </div>
          <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
            <button onClick={cdReset} style={{...btn,background:"#1e293b",color:"#94a3b8",padding:"11px 22px"}}>リセット</button>
            <button onClick={cdToggle} disabled={cdLeft===0} style={{...btn,padding:"11px 32px",fontWeight:800,background:cdRunning?"#ef444422":`linear-gradient(135deg,${accent}99,${accent})`,color:cdRunning?"#f87171":"#000",border:cdRunning?"1px solid #f8717144":"none",opacity:cdLeft===0?0.4:1}}>
              {cdRunning?"⏸ 止める":"▶ スタート"}
            </button>
            {!cdRunning && cdTotal-cdLeft>0 && (
              <button onClick={()=>onSave("cd",cdTotal-cdLeft,cdStart)} style={{...btn,background:accent+"22",color:accent,padding:"11px 18px",border:"1px solid "+accent+"44",fontWeight:700}}>記録する</button>
            )}
          </div>
        </div>
      )}

      {mode==="interval" && (
        <div style={{background:"#0a0f1e",border:"1px solid #1e293b",borderRadius:16,padding:24}}>
          {!ivStarted && (
            <div style={{marginBottom:20}}>
              <div style={{fontSize:12,color:"#64748b",marginBottom:12,textAlign:"center",letterSpacing:1}}>インターバル設定</div>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                <div style={{background:"#020617",borderRadius:10,padding:12}}>
                  <div style={{fontSize:11,color:accent,fontWeight:700,marginBottom:8}}>🏃 練習時間</div>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <input type="number" min="0" value={ivWorkMin} onChange={e=>setIvWorkMin(e.target.value)} style={{...inp,width:60,textAlign:"center",padding:"8px 4px"}}/>
                    <span style={{color:"#475569",fontSize:13}}>分</span>
                    <input type="number" min="0" max="59" value={ivWorkSec} onChange={e=>setIvWorkSec(e.target.value)} style={{...inp,width:60,textAlign:"center",padding:"8px 4px"}}/>
                    <span style={{color:"#475569",fontSize:13}}>秒</span>
                  </div>
                </div>
                <div style={{background:"#020617",borderRadius:10,padding:12}}>
                  <div style={{fontSize:11,color:"#f59e0b",fontWeight:700,marginBottom:8}}>😮 休憩時間</div>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <input type="number" min="0" value={ivRestMin} onChange={e=>setIvRestMin(e.target.value)} style={{...inp,width:60,textAlign:"center",padding:"8px 4px"}}/>
                    <span style={{color:"#475569",fontSize:13}}>分</span>
                    <input type="number" min="0" max="59" value={ivRestSec} onChange={e=>setIvRestSec(e.target.value)} style={{...inp,width:60,textAlign:"center",padding:"8px 4px"}}/>
                    <span style={{color:"#475569",fontSize:13}}>秒</span>
                  </div>
                </div>
                <div style={{background:"#020617",borderRadius:10,padding:12}}>
                  <div style={{fontSize:11,color:"#94a3b8",fontWeight:700,marginBottom:8}}>🔁 セット数</div>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <input type="number" min="1" placeholder="空欄=∞" value={ivSets} onChange={e=>setIvSets(e.target.value)} style={{...inp,width:100,textAlign:"center",padding:"8px 4px"}}/>
                    <span style={{color:"#475569",fontSize:12}}>空欄でエンドレス</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          {ivStarted && (
            <div style={{textAlign:"center",marginBottom:20}}>
              <div style={{fontSize:12,color:ivPhaseColor,fontWeight:700,letterSpacing:1,marginBottom:12,textTransform:"uppercase"}}>
                {isDone?"✅ 完了！":ivPhase==="work"?"🏃 練習中":"😮 休憩中"}
              </div>
              <div style={{position:"relative",width:200,height:200,margin:"0 auto 16px"}}>
                <svg width="200" height="200" style={{position:"absolute",top:0,left:0,transform:"rotate(-90deg)"}}>
                  <circle cx="100" cy="100" r={R} fill="none" stroke="#1e293b" strokeWidth="8"/>
                  <circle cx="100" cy="100" r={R} fill="none" stroke={isDone?"#10b981":ivPhaseColor} strokeWidth="8"
                    strokeDasharray={C} strokeDashoffset={C*(1-ivPct/100)}
                    strokeLinecap="round" style={{transition:"stroke-dashoffset 0.8s ease"}}/>
                </svg>
                <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                  <div style={{fontSize:40,fontWeight:900,color:isDone?"#10b981":ivPhaseColor,fontFamily:"monospace",letterSpacing:-2}}>{isDone?"✓":fmt(ivLeft)}</div>
                  <div style={{fontSize:11,color:"#475569",marginTop:6}}>
                    {ivMaxSets?Math.min(ivSet,ivMaxSets)+" / "+ivMaxSets+" セット":ivSet+" セット目"}
                  </div>
                </div>
              </div>
              <div style={{fontSize:12,color:"#475569"}}>合計: {fmt(ivElapsed)}</div>
            </div>
          )}
          <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
            <button onClick={ivReset} style={{...btn,background:"#1e293b",color:"#94a3b8",padding:"11px 22px"}}>リセット</button>
            {!isDone && (
              <button onClick={ivToggle} style={{...btn,padding:"11px 32px",fontWeight:800,background:ivRunning?"#ef444422":`linear-gradient(135deg,${accent}99,${accent})`,color:ivRunning?"#f87171":"#000",border:ivRunning?"1px solid #f8717144":"none"}}>
                {ivRunning?"⏸ 止める":"▶ スタート"}
              </button>
            )}
            {!ivRunning && ivElapsed>0 && (
              <button onClick={()=>onSave("interval",ivElapsed,ivStart)} style={{...btn,background:accent+"22",color:accent,padding:"11px 18px",border:"1px solid "+accent+"44",fontWeight:700}}>記録する</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


/* ══════════════════════
   SPORT SELECT
══════════════════════ */
function SportSelect({ onSelect }) {
  const [showCustom, setShowCustom] = useState(false);
  const [customName, setCustomName] = useState("");
  return (
    <div style={{minHeight:"100vh",background:"#020617",display:"flex",flexDirection:"column",alignItems:"center",padding:"48px 16px 60px",fontFamily:"'Noto Sans JP','Hiragino Sans',sans-serif"}}>
      <div style={{textAlign:"center",marginBottom:40}}>
        <div style={{fontSize:52,marginBottom:10}}>⚡</div>
        <div style={{fontSize:32,fontWeight:900,letterSpacing:-1,background:"linear-gradient(90deg,#38bdf8,#818cf8)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>SportLog</div>
        <div style={{fontSize:15,color:"#475569",marginTop:8}}>やっているスポーツを選んでください</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,width:"100%",maxWidth:480}}>
        {SPORTS_LIST.map(sport=>{
          const color=SPORT_COLORS[sport.id];
          return (
            <button key={sport.id} onClick={()=>onSelect(sport.id,sport.name,sport.emoji)}
              style={{background:"#0f172a",border:`1px solid ${color}33`,borderRadius:14,padding:"18px 8px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:8,transition:"all 0.18s"}}
              onMouseEnter={e=>{e.currentTarget.style.background=color+"18";e.currentTarget.style.borderColor=color+"99";e.currentTarget.style.transform="translateY(-3px)";}}
              onMouseLeave={e=>{e.currentTarget.style.background="#0f172a";e.currentTarget.style.borderColor=color+"33";e.currentTarget.style.transform="translateY(0)";}}>
              <span style={{fontSize:32}}>{sport.emoji}</span>
              <span style={{fontSize:11,color:"#94a3b8",fontWeight:600,lineHeight:1.3,textAlign:"center"}}>{sport.name}</span>
            </button>
          );
        })}
        <button onClick={()=>setShowCustom(true)}
          style={{background:"#0f172a",border:"1px solid #334155",borderRadius:14,padding:"18px 8px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:8,transition:"all 0.18s"}}
          onMouseEnter={e=>{e.currentTarget.style.borderColor="#94a3b8";e.currentTarget.style.transform="translateY(-3px)";}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor="#334155";e.currentTarget.style.transform="translateY(0)";}}>
          <span style={{fontSize:32}}>✏️</span>
          <span style={{fontSize:11,color:"#64748b",fontWeight:600}}>その他</span>
        </button>
      </div>
      {showCustom && (
        <div style={{position:"fixed",inset:0,background:"#00000099",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999,padding:24}}>
          <div style={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:16,padding:28,width:"100%",maxWidth:360}}>
            <div style={{fontSize:16,fontWeight:700,color:"#f1f5f9",marginBottom:16}}>スポーツ名を入力</div>
            <input autoFocus type="text" placeholder="例: フットサル、ボクシング..." value={customName} onChange={e=>setCustomName(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&customName.trim()&&onSelect("custom",customName.trim(),"🏅")} style={{...inp,marginBottom:16}}/>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setShowCustom(false)} style={{...btn,flex:1,background:"#1e293b",color:"#94a3b8"}}>キャンセル</button>
              <button disabled={!customName.trim()} onClick={()=>customName.trim()&&onSelect("custom",customName.trim(),"🏅")}
                style={{...btn,flex:1,background:customName.trim()?"linear-gradient(135deg,#1e40af,#4f46e5)":"#1e293b",color:customName.trim()?"#fff":"#475569"}}>決定</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════
   MAIN
══════════════════════ */
export default function SportsNotebook() {
  const [settings, setSettings] = useState(()=>{
    try{return JSON.parse(localStorage.getItem(SETTINGS_KEY)||"null");}catch{return null;}
  });
  const [entries, setEntries] = useState(()=>{
    try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]");}catch{return [];}
  });
  const [view, setView]     = useState("list");
  const [form, setForm]     = useState(null);
  const [editId, setEditId] = useState(null);

  useEffect(()=>{if(settings)localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings));},[settings]);
  useEffect(()=>{localStorage.setItem(STORAGE_KEY,JSON.stringify(entries));},[entries]);

  const handleSelect=(id,name,emoji)=>{setSettings({id,name,emoji});setForm(mkForm(id));setView("list");};
  if(!settings) return <SportSelect onSelect={handleSelect}/>;

  const accent       = SPORT_COLORS[settings.id]||"#38bdf8";
  const sportEntries = entries.filter(e=>e.sport===settings.id);
  const typeCount    = sportEntries.reduce((a,e)=>{a[e.type]=(a[e.type]||0)+1;return a;},{});
  const weightData   = [...sportEntries].filter(e=>e.weight).sort((a,b)=>a.date.localeCompare(b.date)).map(e=>({date:e.date,w:parseFloat(e.weight)}));
  const latestW      = weightData.at(-1)?.w;
  const avgKcal      = (()=>{const days=sportEntries.filter(e=>(e.meals||[]).some(m=>m.kcal));if(!days.length)return null;return Math.round(days.reduce((s,e)=>s+(e.meals||[]).reduce((a,m)=>a+(parseInt(m.kcal)||0),0),0)/days.length);})();

  const save=()=>{
    const entry={...form,sport:settings.id};
    if(editId){setEntries(prev=>prev.map(e=>e.id===editId?{...entry,id:editId}:e));setEditId(null);}
    else{setEntries(prev=>[{...entry,id:Date.now()},...prev]);}
    setForm(mkForm(settings.id));setView("list");
  };
  const del  = (id)=>setEntries(prev=>prev.filter(e=>e.id!==id));
  const edit = (entry)=>{setForm({...entry,meals:entry.meals||[{name:"",kcal:""}],videos:entry.videos||[{url:"",memo:""}]});setEditId(entry.id);setView("form");};

  const updateMeal =(i,f,v)=>{const m=[...form.meals];m[i]={...m[i],[f]:v};setForm({...form,meals:m});};
  const addMeal    =()=>setForm({...form,meals:[...form.meals,{name:"",kcal:""}]});
  const removeMeal =(i)=>setForm({...form,meals:form.meals.filter((_,idx)=>idx!==i)});
  const updateVideo=(i,f,v)=>{const vs=[...form.videos];vs[i]={...vs[i],[f]:v};setForm({...form,videos:vs});};
  const addVideo   =()=>setForm({...form,videos:[...form.videos,{url:"",memo:""}]});
  const removeVideo=(i)=>setForm({...form,videos:form.videos.filter((_,idx)=>idx!==i)});

  const NAV_ITEMS = [
    {id:"list",     label:"📋 ノート"},
    {id:"training", label:"⏱ 練習"},
    {id:"pickup",   label:"🔍 ピックアップ"},
    {id:"stats",    label:"📊 統計"},
  ];

  return (
    <div style={{minHeight:"100vh",background:"#020617",fontFamily:"'Noto Sans JP','Hiragino Sans',sans-serif",color:"#e2e8f0"}}>

      {/* Header */}
      <div style={{background:"#0a0f1e",borderBottom:"1px solid #1e293b",padding:"14px 20px",position:"sticky",top:0,zIndex:100}}>
        <div style={{maxWidth:640,margin:"0 auto"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <button onClick={()=>setSettings(null)} title="スポーツを変える"
                style={{background:accent+"18",border:`1px solid ${accent}44`,borderRadius:10,padding:"6px 10px",cursor:"pointer",fontSize:22,lineHeight:1}}>
                {settings.emoji}
              </button>
              <div>
                <div style={{fontSize:18,fontWeight:900,color:accent,letterSpacing:-0.5}}>{settings.name}</div>
                <div style={{fontSize:10,color:"#475569",letterSpacing:1}}>SportLog ⚡</div>
              </div>
            </div>
            {(view==="list") && (
              <button onClick={()=>{setForm(mkForm(settings.id));setEditId(null);setView("form");}}
                style={{...btn,background:`linear-gradient(135deg,${accent}bb,${accent})`,color:"#000",padding:"8px 16px",fontWeight:700}}>
                ＋ 新規
              </button>
            )}
          </div>
          {/* Nav tabs */}
          <div style={{display:"flex",gap:6}}>
            {NAV_ITEMS.map(item=>(
              <button key={item.id} onClick={()=>setView(item.id)} style={{
                ...btn,
                flex:1,
                background:view===item.id?accent+"22":"transparent",
                color:view===item.id?accent:"#475569",
                padding:"7px 4px",fontSize:11,
                border:view===item.id?`1px solid ${accent}44`:"1px solid transparent",
                borderRadius:8,
              }}>{item.label}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{maxWidth:640,margin:"0 auto",padding:"20px 16px"}}>

        {/* ── TRAINING ── */}
        {view==="training" && (
          <TrainingView sportId={settings.id} accent={accent}/>
        )}

        {/* ── LIST ── */}
        {view==="list" && (
          <>
            {sportEntries.length===0 ? (
              <div style={{textAlign:"center",padding:"60px 20px",color:"#334155"}}>
                <div style={{fontSize:52,marginBottom:16}}>{settings.emoji}</div>
                <div style={{fontSize:15,color:"#475569",marginBottom:8}}>まだノートがありません</div>
                <div style={{fontSize:13}}>「＋ 新規」から記録をはじめよう</div>
              </div>
            ):sportEntries.map(e=>(
              <EntryCard key={e.id} entry={e} onDelete={del} onEdit={edit} accent={accent}/>
            ))}
          </>
        )}

        {/* ── PICKUP ── */}
        {view==="pickup" && (
          sportEntries.length===0 ? (
            <div style={{textAlign:"center",padding:"60px 20px",color:"#334155"}}>
              <div style={{fontSize:52,marginBottom:16}}>🔍</div>
              <div style={{fontSize:15,color:"#475569",marginBottom:8}}>まだノートがありません</div>
              <div style={{fontSize:13}}>ノートを記録するとここで項目別に見られます</div>
            </div>
          ) : <PickupView entries={sportEntries} accent={accent}/>
        )}

        {/* ── FORM ── */}
        {view==="form" && form && (
          <div>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
              <button onClick={()=>setView("list")} style={{...btn,background:"#0f172a",color:"#94a3b8",padding:"6px 12px",border:"1px solid #1e293b"}}>← 戻る</button>
              <h2 style={{margin:0,fontSize:17,color:"#f1f5f9"}}>{editId?"ノートを編集":`新しいノート — ${settings.emoji} ${settings.name}`}</h2>
            </div>

            <Sec title="📅 基本情報" accent={accent}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <div><Lbl c="日付"/><input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} style={inp}/></div>
                <div><Lbl c="種別"/>
                  <select value={form.type} onChange={e=>setForm({...form,type:e.target.value})} style={{...inp,cursor:"pointer"}}>
                    {["練習","試合","自主練","トレーニング","その他"].map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div style={{marginTop:10}}>
                <Lbl c="タイトル（任意）"/>
                <input type="text" placeholder="例: 第3回定期戦 vs ○○" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} style={inp}/>
              </div>
            </Sec>

            <Sec title="📝 振り返り" accent={accent}>
              <Lbl c="今日の振り返り（全体）"/>
              <textarea placeholder="今日の練習/試合はどうでしたか？" value={form.reflection} onChange={e=>setForm({...form,reflection:e.target.value})} style={tx}/>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:10}}>
                <div><Lbl c="✅ よかった点"/><textarea placeholder="うまくできたこと..." value={form.good} onChange={e=>setForm({...form,good:e.target.value})} style={{...tx,minHeight:70,borderColor:"#14532d"}}/></div>
                <div><Lbl c="🔧 改善点"/><textarea placeholder="次回修正したいこと..." value={form.improve} onChange={e=>setForm({...form,improve:e.target.value})} style={{...tx,minHeight:70,borderColor:"#7f1d1d"}}/></div>
              </div>
            </Sec>

            <Sec title="💪 体調・メンタル" accent={accent}>
              <div style={{display:"flex",flexDirection:"column",gap:16}}>
                <EmojiPick value={form.physical} onChange={v=>setForm({...form,physical:v})} emojis={CONDITION_EMOJI} label="体調"/>
                <EmojiPick value={form.mental} onChange={v=>setForm({...form,mental:v})} emojis={MENTAL_EMOJI} label="メンタル"/>
              </div>
            </Sec>

            <Sec title="⚖️ 体重" accent={accent}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <input type="number" step="0.1" placeholder="例: 68.5" value={form.weight} onChange={e=>setForm({...form,weight:e.target.value})} style={{...inp,width:140}}/>
                <span style={{color:"#64748b",fontSize:15}}>kg</span>
              </div>
            </Sec>

            <Sec title="🍽 食事・カロリー" accent={accent}>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {form.meals.map((meal,i)=>(
                  <div key={i} style={{display:"flex",gap:8,alignItems:"center"}}>
                    <input type="text" placeholder="料理名（例: 鶏むね肉）" value={meal.name} onChange={e=>updateMeal(i,"name",e.target.value)} style={{...inp,flex:2}}/>
                    <input type="number" placeholder="kcal" value={meal.kcal} onChange={e=>updateMeal(i,"kcal",e.target.value)} style={{...inp,flex:1,minWidth:0}}/>
                    {form.meals.length>1 && <button onClick={()=>removeMeal(i)} style={{...btn,background:"#1e293b",color:"#f87171",padding:"8px 10px",flexShrink:0}}>×</button>}
                  </div>
                ))}
                {form.meals.some(m=>m.kcal) && <div style={{textAlign:"right",color:"#fb923c",fontSize:13,fontWeight:700}}>合計 {form.meals.reduce((s,m)=>s+(parseInt(m.kcal)||0),0)} kcal</div>}
                <button onClick={addMeal} style={{...btn,background:"#1e293b",color:"#94a3b8",marginTop:4,alignSelf:"flex-start",border:"1px dashed #334155"}}>＋ 食事を追加</button>
              </div>
            </Sec>

            <Sec title="▶ 参考動画（YouTube など）" accent={accent}>
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                {form.videos.map((video,i)=>{
                  const ytId=getYouTubeId(video.url);
                  return (
                    <div key={i} style={{background:"#020617",border:"1px solid #1e293b",borderRadius:10,padding:12}}>
                      <div style={{display:"flex",gap:8,marginBottom:8}}>
                        <input type="text" placeholder="YouTubeのURLを貼り付け" value={video.url} onChange={e=>updateVideo(i,"url",e.target.value)} style={{...inp,flex:1}}/>
                        {form.videos.length>1 && <button onClick={()=>removeVideo(i)} style={{...btn,background:"#1e293b",color:"#f87171",padding:"8px 10px",flexShrink:0}}>×</button>}
                      </div>
                      {ytId && <img src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`} alt="" style={{width:"100%",borderRadius:8,marginBottom:8,display:"block"}}/>}
                      <input type="text" placeholder="メモ（例: この動画のフォームを真似する）" value={video.memo} onChange={e=>updateVideo(i,"memo",e.target.value)} style={inp}/>
                    </div>
                  );
                })}
                <button onClick={addVideo} style={{...btn,background:"#1e293b",color:"#94a3b8",alignSelf:"flex-start",border:"1px dashed #334155"}}>＋ 動画を追加</button>
              </div>
            </Sec>

            <Sec title="🎯 目標管理" accent={accent}>
              <Lbl c="今回の目標"/>
              <input type="text" placeholder="例: ディフェンスの1対1を強化する" value={form.goals} onChange={e=>setForm({...form,goals:e.target.value})} style={inp}/>
              {form.goals && (
                <div style={{marginTop:10}}>
                  <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}>
                    <input type="checkbox" checked={form.goalDone} onChange={e=>setForm({...form,goalDone:e.target.checked})} style={{width:18,height:18,cursor:"pointer",accentColor:accent}}/>
                    <span style={{color:"#94a3b8",fontSize:14}}>目標達成した！</span>
                  </label>
                </div>
              )}
              <div style={{marginTop:10}}>
                <Lbl c="次回の目標"/>
                <input type="text" placeholder="例: 次回は○○を意識する" value={form.nextGoal} onChange={e=>setForm({...form,nextGoal:e.target.value})} style={inp}/>
              </div>
            </Sec>

            <button onClick={save} style={{...btn,width:"100%",padding:14,fontSize:15,marginTop:8,fontWeight:800,background:`linear-gradient(135deg,${accent}aa,${accent})`,color:"#000"}}>
              {editId?"✅ 更新する":"💾 保存する"}
            </button>
          </div>
        )}

        {/* ── STATS ── */}
        {view==="stats" && (
          <div>
            <h2 style={{fontSize:17,color:"#f1f5f9",marginTop:0}}>📊 {settings.name} の統計</h2>
            {sportEntries.length===0 ? (
              <div style={{textAlign:"center",padding:"60px 20px",color:"#334155"}}>
                <div style={{fontSize:48,marginBottom:12}}>📈</div>
                <div>ノートを記録すると統計が表示されます</div>
              </div>
            ):<>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:14}}>
                <StatCard label="総記録数" value={sportEntries.length} unit="件" color={accent}/>
                <StatCard label="平均体調" value={(sportEntries.reduce((s,e)=>s+e.physical,0)/sportEntries.length).toFixed(1)} unit="/ 5" color="#f59e0b"/>
                <StatCard label="平均メンタル" value={(sportEntries.reduce((s,e)=>s+e.mental,0)/sportEntries.length).toFixed(1)} unit="/ 5" color="#818cf8"/>
              </div>
              {(latestW||avgKcal) && (
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
                  {latestW && <StatCard label="最新体重" value={latestW} unit="kg" color="#38bdf8"/>}
                  {avgKcal  && <StatCard label="平均カロリー" value={avgKcal} unit="kcal/日" color="#fb923c"/>}
                </div>
              )}
              {weightData.length>0 && (
                <div style={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:12,padding:16,marginBottom:14}}>
                  <SL c="⚖️ 体重の推移"/>
                  <WeightGraph data={weightData} accent={accent}/>
                </div>
              )}
              {Object.keys(typeCount).length>0 && (
                <div style={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:12,padding:16,marginBottom:14}}>
                  <SL c="📋 種別の内訳"/>
                  {Object.entries(typeCount).map(([type,count])=>{
                    const color=type==="試合"?"#ef4444":type==="自主練"?"#10b981":accent;
                    const pct=Math.round((count/sportEntries.length)*100);
                    return (
                      <div key={type} style={{marginBottom:10}}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                          <span style={{fontSize:13,color:"#94a3b8"}}>{type}</span>
                          <span style={{fontSize:13,color}}>{count}件 ({pct}%)</span>
                        </div>
                        <div style={{height:6,background:"#1e293b",borderRadius:3}}>
                          <div style={{height:"100%",width:`${pct}%`,background:color,borderRadius:3}}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {(()=>{
                const wg=sportEntries.filter(e=>e.goals);
                const done=wg.filter(e=>e.goalDone);
                if(!wg.length)return null;
                const pct=Math.round((done.length/wg.length)*100);
                return (
                  <div style={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:12,padding:16}}>
                    <SL c="🎯 目標達成率"/>
                    <div style={{display:"flex",alignItems:"center",gap:16}}>
                      <div style={{width:64,height:64,borderRadius:"50%",background:`conic-gradient(${accent} ${pct*3.6}deg,#1e293b 0deg)`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        <div style={{width:46,height:46,borderRadius:"50%",background:"#0f172a",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:accent}}>{pct}%</div>
                      </div>
                      <div style={{color:"#94a3b8",fontSize:13}}>
                        {wg.length}件の目標のうち<br/>
                        <span style={{color:accent,fontWeight:700,fontSize:16}}>{done.length}件</span>を達成
                      </div>
                    </div>
                  </div>
                );
              })()}
            </>}
          </div>
        )}
      </div>
    </div>
  );
}
