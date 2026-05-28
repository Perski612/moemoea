// screens.jsx — MOE MOEA Trails App screens (updated)
const { useState } = React;

// ── MOCK DATA ─────────────────────────────────────────────────────────────────

const AIRTIMES = [0.8,1.2,1.8,1.4,2.1,1.9,2.0,2.3,2.1,2.34];

const FEED_ITEMS = [
  { id:1, user:'TrailKing_Max',   tier:'veteran', bike:'Trek Slash 9.9',     fires:142, verified:true,  time:'vor 2h' },
  { id:2, user:'DirtQueen_Sara',  tier:'rookie',  bike:'Santa Cruz Bronson', fires:98,  verified:true,  time:'vor 5h' },
  { id:3, user:'GravelGuru',      tier:'legend',  bike:'Specialized Enduro', fires:67,  verified:false, time:'vor 1d' },
  { id:4, user:'Ramp_Rider_Bene', tier:'rookie',  bike:'Yeti SB140',         fires:45,  verified:true,  time:'vor 2d' },
];

const LEADERBOARD = {
  airtime: [
    { rank:1, user:'TrailKing_Max',   tier:'veteran', value:'3.82', unit:'s',    bike:'Trek Slash',    team:'MOE MOEA Crew' },
    { rank:2, user:'DirtQueen_Sara',  tier:'rookie',  value:'3.21', unit:'s',    bike:'SC Bronson',    team:'Singletrack Sisters' },
    { rank:3, user:'MaxTrailblazer',  tier:'rookie',  value:'2.34', unit:'s',    bike:'Trek Slash',    team:'MOE MOEA Crew', isMe:true },
    { rank:4, user:'GravelGuru',      tier:'legend',  value:'2.11', unit:'s',    bike:'Enduro',        team:'Trail Devils' },
    { rank:5, user:'FatTire_Franz',   tier:'rookie',  value:'1.98', unit:'s',    bike:'Orbea Rallon',  team:'MOE MOEA Crew' },
    { rank:6, user:'BikePark_Bene',   tier:'rookie',  value:'1.87', unit:'s',    bike:'Canyon Strive', team:'Dirt Crew' },
    { rank:7, user:'Ramp_Rider_Bene', tier:'rookie',  value:'1.76', unit:'s',    bike:'Yeti SB140',    team:'Solo' },
  ],
  gforce: [
    { rank:1, user:'GravelGuru',      tier:'legend',  value:'5.8',  unit:'g',    bike:'Enduro',        team:'Trail Devils' },
    { rank:2, user:'TrailKing_Max',   tier:'veteran', value:'5.2',  unit:'g',    bike:'Trek Slash',    team:'MOE MOEA Crew' },
    { rank:3, user:'Ramp_Rider_Bene', tier:'rookie',  value:'4.9',  unit:'g',    bike:'Yeti SB140',    team:'Solo' },
    { rank:4, user:'MaxTrailblazer',  tier:'rookie',  value:'4.2',  unit:'g',    bike:'Trek Slash',    team:'MOE MOEA Crew', isMe:true },
    { rank:5, user:'DirtQueen_Sara',  tier:'rookie',  value:'3.8',  unit:'g',    bike:'SC Bronson',    team:'Singletrack Sisters' },
  ],
  speed: [
    { rank:1, user:'DirtQueen_Sara',  tier:'rookie',  value:'78',   unit:'km/h', bike:'SC Bronson',    team:'Singletrack Sisters' },
    { rank:2, user:'TrailKing_Max',   tier:'veteran', value:'74',   unit:'km/h', bike:'Trek Slash',    team:'MOE MOEA Crew' },
    { rank:3, user:'BikePark_Bene',   tier:'rookie',  value:'71',   unit:'km/h', bike:'Canyon Strive', team:'Dirt Crew' },
    { rank:4, user:'MaxTrailblazer',  tier:'rookie',  value:'67',   unit:'km/h', bike:'Trek Slash',    team:'MOE MOEA Crew', isMe:true },
    { rank:5, user:'FatTire_Franz',   tier:'rookie',  value:'64',   unit:'km/h', bike:'Orbea Rallon',  team:'MOE MOEA Crew' },
  ],
  style: [
    { rank:1, user:'TrailKing_Max',   tier:'veteran', value:'892',  unit:'pts',  bike:'Trek Slash',    team:'MOE MOEA Crew' },
    { rank:2, user:'DirtQueen_Sara',  tier:'rookie',  value:'744',  unit:'pts',  bike:'SC Bronson',    team:'Singletrack Sisters' },
    { rank:3, user:'GravelGuru',      tier:'legend',  value:'612',  unit:'pts',  bike:'Enduro',        team:'Trail Devils' },
    { rank:4, user:'MaxTrailblazer',  tier:'rookie',  value:'487',  unit:'pts',  bike:'Trek Slash',    team:'MOE MOEA Crew', isMe:true },
    { rank:5, user:'Ramp_Rider_Bene', tier:'rookie',  value:'342',  unit:'pts',  bike:'Yeti SB140',    team:'Solo' },
  ],
};

