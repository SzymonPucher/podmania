export type HowToPlayTabId =
  | 'controls'
  | 'turning'
  | 'overheating'
  | 'hull'
  | 'landings';

export type HowToPlaySceneId =
  | 'controls_keyboard'
  | 'controls_mobile'
  | 'turning'
  | 'overheating'
  | 'hull'
  | 'landings_boost'
  | 'landings_avoid';

export interface HowToPlaySubOption {
  id: HowToPlaySceneId;
  label: string;
}

export interface HowToPlayTopic {
  id: HowToPlayTabId;
  tabLabel: string;
  title: string;
  defaultScene: HowToPlaySceneId;
  subOptions?: HowToPlaySubOption[];
  takeaways: Partial<Record<HowToPlaySceneId, string[]>>;
}

export interface FrameRenderResult {
  phaseText: string;
  phaseTone: 'neutral' | 'amber' | 'cyan' | 'green' | 'red';
  progress: number;
}

export const HOW_TO_PLAY_TOPICS: HowToPlayTopic[] = [
  {
    id: 'controls',
    tabLabel: 'Controls',
    title: 'Twin-Engine Control Scheme',
    defaultScene: 'controls_keyboard',
    subOptions: [
      { id: 'controls_keyboard', label: 'Keyboard' },
      { id: 'controls_mobile', label: 'Mobile Touch' },
    ],
    takeaways: {
      controls_keyboard: [
        '<strong>Left Engine:</strong> <kbd>A</kbd> -30% (Reverse) · <kbd>S</kbd> 30% · <kbd>D</kbd> 70% · <kbd>F</kbd> 100% · Release = 0%.',
        '<strong>Right Engine:</strong> <kbd>K</kbd> 100% · <kbd>L</kbd> 70% · <kbd>;</kbd> 30% · <kbd>\'</kbd> -30% (Reverse) · Release = 0%.',
        '<strong>Mod Tank:</strong> Hold <kbd>Space</kbd> for Nitro Boost or Engine Coolant (if equipped).',
        '<strong>Quick Keys:</strong> <kbd>Backspace</kbd> Last CP · <kbd>R</kbd> Restart · <kbd>H</kbd> Minimal HUD · <kbd>Esc</kbd> Pause.',
      ],
      controls_mobile: [
        '<strong>Twin Sliders:</strong> Left &amp; right screen halves control each engine independently. Higher = more thrust; release = 0%.',
        '<strong>Full Snap &amp; Reverse:</strong> Top 20% of each rail snaps to <strong>100%</strong>; sliding below the bottom notch engages <strong>-30% Reverse</strong>.',
        '<strong>Center Mod Zone:</strong> Slide either finger inward past the dashed line to activate <strong>Nitro</strong> or <strong>Coolant</strong> while keeping throttle.',
      ],
    },
  },
  {
    id: 'turning',
    tabLabel: 'Turning',
    title: 'Differential-Thrust Turning',
    defaultScene: 'turning',
    takeaways: {
      turning: [
        '<strong>No Steering Wheel:</strong> You turn strictly by creating a thrust difference between your Left and Right engines.',
        '<strong>Push Outside, Cut Inside:</strong> More <strong>Right</strong> thrust turns <strong>Left</strong> (and vice versa). The pod leans into the turn for extra carving grip.',
        '<strong>Hairpin Airbrake:</strong> Drop the inside engine to <strong>0%</strong> or <strong>-30% Reverse</strong> while keeping the outside at 100% to whip around tight corners.',
        '<strong>Mid-Air Authority:</strong> Steering while airborne is reduced to ~28%, so line up your approach before the ramp lip.',
      ],
    },
  },
  {
    id: 'overheating',
    tabLabel: 'Overheating',
    title: 'Engine Heat & Lockout',
    defaultScene: 'overheating',
    takeaways: {
      overheating: [
        '<strong>Independent Heat:</strong> Each engine tracks heat from 0% to 100%. Running <strong>100%</strong> thrust builds <strong>+10%/s</strong> heat.',
        '<strong>Overheat Penalty:</strong> Hitting <strong>100%</strong> deals <strong>-10% Hull</strong> and locks that engine to <strong>0%</strong> until it cools back down to <strong>70%</strong>.',
        '<strong>Cooling Rates:</strong> <strong>70%</strong> cools <strong>-5%/s</strong> · <strong>30%</strong> cools <strong>-10%/s</strong> · <strong>0%</strong> cools <strong>-20%/s</strong>. Water fords &amp; Coolant speed this up.',
      ],
    },
  },
  {
    id: 'hull',
    tabLabel: 'Hull Integrity',
    title: 'Hull Integrity & Speed Tiers',
    defaultScene: 'hull',
    takeaways: {
      hull: [
        '<strong>Performance Penalties:</strong> Dropping below <strong>75%</strong> cuts speed &amp; accel by <strong>-5%</strong>, below <strong>50%</strong> by <strong>-10%</strong>, and below <strong>25%</strong> by <strong>-20%</strong>.',
        '<strong>0% = Wrecked:</strong> Reaching 0% triggers Rapid Unscheduled Disassembly. Respawn at your last checkpoint (<kbd>Backspace</kbd>) to restore 100% hull.',
        '<strong>Watch Out For:</strong> Un-flared landings, firing standard engines high in mid-air, overheats (-10%), wall scrapes, and &gt;200 km/h head-on hits.',
      ],
    },
  },
  {
    id: 'landings',
    tabLabel: 'Jump Landings',
    title: 'Jump Cooldown & Vector Boost',
    defaultScene: 'landings_boost',
    subOptions: [
      { id: 'landings_boost', label: 'Perfect Vector Boost' },
      { id: 'landings_avoid', label: 'What to Avoid' },
    ],
    takeaways: {
      landings_boost: [
        '<strong>1. Cut Both Engines:</strong> After launch, keep both engines at <strong>0%</strong> for at least <strong>0.5s</strong> until <em>COAST READY</em>.',
        '<strong>2. Ignite Right Before Ground:</strong> Fire both engines together just before touchdown (<strong>≤0.15s</strong>) for <strong>0% damage</strong> and a massive <strong>Vector Boost</strong>.',
        '<strong>Flying Engines Mod:</strong> Bypasses the 0.5s cut &amp; air overload — keep engines on to land safely (no Vector Boost).',
      ],
      landings_avoid: [
        '<strong>Air Overload:</strong> Firing standard engines above <strong>7.5m</strong> clearance drains hull continuously and resets your 0.5s Coast Ready timer.',
        '<strong>Hard Impact:</strong> Touching down without flaring deals <strong>-6% to -55%</strong> hull damage and scrubs <strong>35%</strong> of your forward speed.',
      ],
    },
  },
];

