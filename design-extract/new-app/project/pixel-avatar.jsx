// pixel-avatar.jsx — MTB App: configurable PixelAvatar + shared components

const BIKE_COLORS = [
  { label:'Schwarz', value:'#1a1a1a' },
  { label:'Grau',    value:'#555555' },
  { label:'Blau',    value:'#1a3a99' },
  { label:'Rot',     value:'#991a1a' },
  { label:'Grün',    value:'#1a6620' },
  { label:'Gold',    value:'#997700' },
];

const JERSEY_CONFIGS = [
  { label:'Weiß',    J:'#e8e4dc', D:'#9a9890' },
  { label:'Schwarz', J:'#1a1a1a', D:'#333333' },
  { label:'Rot',     J:'#cc2200', D:'#881500' },
];

const AVATAR_PALETTES = {
  rookie:  { H:'#39ff14', V:'#1a4a08', S:'#d4a574', E:'#111' },
  veteran: { H:'#ffd700', V:'#7a5500', S:'#d4a574', E:'#111' },
  legend:  { H:'#bf00ff', V:'#5a0080', S:'#d4a574', E:'#111' },
};

// 12 cols × 17 rows — rider on MTB, front-facing
// B = bike/handlebars (configurable color)
// W = wheel (dark)
// X = rear shock (silver, only on fully)
// K = coil spring (gray, only on coil fork)
function getAvatarRows(bikeType, suspType) {
  const frameRow = bikeType === 'fully'
    ? ".BBBBXBBBB.."   // X = shock absorber
    : ".BBBBBBBBB..";
  const forkRow = suspType === 'coil'
    ? "BKB......BKB"   // K = coil spring band
    : "BB.......BB.";
  return [
    "....HHHH....",   // 0  helmet top
    "...HHHHHH...",   // 1  helmet
    "..HHHHHHHH..",   // 2  helmet wide
    "..HVVVVVHH..",   // 3  visor
    "..HSSSSSHH..",   // 4  face
    "..HSE.E.SH..",   // 5  eyes
    "..HSSSSSHH..",   // 6  face lower
    "BJJJJJJJJJJB",   // 7  jersey + handlebars (B on both sides)
    "BJJJDDJJJJJB",   // 8  jersey stripe + bars
    "..JJJJJJJJJ.",   // 9  jersey lower
    "...JJJJJJJ..",   // 10 waist
    "....JJ.JJ...",   // 11 hips
    "...BBB.BBB..",   // 12 legs / pedals
    frameRow,          // 13 frame (hardtail or fully)
    forkRow,           // 14 fork (air or coil)
    "WW.......WW.",   // 15 wheel tops
    ".WWW...WWW..",   // 16 wheel arcs
  ];
}

function PixelAvatar({
  tier = 'rookie', px = 3,
  accentColor = null,
  bikeColor = null,
  jerseyJ = null, jerseyD = null,
  bikeType = 'hardtail', suspType = 'air',
  style = {}
}) {
  const base = AVATAR_PALETTES[tier] || AVATAR_PALETTES.rookie;
  const pal = {
    ...base,
    H: accentColor || base.H,
    J: jerseyJ || '#e8e4dc',
    D: jerseyD || '#9a9890',
    B: bikeColor || '#1a1a1a',
    W: '#0d0d0d',
    X: '#888888',  // rear shock silver
    K: '#666666',  // coil spring
  };
  const rows = getAvatarRows(bikeType, suspType);
  const cols = rows[0].length;
  const rects = [];
  rows.forEach((row, ri) =>
    [...row].forEach((ch, ci) => {
      if (ch === '.') return;
      rects.push(<rect key={`${ri}-${ci}`} x={ci*px} y={ri*px} width={px} height={px} fill={pal[ch]||'#fff'}/>);
    })
  );
  return (
    <svg width={cols*px} height={rows.length*px} viewBox={`0 0 ${cols*px} ${rows.length*px}`}
      style={{ imageRendering:'pixelated', display:'block', ...style }}>
      {rects}
    </svg>
  );
}

function StatCard({ label, value, unit, accent='#39ff14', glowing=false, cardStyle='outlined' }) {
  const bg  = { outlined:'transparent', glass:'rgba(255,255,255,0.03)', solid:'#181411' };
  const bdr = { outlined: glowing?`${accent}bb`:'rgba(255,255,255,0.09)', glass:'rgba(255,255,255,0.13)', solid:'rgba(255,255,255,0.07)' };
  return (
    <div style={{ flex:1, background:bg[cardStyle]||'transparent', border:`1px solid ${bdr[cardStyle]}`,
      borderRadius:14, padding:'12px 12px 10px',
      boxShadow: glowing?`0 0 28px ${accent}44,inset 0 1px 0 ${accent}22`:'none' }}>
      <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:9, fontWeight:700,
        letterSpacing:'0.14em', color:'#5a5550', textTransform:'uppercase', marginBottom:6 }}>
        {label}
      </div>
      <div style={{ fontFamily:"'Space Mono',monospace", fontSize:20, fontWeight:700,
        color:'#e8e4dc', lineHeight:1, display:'flex', alignItems:'baseline', gap:3 }}>
        {value}<span style={{ fontSize:10, color:'#5a5550', fontWeight:400 }}>{unit}</span>
      </div>
    </div>
  );
}

function MiniChart({ data, accent='#39ff14', h=72, id='chart' }) {
  const vw=300, pad=8;
  const max=Math.max(...data), min=Math.min(...data), range=max-min||1;
  const pts=data.map((v,i)=>[ (i/(data.length-1))*vw, h-pad-((v-min)/range)*(h-pad*2) ]);
  const poly=pts.map(p=>p.join(',')).join(' ');
  const fill=[`0,${h}`,...pts.map(p=>p.join(',')),`${vw},${h}`].join(' ');
  return (
    <svg width="100%" viewBox={`0 0 ${vw} ${h}`} preserveAspectRatio="none" style={{display:'block'}}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.28"/>
          <stop offset="100%" stopColor={accent} stopOpacity="0.01"/>
        </linearGradient>
      </defs>
      <polygon points={fill} fill={`url(#${id})`}/>
      <polyline points={poly} fill="none" stroke={accent} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
      {pts.map(([x,y],i)=><circle key={i} cx={x} cy={y} r="3.5" fill={accent}/>)}
    </svg>
  );
}

Object.assign(window, { PixelAvatar, StatCard, MiniChart, AVATAR_PALETTES, BIKE_COLORS, JERSEY_CONFIGS, getAvatarRows });