const ACHIEVEMENTS = [
  { id:'first_air',   label:'Erster Flug',   color:'#39ff14', unlocked:true,  desc:'Airtime detektiert' },
  { id:'five_runs',   label:'5 Runs',         color:'#ffd700', unlocked:true,  desc:'5 Sessions' },
  { id:'top3',        label:'Podium',         color:'#bf00ff', unlocked:true,  desc:'Top 3 Rangliste' },
  { id:'trail_care',  label:'Trail-Pfleger',  color:'#00e5ff', unlocked:true,  desc:'Mängel gemeldet' },
  { id:'goldhelmet',  label:'Goldhelm',       color:'#ffd700', unlocked:false, desc:'20 Runs nötig' },
  { id:'contest_win', label:'Contest-Star',   color:'#ff6b00', unlocked:false, desc:'Contest gewinnen' },
];

// ── HELPERS ───────────────────────────────────────────────────────────────────

function Label({ children, accent }) {
  return (
    <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:9, fontWeight:700,
      letterSpacing:'0.18em', color:accent, textTransform:'uppercase', marginBottom:10 }}>
      {children}
    </div>
  );
}

function TierDot({ tier }) {
  const c = { rookie:'#39ff14', veteran:'#ffd700', legend:'#bf00ff' }[tier]||'#aaa';
  return <div style={{ width:6, height:6, borderRadius:'50%', background:c, flexShrink:0, boxShadow:`0 0 6px ${c}` }}/>;
}

function SegBtn({ options, active, onChange, accent }) {
  return (
    <div style={{ display:'flex', gap:4 }}>
      {options.map(o => (
        <button key={o} onClick={() => onChange(o)} style={{
          flex:1, background: active===o ? accent : 'transparent',
          border:`1px solid ${active===o ? accent : 'rgba(255,255,255,0.12)'}`,
          borderRadius:8, padding:'7px 0', cursor:'pointer',
          fontFamily:"'Space Grotesk',sans-serif", fontSize:11, fontWeight:700,
          color: active===o ? '#000' : '#5a5550', transition:'all 0.15s',
        }}>{o}</button>
      ))}
    </div>
  );
}

function ConfigRow({ label, children }) {
  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:9, letterSpacing:'0.12em',
        color:'#5a5550', textTransform:'uppercase', marginBottom:8 }}>{label}</div>
      {children}
    </div>
  );
}

function VideoPlaceholder({ h=200 }) {
  const uid = Math.random().toString(36).slice(2,6);
  return (
    <svg width="100%" height={h} viewBox={`0 0 360 ${h}`} preserveAspectRatio="xMidYMid slice" style={{display:'block'}}>
      <rect width="360" height={h} fill="#0e0c0a"/>
      <defs>
        <pattern id={`s${uid}`} width="20" height="20" patternUnits="userSpaceOnUse" patternTransform="rotate(40)">
          <rect width="20" height="20" fill="#0e0c0a"/>
          <rect width="0.8" height="20" fill="#191512"/>
        </pattern>
      </defs>
      <rect width="360" height={h} fill={`url(#s${uid})`}/>
      <circle cx="180" cy={h/2} r="26" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.12)" strokeWidth="1"/>
      <polygon points={`173,${h/2-11} 193,${h/2} 173,${h/2+11}`} fill="rgba(255,255,255,0.65)"/>
      <text x="180" y={h-12} textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.15)"
        fontFamily="'Space Mono',monospace" letterSpacing="3">MOE MOEA TRAILS</text>
    </svg>
  );
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────────