const C = {
  bg: '#090e17',
  grid: 'rgba(148, 163, 184, 0.08)',
  panel: 'rgba(15, 23, 42, 0.85)',
  border: 'rgba(255, 255, 255, 0.14)',
  text: '#f8fafc',
  muted: '#94a3b8',
  amber: '#f59e0b',
  gold: '#fbbf24',
  cyan: '#38bdf8',
  green: '#34d399',
  red: '#f87171',
  orange: '#f97316',
  plasma: '#e040fb',
};

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const radius = Math.min(r, w * 0.5, h * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawBackdrop(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  scrollOffset = 0
): void {
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, w, h);

  const step = 32;
  ctx.strokeStyle = C.grid;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= w; x += step) {
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, h);
  }
  const yStart = ((scrollOffset % step) + step) % step;
  for (let y = yStart; y <= h; y += step) {
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(w, y + 0.5);
  }
  ctx.stroke();
}

function drawGaugeBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  frac: number,
  color: string,
  label: string,
  valText: string
): void {
  ctx.font = '700 11px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = C.muted;
  ctx.textAlign = 'left';
  ctx.fillText(label.toUpperCase(), x, y - 5);

  ctx.fillStyle = C.text;
  ctx.textAlign = 'right';
  ctx.fillText(valText, x + w, y - 5);

  drawRoundedRect(ctx, x, y, w, h, h * 0.5);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.fill();

  const fillW = Math.max(0, Math.min(1, frac)) * w;
  if (fillW > 0.5) {
    drawRoundedRect(ctx, x, y, fillW, h, h * 0.5);
    ctx.fillStyle = color;
    ctx.fill();
  }
}

interface TopDownPodOpts {
  cx: number;
  cy: number;
  angle: number;
  scale?: number;
  pLeft: number;
  pRight: number;
  heatLeft?: number;
  heatRight?: number;
  cockpitSwing?: number;
  roll?: number;
  nitro?: boolean;
  boost?: boolean;
  vibration?: number;
  timeSec: number;
}

function drawPodTopDown(
  ctx: CanvasRenderingContext2D,
  opts: TopDownPodOpts
): void {
  const {
    cx,
    cy,
    angle,
    scale = 1,
    pLeft,
    pRight,
    heatLeft = 0,
    heatRight = 0,
    cockpitSwing = 0,
    roll = 0,
    nitro = false,
    boost = false,
    vibration = 0,
    timeSec,
  } = opts;

  const vibX = vibration > 0 ? Math.sin(timeSec * 57) * vibration : 0;
  const vibY = vibration > 0 ? Math.cos(timeSec * 63) * vibration : 0;

  ctx.save();
  ctx.translate(cx + vibX, cy + vibY);
  ctx.rotate(angle);
  ctx.scale(scale, scale);

  const engSpread = 22 * (1 - Math.abs(roll) * 0.16);
  const engY = -18;
  const cockX = cockpitSwing * 18;
  const cockY = 30 + Math.abs(cockpitSwing) * 4;

  // Tether cables from engines to cockpit
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.65)';
  ctx.lineWidth = 2;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * engSpread, engY + 14);
    ctx.quadraticCurveTo(
      side * engSpread * 0.55 + cockX * 0.35,
      (engY + 14 + cockY) * 0.5,
      cockX + side * 4,
      cockY - 8
    );
    ctx.stroke();
  }

  // Crackling magenta plasma binder between engine tips
  ctx.strokeStyle = C.plasma;
  ctx.lineWidth = 2.5;
  ctx.shadowColor = C.plasma;
  ctx.shadowBlur = 10;
  ctx.beginPath();
  const segs = 7;
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const bx = lerp(-engSpread + 4, engSpread - 4, t);
    const jitter =
      i === 0 || i === segs
        ? 0
        : Math.sin(timeSec * 28 + i * 3.7) * 3.2;
    const by = engY - 12 + jitter;
    if (i === 0) ctx.moveTo(bx, by);
    else ctx.lineTo(bx, by);
  }
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Draw left & right engines
  const drawEngine = (side: -1 | 1, power: number, heat: number) => {
    const ex = side * engSpread;
    const ey = engY - power * 4;

    // Exhaust plume (back) or reverse puff (front)
    if (power > 0.04) {
      const plumeLen = (14 + power * 34) * (nitro || boost ? 1.45 : 1);
      const grad = ctx.createLinearGradient(ex, ey + 18, ex, ey + 18 + plumeLen);
      grad.addColorStop(
        0,
        nitro ? '#ec4899' : boost ? C.cyan : C.gold
      );
      grad.addColorStop(1, 'rgba(245, 158, 11, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(ex - 5, ey + 18);
      ctx.lineTo(ex + 5, ey + 18);
      ctx.lineTo(
        ex + Math.sin(timeSec * 40 + side) * 2,
        ey + 18 + plumeLen
      );
      ctx.closePath();
      ctx.fill();
    } else if (power < -0.04) {
      const revLen = 18;
      const grad = ctx.createLinearGradient(ex, ey - 18, ex, ey - 18 - revLen);
      grad.addColorStop(0, C.red);
      grad.addColorStop(1, 'rgba(248, 113, 113, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(ex - 6, ey - 18);
      ctx.lineTo(ex + 6, ey - 18);
      ctx.lineTo(ex, ey - 18 - revLen);
      ctx.closePath();
      ctx.fill();
    }

    // Nacelle body
    const heatMix = clamp01(heat / 100);
    const bodyColor =
      heatMix > 0.75
        ? '#ef4444'
        : heatMix > 0.45
          ? '#f97316'
          : '#cbd5e1';
    drawRoundedRect(ctx, ex - 6.5, ey - 18, 13, 36, 5);
    ctx.fillStyle = bodyColor;
    ctx.fill();
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Intake nosecone
    ctx.fillStyle = nitro ? '#f97316' : '#38bdf8';
    ctx.beginPath();
    ctx.arc(ex, ey - 14, 3.2, 0, Math.PI * 2);
    ctx.fill();
  };

  drawEngine(-1, pLeft, heatLeft);
  drawEngine(1, pRight, heatRight);

  // Trailing cockpit
  ctx.save();
  ctx.translate(cockX, cockY);
  ctx.rotate(cockpitSwing * 0.35);
  drawRoundedRect(ctx, -8, -12, 16, 24, 7);
  ctx.fillStyle = '#e2e8f0';
  ctx.fill();
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Canopy
  drawRoundedRect(ctx, -4.5, -5, 9, 10, 4);
  ctx.fillStyle = C.cyan;
  ctx.fill();
  ctx.restore();

  ctx.restore();
}

function drawKeycap(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  keyLabel: string,
  subLabel: string,
  state: 'idle' | 'pos' | 'rev' | 'mod'
): void {
  drawRoundedRect(ctx, x, y, w, h, 7);
  if (state === 'pos') {
    ctx.fillStyle = 'rgba(245, 158, 11, 0.38)';
    ctx.strokeStyle = C.amber;
  } else if (state === 'rev') {
    ctx.fillStyle = 'rgba(248, 113, 113, 0.38)';
    ctx.strokeStyle = C.red;
  } else if (state === 'mod') {
    ctx.fillStyle = 'rgba(249, 115, 22, 0.38)';
    ctx.strokeStyle = C.orange;
  } else {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  }
  ctx.fill();
  ctx.lineWidth = state === 'idle' ? 1 : 2;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = C.text;
  ctx.font = '800 13px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(keyLabel, x + w * 0.5, y + h * 0.48);

  if (subLabel) {
    ctx.fillStyle = state === 'idle' ? C.muted : '#fef3c7';
    ctx.font = '600 9.5px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(subLabel, x + w * 0.5, y + h * 0.8);
  }
}

/* -------------------------------------------------------------------------- */
/*  Scene 1A: Controls — Keyboard                                             */
/* -------------------------------------------------------------------------- */
function renderControlsKeyboard(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  timeSec: number
): FrameRenderResult {
  const dur = 8.4;
  const t = timeSec % dur;
  const progress = t / dur;

  // Beats:
  // 0.0-2.0: Full thrust F + K
  // 2.0-4.2: Stepped throttle D + L (70%) -> S + ; (30%) -> A + ' (-30% rev)
  // 4.2-6.4: Differential carve F (100%) + ; (30%) -> turns RIGHT
  // 6.4-8.4: Spacebar Nitro/Coolant + F + K
  let pL = 0;
  let pR = 0;
  let activeL = '';
  let activeR = '';
  let spaceOn = false;
  let podAngle = 0;
  let swing = 0;
  let phaseText = 'FULL THRUST: F + K';
  let phaseTone: FrameRenderResult['phaseTone'] = 'amber';

  if (t < 2.0) {
    pL = 1;
    pR = 1;
    activeL = 'F';
    activeR = 'K';
    phaseText = 'FULL THRUST: F (100%) + K (100%)';
    phaseTone = 'amber';
  } else if (t < 2.8) {
    pL = 0.7;
    pR = 0.7;
    activeL = 'D';
    activeR = 'L';
    phaseText = 'CRUISE / COOL: D (70%) + L (70%)';
    phaseTone = 'cyan';
  } else if (t < 3.5) {
    pL = 0.3;
    pR = 0.3;
    activeL = 'S';
    activeR = ';';
    phaseText = 'LIGHT THRUST: S (30%) + ; (30%)';
    phaseTone = 'cyan';
  } else if (t < 4.3) {
    pL = -0.3;
    pR = -0.3;
    activeL = 'A';
    activeR = "'";
    phaseText = 'REVERSE AIRBRAKE: A (-30%) + \' (-30%)';
    phaseTone = 'red';
  } else if (t < 6.4) {
    pL = 1.0;
    pR = 0.3;
    activeL = 'F';
    activeR = ';';
    const turnEase = Math.sin(clamp01((t - 4.3) / 2.1) * Math.PI);
    podAngle = turnEase * 0.42;
    swing = -turnEase * 0.65;
    phaseText = 'TURN RIGHT: LEFT HIGH (F) + RIGHT LOW (;)';
    phaseTone = 'green';
  } else {
    pL = 1.0;
    pR = 1.0;
    activeL = 'F';
    activeR = 'K';
    spaceOn = true;
    phaseText = 'MOD TANK: HOLD SPACE (NITRO / COOLANT)';
    phaseTone = 'amber';
  }

  drawBackdrop(ctx, w, h, t * 140);

  // Pod preview in upper-center
  drawPodTopDown(ctx, {
    cx: w * 0.5,
    cy: h * 0.29,
    angle: podAngle,
    scale: 1.05,
    pLeft: pL,
    pRight: pR,
    cockpitSwing: swing,
    nitro: spaceOn,
    timeSec,
  });

  // Left & Right Keycap Clusters
  const keyW = Math.min(48, (w * 0.38) / 4 - 6);
  const keyH = 44;
  const gap = 6;
  const clusterW = keyW * 4 + gap * 3;
  const yKeys = h * 0.54;
  const leftStartX = w * 0.5 - clusterW - 22;
  const rightStartX = w * 0.5 + 22;

  ctx.font = '800 10px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = C.muted;
  ctx.textAlign = 'left';
  ctx.fillText('LEFT ENGINE', leftStartX, yKeys - 8);
  ctx.textAlign = 'right';
  ctx.fillText('RIGHT ENGINE', rightStartX + clusterW, yKeys - 8);

  const leftKeys = [
    { k: 'A', s: '-30%', rev: true },
    { k: 'S', s: '30%', rev: false },
    { k: 'D', s: '70%', rev: false },
    { k: 'F', s: '100%', rev: false },
  ];
  leftKeys.forEach((item, i) => {
    const isAct = activeL === item.k;
    drawKeycap(
      ctx,
      leftStartX + i * (keyW + gap),
      yKeys,
      keyW,
      keyH,
      item.k,
      item.s,
      isAct ? (item.rev ? 'rev' : 'pos') : 'idle'
    );
  });

  const rightKeys = [
    { k: 'K', s: '100%', rev: false },
    { k: 'L', s: '70%', rev: false },
    { k: ';', s: '30%', rev: false },
    { k: "'", s: '-30%', rev: true },
  ];
  rightKeys.forEach((item, i) => {
    const isAct = activeR === item.k;
    drawKeycap(
      ctx,
      rightStartX + i * (keyW + gap),
      yKeys,
      keyW,
      keyH,
      item.k,
      item.s,
      isAct ? (item.rev ? 'rev' : 'pos') : 'idle'
    );
  });

  // Spacebar
  const spaceW = Math.min(240, w * 0.42);
  drawKeycap(
    ctx,
    w * 0.5 - spaceW * 0.5,
    yKeys + keyH + 12,
    spaceW,
    34,
    'SPACE',
    'Nitro / Coolant',
    spaceOn ? 'mod' : 'idle'
  );

  return { phaseText, phaseTone, progress };
}

/* -------------------------------------------------------------------------- */
/*  Scene 1B: Controls — Mobile Touch                                         */
/* -------------------------------------------------------------------------- */
function renderControlsMobile(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  timeSec: number
): FrameRenderResult {
  const dur = 8.4;
  const t = timeSec % dur;
  const progress = t / dur;

  drawBackdrop(ctx, w, h, t * 90);

  // Stylized phone frame
  const phoneW = Math.min(w - 40, 440);
  const phoneH = h - 32;
  const px = (w - phoneW) * 0.5;
  const py = 16;

  drawRoundedRect(ctx, px, py, phoneW, phoneH, 16);
  ctx.fillStyle = 'rgba(13, 19, 30, 0.92)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Center divider & mid-zone lines (28% / 72%)
  const midL = px + phoneW * 0.28;
  const midR = px + phoneW * 0.72;
  ctx.setLineDash([5, 5]);
  ctx.strokeStyle = 'rgba(249, 115, 22, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(midL, py + 24);
  ctx.lineTo(midL, py + phoneH - 20);
  ctx.moveTo(midR, py + 24);
  ctx.lineTo(midR, py + phoneH - 20);
  ctx.stroke();
  ctx.setLineDash([]);

  // Left & Right rails
  const railTop = py + phoneH * 0.18;
  const railBot = py + phoneH * 0.9;
  const railZero = py + phoneH * 0.78;
  const railFull = railTop + (railBot - railTop) * 0.2;
  const railLX = px + 22;
  const railRX = px + phoneW - 22;

  for (const rx of [railLX, railRX]) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(rx, railTop);
    ctx.lineTo(rx, railBot);
    ctx.stroke();

    // Zero notch
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(rx - 6, railZero);
    ctx.lineTo(rx + 6, railZero);
    ctx.stroke();
  }

  ctx.font = '700 9px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = C.muted;
  ctx.textAlign = 'left';
  ctx.fillText('100% SNAP', railLX + 10, railFull + 3);
  ctx.fillText('0% NEUTRAL', railLX + 10, railZero + 3);
  ctx.fillText('-30% REV', railLX + 10, railBot + 3);

  // Animate two fingers
  let fLX = px + phoneW * 0.15;
  let fLY = railZero;
  let fRX = px + phoneW * 0.85;
  let fRY = railZero;
  let inMid = false;
  let pL = 0;
  let pR = 0;
  let phaseText = 'SLIDE UP FOR THROTTLE';
  let phaseTone: FrameRenderResult['phaseTone'] = 'amber';

  if (t < 2.2) {
    const k = smoothstep(0.1, 1.4, t);
    fLY = lerp(railZero, railFull - 8, k);
    fRY = lerp(railZero, railFull - 8, k);
    pL = k;
    pR = k;
    phaseText = 'SLIDE UP: TOP 20% SNAPS TO 100%';
    phaseTone = 'amber';
  } else if (t < 4.3) {
    const k = smoothstep(2.2, 3.2, t);
    fLY = lerp(railFull - 8, railBot, k);
    fRY = railFull - 8;
    pL = lerp(1, -0.3, k);
    pR = 1;
    phaseText = 'BELOW NOTCH: -30% REVERSE (SHARP LEFT)';
    phaseTone = 'red';
  } else if (t < 6.5) {
    const k = smoothstep(4.3, 5.2, t);
    fLY = railFull;
    fRY = railFull;
    fLX = lerp(px + phoneW * 0.15, px + phoneW * 0.36, k);
    pL = 1;
    pR = 1;
    inMid = k > 0.6;
    phaseText = 'SLIDE INWARD: ACTIVATE NITRO / COOLANT';
    phaseTone = 'amber';
  } else {
    fLY = railZero;
    fRY = railZero;
    pL = 0;
    pR = 0;
    phaseText = 'RELEASE FINGER = 0% IDLE';
    phaseTone = 'cyan';
  }

  // Rail fills
  const drawRailFill = (rx: number, p: number) => {
    ctx.lineWidth = 4;
    if (p > 0.02) {
      ctx.strokeStyle = inMid ? C.orange : p >= 0.99 ? C.amber : '#fff';
      ctx.beginPath();
      ctx.moveTo(rx, railZero);
      ctx.lineTo(rx, lerp(railZero, railTop, p));
      ctx.stroke();
    } else if (p < -0.02) {
      ctx.strokeStyle = C.red;
      ctx.beginPath();
      ctx.moveTo(rx, railZero);
      ctx.lineTo(rx, lerp(railZero, railBot, Math.abs(p) / 0.3));
      ctx.stroke();
    }
  };
  drawRailFill(railLX, pL);
  drawRailFill(railRX, pR);

  // Pod in center of phone
  drawPodTopDown(ctx, {
    cx: w * 0.5,
    cy: py + phoneH * 0.48,
    angle: pR > pL ? -0.32 : 0,
    scale: 0.88,
    pLeft: pL,
    pRight: pR,
    cockpitSwing: pR > pL ? 0.5 : 0,
    nitro: inMid,
    timeSec,
  });

  if (inMid) {
    ctx.font = '800 10px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = C.orange;
    ctx.textAlign = 'center';
    ctx.fillText('NITRO / COOL ACTIVE', w * 0.5, py + 32);
  }

  // Finger rings
  const drawFinger = (fx: number, fy: number, active: boolean, rev: boolean, mod: boolean) => {
    ctx.beginPath();
    ctx.arc(fx, fy, 17, 0, Math.PI * 2);
    ctx.fillStyle = active ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.03)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = mod
      ? C.orange
      : rev
        ? C.red
        : active
          ? C.amber
          : 'rgba(255,255,255,0.35)';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(fx, fy, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
  };

  drawFinger(fLX, fLY, t < 6.5, pL < 0, inMid);
  drawFinger(fRX, fRY, t < 6.5, pR < 0, false);

  return { phaseText, phaseTone, progress };
}