function DashboardScreen({ accent, cardStyle, dashLayout, bikeConfig }) {
  const P = { padding:'0 16px 100px', fontFamily:"'Space Grotesk',sans-serif" };

  const sessionHeader = (
    <div style={{ padding:'10px 0 14px' }}>
      <div style={{ fontSize:9, letterSpacing:'0.2em', color:accent, textTransform:'uppercase', marginBottom:4 }}>
        ▶ LETZTE SESSION
      </div>
      <div style={{ fontSize:19, fontWeight:700, color:'#e8e4dc', lineHeight:1.15 }}>MOE MOEA Trails</div>
      <div style={{ fontFamily:"'Space Mono',monospace", fontSize:11, color:'#5a5550', marginTop:3 }}>
        12.05.2026 · 14:32 · Neckartal
      </div>
    </div>
  );

  if (dashLayout === 'hud') {
    return (
      <div style={P}>
        {sessionHeader}
        {/* Hero stat */}
        <div style={{ border:`1px solid ${accent}`, borderRadius:16, padding:'18px 20px 14px', marginBottom:12,
          boxShadow:`0 0 40px ${accent}22, inset 0 1px 0 ${accent}18`, background:`${accent}07` }}>
          <div style={{ fontSize:9, letterSpacing:'0.2em', color:accent, textTransform:'uppercase', marginBottom:10 }}>
            MAX. AIRTIME — BESTER SPRUNG
          </div>
          <div style={{ display:'flex', alignItems:'flex-end', gap:8 }}>
            <div style={{ fontFamily:"'Space Mono',monospace", fontSize:62, fontWeight:700, color:'#e8e4dc',
              lineHeight:1, textShadow:`0 0 40px ${accent}99` }}>2.34</div>
            <div style={{ fontFamily:"'Space Mono',monospace", fontSize:17, color:'#5a5550', paddingBottom:8 }}>SEK</div>
          </div>
          <div style={{ marginTop:10, height:1, background:`${accent}28` }}/>
          <div style={{ display:'flex', gap:20, marginTop:8 }}>
            {[['SPRÜNGE','8'],['AVG. LÄNGE','12.4m'],['RANG','#3']].map(([k,v])=>(
              <div key={k}>
                <div style={{ fontSize:8, letterSpacing:'0.12em', color:'#5a5550', textTransform:'uppercase' }}>{k}</div>
                <div style={{ fontFamily:"'Space Mono',monospace", fontSize:13, color:'#e8e4dc', fontWeight:700 }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display:'flex', gap:8, marginBottom:16 }}>
          <StatCard label="G-KRAFT"   value="4.2" unit="g"    accent={accent} cardStyle={cardStyle}/>
          <StatCard label="TOP-SPEED" value="67"  unit="km/h" accent={accent} cardStyle={cardStyle}/>
          <StatCard label="DISTANZ"   value="8.4" unit="km"   accent={accent} cardStyle={cardStyle}/>
        </div>
        <div style={{ marginBottom:16 }}>
          <Label accent={accent}>Airtime Verlauf — 10 Runs</Label>
          <div style={{ border:`1px solid rgba(255,255,255,0.07)`, borderRadius:12, padding:'12px 12px 8px',
            background: cardStyle==='solid'?'#181411':cardStyle==='glass'?'rgba(255,255,255,0.02)':'transparent' }}>
            <MiniChart data={AIRTIMES} accent={accent} h={72} id="d-hud"/>
          </div>
        </div>
        <Label accent={accent}>Letzte Sessions</Label>
        {[
          { trail:'MOE MOEA Trails', date:'heute, 14:32', air:'2.34s', runs:12 },
          { trail:'MOE MOEA Trails', date:'10.05, 11:00', air:'1.98s', runs:9  },
          { trail:'Singletrail Heide', date:'07.05, 09:30', air:'1.44s', runs:6 },
        ].map((s,i)=>(
          <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
            padding:'10px 0', borderBottom:`1px solid rgba(255,255,255,0.06)` }}>
            <div>
              <div style={{ fontSize:13, color:'#e8e4dc', fontWeight:600 }}>{s.trail}</div>
              <div style={{ fontFamily:"'Space Mono',monospace", fontSize:10, color:'#5a5550', marginTop:2 }}>{s.date}</div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontFamily:"'Space Mono',monospace", fontSize:14, color:accent, fontWeight:700 }}>{s.air}</div>
              <div style={{ fontSize:10, color:'#5a5550' }}>{s.runs} Runs</div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Cards layout
  return (
    <div style={P}>
      {sessionHeader}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:16 }}>
        <StatCard label="Max. Airtime" value="2.34" unit="s"    accent={accent} glowing cardStyle={cardStyle}/>
        <StatCard label="G-Kraft"      value="4.2"  unit="g"    accent={accent} cardStyle={cardStyle}/>
        <StatCard label="Top-Speed"    value="67"   unit="km/h" accent={accent} cardStyle={cardStyle}/>
        <StatCard label="Distanz"      value="8.4"  unit="km"   accent={accent} cardStyle={cardStyle}/>
      </div>
      <div style={{ marginBottom:16 }}>
        <Label accent={accent}>Airtime Verlauf — 10 Runs</Label>
        <div style={{ border:`1px solid rgba(255,255,255,0.07)`, borderRadius:12, padding:'12px 12px 8px',
          background: cardStyle==='solid'?'#181411':cardStyle==='glass'?'rgba(255,255,255,0.02)':'transparent' }}>
          <MiniChart data={AIRTIMES} accent={accent} h={80} id="d-cards"/>
        </div>
      </div>
      <Label accent={accent}>Letzte Sessions</Label>
      {[
        { trail:'MOE MOEA Trails', date:'heute', air:'2.34s', runs:12 },
        { trail:'Singletrail Heide', date:'07.05', air:'1.44s', runs:6 },
      ].map((s,i)=>(
        <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 12px',
          background: cardStyle==='solid'?'#181411':'rgba(255,255,255,0.02)',
          border:`1px solid rgba(255,255,255,0.07)`, borderRadius:12, marginBottom:8 }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, color:'#e8e4dc', fontWeight:600 }}>{s.trail}</div>
            <div style={{ fontSize:10, color:'#5a5550' }}>{s.date} · {s.runs} Runs</div>
          </div>
          <div style={{ fontFamily:"'Space Mono',monospace", fontSize:16, color:accent, fontWeight:700 }}>{s.air}</div>
        </div>
      ))}
    </div>
  );
}