/* -------------------------------------------------------------------------- */
/*  Scene 2: Turning — Differential Thrust                                    */
/* -------------------------------------------------------------------------- */
function renderTurning(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  timeSec: number
): FrameRenderResult {
  const dur = 9.0;
  const t = timeSec % dur;
  const progress = t / dur;

  drawBackdrop(ctx, w, h, t * 170);

  let pL = 1;
  let pR = 1;
  let angle = 0;
  let swing = 0;
  let roll = 0;
  let phaseText = 'BALANCED THRUST (100% / 100%) = STRAIGHT';
  let phaseTone: FrameRenderResult['phaseTone'] = 'cyan';

  if (t < 2.2) {
    pL = 1;
    pR = 1;
  } else if (t < 5.4) {
    const k = Math.sin(clamp01((t - 2.2) / 3.2) * Math.PI);
    pL = lerp(1, 0.3, k);
    pR = 1;
    angle = -0.45 * k;
    swing = 0.7 * k;
    roll = 0.55 * k;
    phaseText = 'CARVE LEFT: RIGHT 100% > LEFT 30%';
    phaseTone = 'amber';
  } else {
    const k = Math.sin(clamp01((t - 5.4) / 3.6) * Math.PI);
    pL = 1;
    pR = lerp(1, -0.3, k);
    angle = 0.72 * k;
    swing = -0.95 * k;
    roll = -0.75 * k;
    phaseText = 'HAIRPIN RIGHT: LEFT 100% + RIGHT -30% REVERSE';
    phaseTone = 'red';
  }

  // Curved canyon guide lines
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.18)';
  ctx.lineWidth = 3;
  for (const lane of [-85, 85]) {
    ctx.beginPath();
    ctx.moveTo(w * 0.5 + lane, 0);
    ctx.quadraticCurveTo(w * 0.5 + lane + angle * 110, h * 0.5, w * 0.5 + lane, h);
    ctx.stroke();
  }

  drawPodTopDown(ctx, {
    cx: w * 0.5 + angle * 55,
    cy: h * 0.48,
    angle,
    scale: 1.25,
    pLeft: pL,
    pRight: pR,
    cockpitSwing: swing,
    roll,
    timeSec,
  });

  // Live thrust meters in bottom corners
  const margin = w < 380 ? 14 : 24;
  const barW = w < 380 ? Math.min(124, w * 0.38) : Math.min(150, w * 0.28);
  const leftLabel = w < 380 ? 'Left' : 'Left Thrust';
  const rightLabel = w < 380 ? 'Right' : 'Right Thrust';
  drawGaugeBar(
    ctx,
    margin,
    h - 30,
    barW,
    9,
    Math.abs(pL),
    pL < 0 ? C.red : C.amber,
    leftLabel,
    `${Math.round(pL * 100)}%`
  );
  drawGaugeBar(
    ctx,
    w - barW - margin,
    h - 30,
    barW,
    9,
    Math.abs(pR),
    pR < 0 ? C.red : C.amber,
    rightLabel,
    `${Math.round(pR * 100)}%`
  );

  return { phaseText, phaseTone, progress };
}

/* -------------------------------------------------------------------------- */
/*  Scene 3: Overheating — Heat & Lockout                                     */
/* -------------------------------------------------------------------------- */
function renderOverheating(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  timeSec: number
): FrameRenderResult {
  const dur = 9.0;
  const t = timeSec % dur;
  const progress = t / dur;

  drawBackdrop(ctx, w, h, 0);

  // Beats:
  // 0.0-3.2: Running 100% -> Heat climbs 40% -> 100%
  // 3.2-5.6: OVERHEAT LOCKOUT! Engine forced 0%, -10% Hull pop, cools 100% -> 70%
  // 5.6-9.0: Recovered! Feathering at 70% -> cools slowly (-5%/s)
  let heat = 40;
  let overheated = false;
  let hull = 100;
  let power = 1.0;
  let phaseText = '100% THRUST: +10%/s HEAT BUILDUP';
  let phaseTone: FrameRenderResult['phaseTone'] = 'amber';

  if (t < 3.2) {
    heat = lerp(40, 100, t / 3.2);
    power = 1.0;
  } else if (t < 5.6) {
    overheated = true;
    hull = 90;
    power = 0;
    heat = lerp(100, 70, (t - 3.2) / 2.4);
    phaseText = 'OVERHEAT! -10% HULL · LOCKED TO 0% UNTIL 70%';
    phaseTone = 'red';
  } else {
    hull = 90;
    power = 0.7;
    heat = lerp(70, 52, (t - 5.6) / 3.4);
    phaseText = 'RECOVERED AT 70% · FEATHER AT 70% (-5%/s COOL)';
    phaseTone = 'green';
  }

  // Close-up turbine nacelle on left
  const cx = w * 0.28;
  const cy = h * 0.5;
  const heatFrac = clamp01(heat / 100);
  const vib = overheated ? 2.5 : power > 0.9 ? 1.0 : 0;

  ctx.save();
  ctx.translate(
    cx + Math.sin(timeSec * 55) * vib,
    cy + Math.cos(timeSec * 61) * vib
  );

  // Glow aura when hot
  if (heatFrac > 0.6) {
    ctx.beginPath();
    ctx.arc(0, 0, 54, 0, Math.PI * 2);
    ctx.fillStyle = overheated
      ? 'rgba(239, 68, 68, 0.22)'
      : 'rgba(249, 115, 22, 0.14)';
    ctx.fill();
  }

  // Exhaust flame
  if (power > 0) {
    const len = 34 + power * 36;
    const g = ctx.createLinearGradient(0, 42, 0, 42 + len);
    g.addColorStop(0, power >= 0.99 ? C.gold : C.cyan);
    g.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-12, 42);
    ctx.lineTo(12, 42);
    ctx.lineTo(Math.sin(timeSec * 36) * 3, 42 + len);
    ctx.closePath();
    ctx.fill();
  }

  // Nacelle cylinder
  drawRoundedRect(ctx, -18, -46, 36, 90, 12);
  ctx.fillStyle =
    overheated || heatFrac > 0.85
      ? '#ef4444'
      : heatFrac > 0.55
        ? '#f97316'
        : '#cbd5e1';
  ctx.fill();
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Spinning intake blades
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(0, -34, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = C.cyan;
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    const a = timeSec * (power * 16 + 2) + (i * Math.PI * 2) / 3;
    ctx.beginPath();
    ctx.moveTo(0, -34);
    ctx.lineTo(Math.cos(a) * 9, -34 + Math.sin(a) * 9);
    ctx.stroke();
  }
  ctx.restore();

  // Telemetry panel on right
  const px = w * 0.48;
  const pw = w * 0.44;
  drawRoundedRect(ctx, px, h * 0.2, pw, h * 0.62, 12);
  ctx.fillStyle = C.panel;
  ctx.fill();
  ctx.strokeStyle = overheated ? C.red : C.border;
  ctx.lineWidth = overheated ? 2 : 1;
  ctx.stroke();

  const bx = px + 18;
  const bw = pw - 36;

  drawGaugeBar(
    ctx,
    bx,
    h * 0.34,
    bw,
    12,
    heatFrac,
    overheated || heat >= 85 ? C.red : heat >= 55 ? C.orange : C.amber,
    'Engine Heat',
    overheated ? `OVERHEAT ${Math.round(heat)}%` : `${Math.round(heat)}%`
  );

  // 70% unlock marker
  const markerX = bx + bw * 0.7;
  ctx.strokeStyle = C.green;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(markerX, h * 0.34 - 3);
  ctx.lineTo(markerX, h * 0.34 + 15);
  ctx.stroke();
  ctx.font = '700 9.5px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = C.green;
  ctx.textAlign = 'center';
  ctx.fillText('70% UNLOCK', markerX, h * 0.34 + 27);

  drawGaugeBar(
    ctx,
    bx,
    h * 0.56,
    bw,
    10,
    power,
    overheated ? C.red : C.cyan,
    'Applied Thrust',
    overheated ? 'LOCKED (0%)' : `${Math.round(power * 100)}%`
  );

  drawGaugeBar(
    ctx,
    bx,
    h * 0.73,
    bw,
    10,
    hull / 100,
    hull >= 75 ? C.cyan : C.gold,
    'Hull Integrity',
    `${hull}%`
  );

  return { phaseText, phaseTone, progress };
}