// ── FEED ──────────────────────────────────────────────────────────────────────

function FeedScreen({ accent, cardStyle, bikeConfig, onUpload }) {
  const [fires, setFires] = useState(FEED_ITEMS.map(f=>({ count:f.fires, active:false })));
  const toggle = i => setFires(prev => prev.map((f,idx)=>
    idx===i ? { count:f.active?f.count-1:f.count+1, active:!f.active } : f
  ));

  return (
    <div style={{ fontFamily:"'Space Grotesk',sans-serif", paddingBottom:100 }}>
      <div style={{ padding:'10px 16px 14px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <Label accent={accent}>Style Contest</Label>
          <div style={{ fontSize:20, fontWeight:700, color:'#e8e4dc', marginTop:-6 }}>Mai 2026</div>
          <div style={{ fontSize:11, color:'#5a5550', marginTop:2 }}>MOE MOEA Trails · {FEED_ITEMS.filter(f=>f.verified).length} validierte Clips</div>
        </div>
        <div style={{ background:`${accent}18`, border:`1px solid ${accent}55`, borderRadius:8,
          padding:'4px 10px', fontFamily:"'Space Mono',monospace", fontSize:9, color:accent }}>
          LIVE
        </div>
      </div>

      {/* Upload CTA */}
      <div style={{ margin:'0 16px 16px' }}>
        <button onClick={onUpload} style={{
          width:'100%', background:'transparent',
          border:`1px solid ${accent}`, borderRadius:14,
          padding:'14px 16px', cursor:'pointer', textAlign:'left',
          display:'flex', alignItems:'center', gap:12,
          boxShadow:`0 0 20px ${accent}18`,
        }}>
          <div style={{ width:40, height:40, borderRadius:10, background:`${accent}1a`,
            border:`1px solid ${accent}44`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 13V3M9 3L5 7M9 3l4 4" stroke={accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 15h14" stroke={accent} strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:14, fontWeight:700, color:'#e8e4dc', marginBottom:2 }}>Video einreichen</div>
            <div style={{ fontSize:10, color:'#5a5550' }}>QR scannen → aufnehmen → hochladen</div>
          </div>
          <svg width="7" height="12" viewBox="0 0 7 12"><path d="M1 1l5 5-5 5" stroke={accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>

      {/* QR reminder */}
      <div style={{ margin:'0 16px 14px', padding:'10px 12px', borderRadius:10,
        background:'rgba(255,107,0,0.07)', border:'1px solid rgba(255,107,0,0.25)',
        display:'flex', alignItems:'center', gap:10 }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="0.5" y="0.5" width="6" height="6" rx="0.5" stroke="#ff6b00" strokeWidth="1.2"/>
          <rect x="2" y="2" width="3" height="3" fill="#ff6b00"/>
          <rect x="9.5" y="0.5" width="6" height="6" rx="0.5" stroke="#ff6b00" strokeWidth="1.2"/>
          <rect x="11" y="2" width="3" height="3" fill="#ff6b00"/>
          <rect x="0.5" y="9.5" width="6" height="6" rx="0.5" stroke="#ff6b00" strokeWidth="1.2"/>
          <rect x="2" y="11" width="3" height="3" fill="#ff6b00"/>
          <rect x="9.5" y="9.5" width="2.5" height="2.5" fill="#ff6b00"/>
          <rect x="13" y="9.5" width="2.5" height="2.5" fill="#ff6b00"/>
          <rect x="9.5" y="13" width="2.5" height="2.5" fill="#ff6b00"/>
          <rect x="13" y="13" width="2.5" height="2.5" fill="#ff6b00"/>
        </svg>
        <div style={{ fontSize:11, color:'rgba(255,107,0,0.85)' }}>
          QR-Code am Anfang des Videos pflicht — sonst kein Leaderboard!
        </div>
      </div>

      {/* Feed cards */}
      {FEED_ITEMS.map((item, i) => (
        <div key={item.id} style={{ margin:'0 16px 14px',
          border:`1px solid rgba(255,255,255,0.08)`, borderRadius:16, overflow:'hidden',
          background: cardStyle==='solid'?'#181411':'rgba(255,255,255,0.02)' }}>
          <div style={{ position:'relative' }}>
            <VideoPlaceholder h={190}/>
            {item.verified
              ? <div style={{ position:'absolute', top:10, right:10, background:`${accent}22`,
                  border:`1px solid ${accent}77`, borderRadius:20, padding:'3px 10px',
                  fontFamily:"'Space Mono',monospace", fontSize:8, color:accent,
                  display:'flex', alignItems:'center', gap:4 }}>
                  <svg width="7" height="7" viewBox="0 0 7 7"><circle cx="3.5" cy="3.5" r="3" fill={accent}/><path d="M2 3.5l1 1 1.5-1.5" stroke="#000" strokeWidth="1" strokeLinecap="round"/></svg>
                  QR VALID
                </div>
              : <div style={{ position:'absolute', top:10, right:10, background:'rgba(255,40,40,0.13)',
                  border:'1px solid rgba(255,60,60,0.35)', borderRadius:20, padding:'3px 10px',
                  fontFamily:"'Space Mono',monospace", fontSize:8, color:'rgba(255,80,80,0.9)' }}>
                  NICHT VALIDIERT
                </div>
            }
          </div>
          <div style={{ padding:'10px 12px', display:'flex', alignItems:'center', gap:10 }}>
            <PixelAvatar tier={item.tier} px={2} accentColor={accent}/>
            <div style={{ flex:1 }}>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:2 }}>
                <span style={{ fontSize:13, fontWeight:700, color:'#e8e4dc' }}>{item.user}</span>
                <TierDot tier={item.tier}/>
              </div>
              <div style={{ fontSize:10, color:'#5a5550' }}>{item.bike} · {item.time}</div>
            </div>
            <button onClick={()=>toggle(i)} style={{
              background: fires[i].active?'rgba(255,107,0,0.14)':'transparent',
              border:`1px solid ${fires[i].active?'#ff6b00':'rgba(255,255,255,0.12)'}`,
              borderRadius:20, padding:'6px 12px', cursor:'pointer',
              display:'flex', alignItems:'center', gap:5, transition:'all 0.15s',
            }}>
              <svg width="13" height="13" viewBox="0 0 13 13">
                <path d="M6.5 12C4 10 1 8 1 5a3 3 0 015.5-1.7A3 3 0 0112 5c0 3-3 5-5.5 7z"
                  fill={fires[i].active?'#ff6b00':'none'}
                  stroke={fires[i].active?'#ff6b00':'#5a5550'} strokeWidth="1.3"/>
              </svg>
              <span style={{ fontFamily:"'Space Mono',monospace", fontSize:11, fontWeight:700,
                color: fires[i].active?'#ff6b00':'#5a5550' }}>{fires[i].count}</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── LEADERBOARD ───────────────────────────────────────────────────────────────

function LeaderboardScreen({ accent, cardStyle, bikeConfig }) {
  const [tab, setTab] = useState('airtime');
  const tabs = [['airtime','AIRTIME'],['gforce','G-KRAFT'],['speed','SPEED'],['style','STYLE']];
  const data = LEADERBOARD[tab]||[];
  const top3 = data.slice(0,3);
  const rest  = data.slice(3);
  const podiumOrder = [1,0,2];
  const podiumH = [56,76,44];
  const medals = ['#ffd700','#c0c0c0','#cd7f32'];

  return (
    <div style={{ fontFamily:"'Space Grotesk',sans-serif", paddingBottom:100 }}>
      <div style={{ padding:'10px 16px 14px' }}>
        <Label accent={accent}>Rangliste</Label>
        <div style={{ fontSize:20, fontWeight:700, color:'#e8e4dc', marginTop:-6 }}>MOE MOEA Trails</div>
        <div style={{ fontSize:11, color:'#5a5550', marginTop:2 }}>Neckartal · Mai 2026</div>
      </div>
      <div style={{ display:'flex', gap:6, padding:'0 16px 18px', overflowX:'auto' }}>
        {tabs.map(([id,lbl])=>(
          <button key={id} onClick={()=>setTab(id)} style={{
            background: tab===id?accent:'transparent',
            border:`1px solid ${tab===id?accent:'rgba(255,255,255,0.12)'}`,
            borderRadius:20, padding:'6px 14px', cursor:'pointer', whiteSpace:'nowrap',
            fontFamily:"'Space Grotesk',sans-serif", fontSize:10, fontWeight:700,
            letterSpacing:'0.08em', color: tab===id?'#000':'#5a5550', transition:'all 0.15s',
          }}>{lbl}</button>
        ))}
      </div>

      {/* Podium */}
      {top3.length>0 && (
        <div style={{ display:'flex', justifyContent:'center', alignItems:'flex-end', gap:8, padding:'0 20px 22px' }}>
          {podiumOrder.map((pos,idx)=>{
            const e = top3[pos]; if (!e) return null;
            const isGold = pos===0;
            return (
              <div key={pos} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:5 }}>
                {e.isMe
                  ? <PixelAvatar tier={e.tier} px={isGold?4:3} accentColor={accent}
                      bikeColor={bikeConfig.bikeColor} jerseyJ={bikeConfig.jerseyJ}
                      jerseyD={bikeConfig.jerseyD} bikeType={bikeConfig.bikeType} suspType={bikeConfig.susp}/>
                  : <PixelAvatar tier={e.tier} px={isGold?4:3}/>
                }
                <div style={{ fontSize:9, color:'#e8e4dc', fontWeight:700, textAlign:'center',
                  whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:'100%' }}>
                  {e.user}
                </div>
                <div style={{ fontFamily:"'Space Mono',monospace", fontSize:isGold?15:12,
                  color:isGold?accent:'#e8e4dc', fontWeight:700 }}>
                  {e.value}<span style={{ fontSize:9, color:'#5a5550' }}>{e.unit}</span>
                </div>
                <div style={{ width:'100%', height:podiumH[idx], background:`${medals[pos]}1a`,
                  border:`1px solid ${medals[pos]}55`, borderRadius:'6px 6px 0 0',
                  display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <span style={{ fontFamily:"'Space Mono',monospace", fontSize:18, color:medals[pos], fontWeight:700 }}>
                    {pos+1}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List */}
      <div style={{ padding:'0 16px' }}>
        {rest.map(e=>(
          <div key={e.rank} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', marginBottom:6,
            borderRadius:12, background: e.isMe?`${accent}0f`:cardStyle==='solid'?'#181411':'rgba(255,255,255,0.02)',
            border:`1px solid ${e.isMe?accent+'33':'rgba(255,255,255,0.07)'}` }}>
            <div style={{ fontFamily:"'Space Mono',monospace", fontSize:12, color:'#3a3530',
              width:18, textAlign:'center', fontWeight:700 }}>#{e.rank}</div>
            {e.isMe
              ? <PixelAvatar tier={e.tier} px={2} accentColor={accent}
                  bikeColor={bikeConfig.bikeColor} jerseyJ={bikeConfig.jerseyJ}
                  jerseyD={bikeConfig.jerseyD} bikeType={bikeConfig.bikeType} suspType={bikeConfig.susp}/>
              : <PixelAvatar tier={e.tier} px={2}/>
            }
            <div style={{ flex:1 }}>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ fontSize:12, color:'#e8e4dc', fontWeight:e.isMe?700:500 }}>{e.user}</span>
                {e.isMe && <span style={{ fontSize:8, color:accent, letterSpacing:'0.1em' }}>ICH</span>}
              </div>
              <div style={{ fontSize:10, color:'#5a5550' }}>{e.bike}</div>
            </div>
            <div style={{ fontFamily:"'Space Mono',monospace", fontSize:14,
              color:e.isMe?accent:'#e8e4dc', fontWeight:700 }}>
              {e.value}<span style={{ fontSize:9, color:'#5a5550' }}>{e.unit}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── PROFILE ───────────────────────────────────────────────────────────────────

function ProfileScreen({ accent, cardStyle, bikeConfig, onBikeConfigChange }) {
  const xp = 3420, xpMax = 4000;
  const bikeColorOpts = [
    '#1a1a1a','#555555','#1a3a99','#991a1a','#1a6620','#997700',
  ];
  const jerseyOpts = [
    { J:'#e8e4dc', D:'#9a9890' },
    { J:'#1a1a1a', D:'#333' },
    { J:'#cc2200', D:'#881500' },
  ];
  const set = (key, val) => onBikeConfigChange({ ...bikeConfig, [key]: val });

  return (
    <div style={{ fontFamily:"'Space Grotesk',sans-serif", paddingBottom:100 }}>
      {/* Identity */}
      <div style={{ padding:'12px 16px 16px', display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:80, height:80, borderRadius:16, background:'#181411',
            border:`2px solid ${accent}55`, display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow:`0 0 28px ${accent}28` }}>
            <PixelAvatar tier="rookie" px={4} accentColor={accent}
              bikeColor={bikeConfig.bikeColor} jerseyJ={bikeConfig.jerseyJ}
              jerseyD={bikeConfig.jerseyD} bikeType={bikeConfig.bikeType} suspType={bikeConfig.susp}/>
          </div>
          <div>
            <div style={{ fontSize:20, fontWeight:700, color:'#e8e4dc' }}>MaxTrailblazer</div>
            <div style={{ fontSize:11, color:'#5a5550', marginTop:2 }}>MOE MOEA Crew</div>
            <div style={{ display:'inline-flex', background:`${accent}1a`, border:`1px solid ${accent}44`,
              borderRadius:20, padding:'2px 10px', marginTop:5,
              fontFamily:"'Space Mono',monospace", fontSize:10, color:accent }}>LVL 12</div>
          </div>
        </div>
        {/* XP */}
        <div style={{ width:'100%' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
            <span style={{ fontSize:9, letterSpacing:'0.1em', color:'#5a5550', textTransform:'uppercase' }}>Erfahrung</span>
            <span style={{ fontFamily:"'Space Mono',monospace", fontSize:9, color:accent }}>
              {xp.toLocaleString()} / {xpMax.toLocaleString()} XP
            </span>
          </div>
          <div style={{ height:5, background:'rgba(255,255,255,0.07)', borderRadius:99 }}>
            <div style={{ height:'100%', width:`${(xp/xpMax)*100}%`, background:accent,
              borderRadius:99, boxShadow:`0 0 10px ${accent}88` }}/>
          </div>
        </div>
        <div style={{ display:'flex', gap:16 }}>
          {[['342 km','Distanz'],['12','Runs'],['87','Fires'],['#3','Rang']].map(([v,l])=>(
            <div key={l} style={{ textAlign:'center' }}>
              <div style={{ fontFamily:"'Space Mono',monospace", fontSize:15, color:'#e8e4dc', fontWeight:700 }}>{v}</div>
              <div style={{ fontSize:8, letterSpacing:'0.12em', color:'#5a5550', textTransform:'uppercase' }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── AVATAR KONFIGURATOR ── */}
      <div style={{ padding:'0 16px 16px' }}>
        <Label accent={accent}>Avatar Konfigurator</Label>
        <div style={{ background: cardStyle==='solid'?'#181411':'rgba(255,255,255,0.02)',
          border:`1px solid rgba(255,255,255,0.08)`, borderRadius:16, padding:'16px' }}>

          {/* Live preview */}
          <div style={{ display:'flex', justifyContent:'center', marginBottom:18 }}>
            <div style={{ background:'#0c0a07', borderRadius:12, padding:'16px 24px',
              border:`1px solid ${accent}33`, boxShadow:`0 0 24px ${accent}18` }}>
              <PixelAvatar tier="rookie" px={5} accentColor={accent}
                bikeColor={bikeConfig.bikeColor} jerseyJ={bikeConfig.jerseyJ}
                jerseyD={bikeConfig.jerseyD} bikeType={bikeConfig.bikeType} suspType={bikeConfig.susp}/>
            </div>
          </div>

          <ConfigRow label="Fahrrad-Typ">
            <SegBtn options={['Hardtail','Fully']}
              active={bikeConfig.bikeType==='fully'?'Fully':'Hardtail'}
              onChange={v => set('bikeType', v==='Fully'?'fully':'hardtail')}
              accent={accent}/>
          </ConfigRow>

          <ConfigRow label="Federgabel / Dämpfer">
            <SegBtn options={['Air','Coil']}
              active={bikeConfig.susp==='coil'?'Coil':'Air'}
              onChange={v => set('susp', v.toLowerCase())}
              accent={accent}/>
          </ConfigRow>

          <ConfigRow label="Rahmen-Material">
            <SegBtn options={['Aluminium','Carbon']}
              active={bikeConfig.material==='carbon'?'Carbon':'Aluminium'}
              onChange={v => set('material', v.toLowerCase())}
              accent={accent}/>
          </ConfigRow>

          <ConfigRow label="Rahmen-Farbe">
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {bikeColorOpts.map(c=>(
                <button key={c} onClick={()=>set('bikeColor',c)} style={{
                  width:30, height:30, borderRadius:7, background:c, cursor:'pointer',
                  border: bikeConfig.bikeColor===c?`2.5px solid ${accent}`:'2.5px solid transparent',
                  boxShadow: bikeConfig.bikeColor===c?`0 0 12px ${accent}99`:'none',
                  transition:'all 0.1s',
                }}/>
              ))}
            </div>
          </ConfigRow>

          <ConfigRow label="Trikot-Farbe">
            <div style={{ display:'flex', gap:8 }}>
              {jerseyOpts.map((j,i)=>(
                <button key={i} onClick={()=>onBikeConfigChange({...bikeConfig,jerseyJ:j.J,jerseyD:j.D})} style={{
                  width:30, height:30, borderRadius:7, background:j.J, cursor:'pointer',
                  border: bikeConfig.jerseyJ===j.J?`2.5px solid ${accent}`:'2.5px solid transparent',
                  boxShadow: bikeConfig.jerseyJ===j.J?`0 0 12px ${accent}88`:'none',
                  transition:'all 0.1s',
                }}/>
              ))}
            </div>
          </ConfigRow>
        </div>
      </div>

      {/* Achievements */}
      <div style={{ padding:'0 16px 16px' }}>
        <Label accent={accent}>Achievements</Label>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
          {ACHIEVEMENTS.map(a=>(
            <div key={a.id} style={{ border:`1px solid ${a.unlocked?a.color+'44':'rgba(255,255,255,0.06)'}`,
              borderRadius:12, padding:'10px 8px', textAlign:'center',
              background: a.unlocked?`${a.color}09`:'rgba(255,255,255,0.01)', opacity:a.unlocked?1:0.38 }}>
              <div style={{ width:24, height:24, borderRadius:6, margin:'0 auto 6px',
                background:a.unlocked?`${a.color}1a`:'rgba(255,255,255,0.04)',
                border:`1px solid ${a.unlocked?a.color+'44':'rgba(255,255,255,0.1)'}`,
                display:'flex', alignItems:'center', justifyContent:'center' }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:a.unlocked?a.color:'#333' }}/>
              </div>
              <div style={{ fontSize:9, color:a.unlocked?'#e8e4dc':'#5a5550', fontWeight:700, lineHeight:1.3 }}>
                {a.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { DashboardScreen, FeedScreen, LeaderboardScreen, ProfileScreen });