/* -------------------------------------------------------------------------- */
/*  Scene 4: Hull Integrity & Malfunction Tiers                               */
/* -------------------------------------------------------------------------- */
function renderHullIntegrity(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  timeSec: number
): FrameRenderResult {
  const dur = 10.0;
  const t = timeSec % dur;
  const progress = t / dur;

  drawBackdrop(ctx, w, h, t < 8.0 ? t * 130 : 0);

  let hull = 100;
  let penalty = 0;
  let color = C.cyan;
  let phaseText = '100%–75% HULL: NOMINAL (FULL SPEED)';
  let phaseTone: FrameRenderResult['phaseTone'] = 'cyan';

  if (t < 2.0) {
    hull = 100;
    penalty = 0;
    color = C.cyan;
  } else if (t < 4.0) {
    hull = 68;
    penalty = 5;
    color = '#facc15';
    phaseText = '< 75% HULL: -5% ACCEL & MAX SPEED';
    phaseTone = 'amber';
  } else if (t < 6.0) {
    hull = 42;
    penalty = 10;
    color = C.amber;
    phaseText = '< 50% HULL: -10% ACCEL & MAX SPEED';
    phaseTone = 'amber';
  } else if (t < 8.0) {
    hull = 18;
    penalty = 20;
    color = C.red;
    phaseText = '< 25% HULL: -20% ACCEL & MAX SPEED';
    phaseTone = 'red';
  } else {
    hull = 0;
    penalty = 100;
    color = C.red;
    phaseText = '0% HULL: RAPID UNSCHEDULED DISASSEMBLY!';
    phaseTone = 'red';
  }

  const podX = w * 0.3;
  const podY = h * 0.5;

  if (hull > 0) {
    const vib = penalty === 0 ? 0 : penalty * 0.16;
    drawPodTopDown(ctx, {
      cx: podX,
      cy: podY,
      angle: 0,
      scale: 1.15,
      pLeft: 1 - penalty / 100,
      pRight: 1 - penalty / 100,
      heatLeft: penalty >= 20 ? 70 : 0,
      heatRight: penalty >= 20 ? 70 : 0,
      vibration: vib,
      timeSec,
    });
  } else {
    // Stylized disassembly burst
    const k = clamp01((t - 8.0) / 1.8);
    ctx.save();
    ctx.translate(podX, podY);
    const parts = [
      { dx: -48, dy: -26, r: 0.9, w: 12, h: 28 },
      { dx: 52, dy: -18, r: -1.1, w: 12, h: 28 },
      { dx: 6, dy: 42, r: 0.5, w: 16, h: 20 },
    ];
    for (const p of parts) {
      ctx.save();
      ctx.translate(p.dx * k, p.dy * k);
      ctx.rotate(p.r * k * 2.5);
      drawRoundedRect(ctx, -p.w * 0.5, -p.h * 0.5, p.w, p.h, 4);
      ctx.fillStyle = '#cbd5e1';
      ctx.fill();
      ctx.restore();
    }
    if (k < 0.5) {
      ctx.beginPath();
      ctx.arc(0, 0, 12 + k * 70, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(248, 113, 113, ${1 - k * 2})`;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    ctx.restore();
  }

  // Right side hull & speed readout
  const px = w * 0.5;
  const pw = w * 0.43;
  drawRoundedRect(ctx, px, h * 0.22, pw, h * 0.58, 12);
  ctx.fillStyle = C.panel;
  ctx.fill();
  ctx.strokeStyle = hull < 25 ? C.red : C.border;
  ctx.lineWidth = hull < 25 ? 2 : 1;
  ctx.stroke();

  const bx = px + 18;
  const bw = pw - 36;
  drawGaugeBar(
    ctx,
    bx,
    h * 0.36,
    bw,
    12,
    hull / 100,
    color,
    'Hull Integrity',
    hull > 0 ? `${hull}%` : '0% WRECKED'
  );

  // Tier ticks at 25%, 50%, 75%
  for (const frac of [0.25, 0.5, 0.75]) {
    const tx = bx + bw * frac;
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(tx, h * 0.36);
    ctx.lineTo(tx, h * 0.36 + 12);
    ctx.stroke();
  }

  const maxSpeed = hull > 0 ? Math.round(376 * (1 - penalty / 100)) : 0;
  ctx.textAlign = 'left';
  ctx.font = '700 11px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = C.muted;
  ctx.fillText('EFFECTIVE TOP SPEED', bx, h * 0.56);

  ctx.font = '900 30px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = color;
  ctx.fillText(`${maxSpeed} KM/H`, bx, h * 0.69);

  if (penalty > 0 && hull > 0) {
    ctx.textAlign = 'right';
    ctx.font = '800 13px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = C.red;
    ctx.fillText(`-${penalty}%`, bx + bw, h * 0.69);
  }

  return { phaseText, phaseTone, progress };
}

/* -------------------------------------------------------------------------- */
/*  Scene 5A: Jump Landings — Perfect Vector Boost                            */
/* -------------------------------------------------------------------------- */
function drawSidePod(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  pitch: number,
  thrust: number,
  boost: boolean,
  overload: boolean,
  timeSec: number
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(pitch);

  // Tether + trailing cockpit
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.7)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-4, 0);
  ctx.lineTo(-26, 4);
  ctx.stroke();

  drawRoundedRect(ctx, -38, -2, 16, 10, 4);
  ctx.fillStyle = '#e2e8f0';
  ctx.fill();

  // Exhaust plume
  if (thrust > 0.05) {
    const len = 18 + thrust * 24;
    const g = ctx.createLinearGradient(-4, 0, -4 - len, 0);
    g.addColorStop(0, boost ? C.cyan : C.gold);
    g.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-4, -5);
    ctx.lineTo(-4, 5);
    ctx.lineTo(-4 - len, Math.sin(timeSec * 40) * 2);
    ctx.closePath();
    ctx.fill();
  }

  // Main engine nacelle
  drawRoundedRect(ctx, -6, -7, 30, 14, 6);
  ctx.fillStyle = overload ? C.red : '#cbd5e1';
  ctx.fill();
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.restore();
}

function renderLandingsBoost(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  timeSec: number
): FrameRenderResult {
  const dur = 7.2;
  const t = timeSec % dur;
  const progress = t / dur;

  drawBackdrop(ctx, w, h, 0);

  // Terrain profile: launch ramp -> chasm -> landing slope
  const groundY = h * 0.78;
  const rampEndX = w * 0.25;
  const landStartX = w * 0.68;

  ctx.fillStyle = 'rgba(180, 120, 70, 0.28)';
  ctx.strokeStyle = C.amber;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(0, groundY);
  ctx.lineTo(w * 0.14, groundY);
  ctx.lineTo(rampEndX, groundY - 46);
  ctx.lineTo(rampEndX + 20, h);
  ctx.lineTo(landStartX - 24, h);
  ctx.lineTo(landStartX, groundY - 12);
  ctx.lineTo(w, groundY + 12);
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(0, groundY);
  ctx.lineTo(w * 0.14, groundY);
  ctx.lineTo(rampEndX, groundY - 46);
  ctx.moveTo(landStartX, groundY - 12);
  ctx.lineTo(w, groundY + 12);
  ctx.stroke();

  // 7.5m High-Air reference line
  const highAirY = groundY - 82;
  ctx.setLineDash([5, 5]);
  ctx.strokeStyle = 'rgba(248, 113, 113, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(rampEndX, highAirY);
  ctx.lineTo(landStartX, highAirY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.font = '700 9.5px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = 'rgba(248, 113, 113, 0.75)';
  ctx.textAlign = 'center';
  ctx.fillText('HIGH AIR (>7.5m)', w * 0.46, highAirY - 6);

  // Trajectory & pod state
  // 0.0-1.3: Ramp launch (engines on)
  // 1.3-4.3: Coasting mid-air (engines 0%, 0.5s timer fills -> COAST READY)
  // 4.3-5.1: Flare window! Both engines ignite right before ground
  // 5.1-7.2: Touchdown! Cyan shockwave + Vector Boost surge
  let px = w * 0.08;
  let py = groundY - 14;
  let pitch = 0;
  let thrust = 1;
  let boost = false;
  let coastFrac = 0;
  let phaseText = '1. LAUNCH OFF RAMP';
  let phaseTone: FrameRenderResult['phaseTone'] = 'amber';

  if (t < 1.3) {
    const k = t / 1.3;
    px = lerp(w * 0.06, rampEndX, k);
    py = k < 0.5 ? groundY - 14 : lerp(groundY - 14, groundY - 60, (k - 0.5) * 2);
    pitch = k < 0.5 ? 0 : -0.35;
    thrust = 1;
  } else if (t < 5.1) {
    const airK = (t - 1.3) / (5.1 - 1.3);
    px = lerp(rampEndX, landStartX + 20, airK);
    const arc = Math.sin(airK * Math.PI);
    py = lerp(groundY - 60, groundY - 24, airK) - arc * 105;
    pitch = lerp(-0.35, 0.28, airK);
    const isFlare = t >= 4.45;
    thrust = isFlare ? 1 : 0;
    coastFrac = clamp01((t - 1.3) / 1.1);
    if (!isFlare) {
      phaseText =
        coastFrac >= 1
          ? '2. COAST READY ✓ — WAIT FOR GROUND'
          : '2. CUT BOTH ENGINES (0%) FOR 0.5s';
      phaseTone = coastFrac >= 1 ? 'cyan' : 'amber';
    } else {
      phaseText = '3. ENGINES ON NOW! (≤0.15s FLARE)';
      phaseTone = 'green';
    }
  } else {
    const k = (t - 5.1) / 2.1;
    px = lerp(landStartX + 20, w * 0.94, k);
    py = lerp(groundY - 24, groundY - 2, k);
    pitch = 0.08;
    thrust = 1;
    boost = true;
    phaseText = 'VECTOR BOOST! 0% DMG + HUGE SPEED SURGE';
    phaseTone = 'green';

    // Shockwave ring at touchdown
    if (k < 0.45) {
      const sk = k / 0.45;
      ctx.beginPath();
      ctx.ellipse(landStartX + 20, groundY - 10, 12 + sk * 46, 5 + sk * 14, 0.08, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(56, 189, 248, ${1 - sk})`;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }

  drawSidePod(ctx, px, py, pitch, thrust, boost, false, timeSec);

  // Coast Ready radial badge top-right
  if (t >= 1.3 && t < 5.1) {
    const rx = w - 82;
    const ry = 48;
    ctx.beginPath();
    ctx.arc(rx, ry, 20, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(rx, ry, 20, -Math.PI / 2, -Math.PI / 2 + coastFrac * Math.PI * 2);
    ctx.strokeStyle = coastFrac >= 1 ? C.green : C.cyan;
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.font = '800 9.5px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = coastFrac >= 1 ? C.green : C.text;
    ctx.textAlign = 'center';
    ctx.fillText(coastFrac >= 1 ? 'READY' : '0.5s', rx, ry + 3);
  }

  return { phaseText, phaseTone, progress };
}

/* -------------------------------------------------------------------------- */
/*  Scene 5B: Jump Landings — What to Avoid                                   */
/* -------------------------------------------------------------------------- */
function renderLandingsAvoid(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  timeSec: number
): FrameRenderResult {
  const dur = 7.4;
  const t = timeSec % dur;
  const progress = t / dur;

  drawBackdrop(ctx, w, h, 0);

  const groundY = h * 0.78;
  const rampEndX = w * 0.22;
  const landStartX = w * 0.68;

  ctx.strokeStyle = C.amber;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(0, groundY);
  ctx.lineTo(rampEndX, groundY - 40);
  ctx.moveTo(landStartX, groundY - 12);
  ctx.lineTo(w, groundY + 12);
  ctx.stroke();

  const highAirY = groundY - 78;
  ctx.setLineDash([5, 5]);
  ctx.strokeStyle = 'rgba(248, 113, 113, 0.5)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(rampEndX, highAirY);
  ctx.lineTo(landStartX, highAirY);
  ctx.stroke();
  ctx.setLineDash([]);

  // First half: Air Overload (0 - 3.7s). Second half: Un-flared Hard Impact (3.7 - 7.4s).
  const isOverloadBeat = t < 3.7;
  const localT = isOverloadBeat ? t / 3.7 : (t - 3.7) / 3.7;

  let px = lerp(rampEndX, landStartX + 20, clamp01(localT * 1.15));
  const arc = Math.sin(clamp01(localT * 1.15) * Math.PI);
  let py = lerp(groundY - 56, groundY - 22, clamp01(localT * 1.15)) - arc * 102;
  let hull = 100;
  let phaseText = 'AIR OVERLOAD: THRUSTING >7.5m DRAINS HULL!';
  const phaseTone: FrameRenderResult['phaseTone'] = 'red';

  if (isOverloadBeat) {
    hull = Math.round(lerp(100, 68, localT));
    drawSidePod(ctx, px, py, lerp(-0.3, 0.2, localT), 1.0, false, true, timeSec);
    // Sparks
    ctx.fillStyle = C.red;
    for (let i = 0; i < 5; i++) {
      const sx = px - 10 + Math.sin(timeSec * 30 + i * 2) * 18;
      const sy = py + Math.cos(timeSec * 35 + i * 3) * 14;
      ctx.fillRect(sx, sy, 3, 3);
    }
  } else {
    const impactK = clamp01((localT - 0.7) / 0.3);
    if (localT < 0.7) {
      const k = localT / 0.7;
      px = lerp(rampEndX, landStartX + 16, k);
      const a = Math.sin(k * Math.PI);
      py = lerp(groundY - 56, groundY - 20, k) - a * 95;
    } else {
      px = lerp(landStartX + 16, w * 0.82, impactK);
      py = groundY - 12;
      hull = 64;
      if (impactK < 0.6) {
        ctx.beginPath();
        ctx.arc(landStartX + 16, groundY - 10, 10 + impactK * 45, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(248, 113, 113, ${1 - impactK * 1.6})`;
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    }
    phaseText =
      localT < 0.7
        ? 'NO FLARE BEFORE TOUCHDOWN...'
        : 'HARD IMPACT! -36% HULL & -35% SPEED';
    drawSidePod(ctx, px, py, 0.22, 0, false, localT >= 0.7, timeSec);
  }

  drawGaugeBar(
    ctx,
    w - 180,
    28,
    156,
    10,
    hull / 100,
    hull > 75 ? C.cyan : C.red,
    'Hull Integrity',
    `${hull}%`
  );

  return { phaseText, phaseTone, progress };
}

export function renderHowToPlayFrame(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  sceneId: HowToPlaySceneId,
  timeSec: number
): FrameRenderResult {
  switch (sceneId) {
    case 'controls_keyboard':
      return renderControlsKeyboard(ctx, w, h, timeSec);
    case 'controls_mobile':
      return renderControlsMobile(ctx, w, h, timeSec);
    case 'turning':
      return renderTurning(ctx, w, h, timeSec);
    case 'overheating':
      return renderOverheating(ctx, w, h, timeSec);
    case 'hull':
      return renderHullIntegrity(ctx, w, h, timeSec);
    case 'landings_boost':
      return renderLandingsBoost(ctx, w, h, timeSec);
    case 'landings_avoid':
      return renderLandingsAvoid(ctx, w, h, timeSec);
  }
}
