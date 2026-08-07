/* ================== เสียงเอฟเฟกต์ (สังเคราะห์เองด้วย Web Audio API ไม่ใช้ไฟล์เสียงเลย) ================== */

let audioCtx = null;
let soundMuted = localStorage.getItem('spellquest-muted') === 'true';

function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// เล่นโน้ตเดียว (คลื่นเสียงสังเคราะห์) ความถี่/ระยะเวลา/รูปคลื่น/ความดังตามที่กำหนด
function playTone(freq, duration, type, volume, delay) {
  if (soundMuted) return;
  const ctx = getAudioCtx();
  const startTime = ctx.currentTime + (delay || 0);

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type || 'sine';
  osc.frequency.setValueAtTime(freq, startTime);

  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(volume || 0.2, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.02);
}

// เสียงพุ่ง (whoosh) โดยกวาดความถี่ลงเร็วๆ ใช้ตอนร่ายคาถา/ยิงลูกแสง
function playWhoosh() {
  if (soundMuted) return;
  const ctx = getAudioCtx();
  const startTime = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(900, startTime);
  osc.frequency.exponentialRampToValueAtTime(140, startTime + 0.28);
  gain.gain.setValueAtTime(0.16, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.28);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + 0.3);
}

function playClick() {
  playTone(520, 0.08, 'square', 0.08);
}

function playCorrect() {
  playTone(523.25, 0.14, 'sine', 0.2, 0);    // C5
  playTone(659.25, 0.16, 'sine', 0.2, 0.1);  // E5
  playTone(783.99, 0.22, 'sine', 0.22, 0.2); // G5
}

function playWrong() {
  playTone(220, 0.18, 'sawtooth', 0.18, 0);
  playTone(174.61, 0.28, 'sawtooth', 0.18, 0.12);
}

function playStageClear() {
  playTone(523.25, 0.16, 'triangle', 0.2, 0);
  playTone(659.25, 0.16, 'triangle', 0.2, 0.15);
  playTone(783.99, 0.16, 'triangle', 0.2, 0.3);
  playTone(1046.5, 0.35, 'triangle', 0.24, 0.45);
}

function playStageFail() {
  playTone(392, 0.22, 'sawtooth', 0.18, 0);
  playTone(329.63, 0.22, 'sawtooth', 0.18, 0.18);
  playTone(261.63, 0.4, 'sawtooth', 0.18, 0.36);
}

/* ---------- เพลงประกอบพื้นหลัง (จังหวะเร็ว มีเบส+กลอง+อาร์เปโจ้ วนซ้ำ สังเคราะห์เอง ไม่ใช่ไฟล์เพลง) ---------- */

const musicChords = [
  { tones: [220.00, 261.63, 329.63] }, // Am (root, third, fifth)
  { tones: [261.63, 329.63,392.00] }, // C
  { tones: [196.00, 246.94,293.66] }, // G
  { tones: [174.61, 220.00,261.63] }  // F
];
const musicArpPattern = [0, 2, 1, 2, 0, 2, 1, 2]; // ดัชนีเข้า tones: root-fifth-third-fifth วนไล่ ให้ความรู้สึกเร่งรีบ
const MUSIC_STEP_DURATION = 0.16; // วินาทีต่อจังหวะ (เร็ว ~150 BPM)
const MUSIC_STEPS_PER_CHORD = 8;

let musicStarted = false;
let musicStepCount = 0;
let musicChordIndex = 0;
let musicTimeoutId = null;

// เสียงเบสหนักแน่น (ต่ำกว่ารูทคอร์ด 1 ออกเทฟ) ลงจังหวะหลัก
function playMusicBass(freq, time) {
  const ctx = getAudioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, time);
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(0.16, time + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(time);
  osc.stop(time + 0.32);
}

// เสียงกลองเตะ (kick) สั้นๆ ให้จังหวะกระชับ ตื่นเต้น
function playMusicKick(time) {
  const ctx = getAudioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(130, time);
  osc.frequency.exponentialRampToValueAtTime(45, time + 0.12);
  gain.gain.setValueAtTime(0.22, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(time);
  osc.stop(time + 0.16);
}

// เสียงไฮแฮทเบาๆ (noise สั้นๆ กรองความถี่สูง) ให้จังหวะกระชับทุกสเต็ป
function playMusicHat(time) {
  const ctx = getAudioCtx();
  const bufferSize = Math.floor(ctx.sampleRate * 0.05);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 6500;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.045, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  noise.start(time);
  noise.stop(time + 0.06);
}

// โน้ตอาร์เปโจ้ไล่เร็วๆ (เมโลดี้หลัก ให้ความรู้สึกเร่งด่วน/ผจญภัย)
function playMusicArpNote(freq, time) {
  const ctx = getAudioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(freq, time);
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(0.09, time + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(time);
  osc.stop(time + 0.22);
}

function scheduleNextMusicStep() {
  if (soundMuted) {
    musicTimeoutId = setTimeout(scheduleNextMusicStep, 500);
    return;
  }

  const ctx = getAudioCtx();
  const now = ctx.currentTime + 0.02;
  const chord = musicChords[musicChordIndex % musicChords.length];
  const stepInChord = musicStepCount % MUSIC_STEPS_PER_CHORD;

  // เบส + กลอง ลงจังหวะหนัก (สเต็ป 0 และ 4 ของทุกคอร์ด)
  if (stepInChord === 0 || stepInChord === 4) {
    playMusicBass(chord.tones[0] / 2, now);
    playMusicKick(now);
  }

  // อาร์เปโจ้ไล่โน้ตทุกสเต็ป
  const toneIdx = musicArpPattern[stepInChord % musicArpPattern.length];
  playMusicArpNote(chord.tones[toneIdx], now);

  // ไฮแฮทเบาๆ ทุกสเต็ป ให้จังหวะกระชับต่อเนื่อง
  playMusicHat(now);

  musicStepCount += 1;
  if (stepInChord === MUSIC_STEPS_PER_CHORD - 1) {
    musicChordIndex += 1;
  }
  musicTimeoutId = setTimeout(scheduleNextMusicStep, MUSIC_STEP_DURATION * 1000);
}

function startBackgroundMusic() {
  if (musicStarted) return;
  musicStarted = true;
  scheduleNextMusicStep();
}

// ปุ่มปิด/เปิดเสียง มุมจอ (มีในทุกฉาก จึงใช้ class แทน id เพราะซ้ำกันหลายอัน)
function setupSoundToggle() {
  document.querySelectorAll('.scene').forEach(scene => {
    const btn = document.createElement('button');
    btn.className = 'icon-btn icon-btn-left sound-toggle-btn';
    btn.title = 'เปิด/ปิดเสียง';
    btn.textContent = soundMuted ? '🔇' : '🔊';
    scene.appendChild(btn);
  });

  document.querySelectorAll('.sound-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      soundMuted = !soundMuted;
      localStorage.setItem('spellquest-muted', String(soundMuted));
      document.querySelectorAll('.sound-toggle-btn').forEach(el => {
        el.textContent = soundMuted ? '🔇' : '🔊';
      });
      if (!soundMuted) {
        getAudioCtx();
        playClick();
        startBackgroundMusic();
      }
    });
  });
}
setupSoundToggle();

// เล่นเสียงคลิกทุกครั้งที่กดปุ่มไหนก็ตามในเกม (ยกเว้นปุ่มปิดเสียงเอง ซึ่งจัดการเสียงของตัวเองแล้ว)
// และเริ่มเพลงประกอบพื้นหลังตั้งแต่คลิกแรกที่ผู้เล่นทำในเกม (ตามนโยบาย autoplay ของเบราว์เซอร์)
document.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (btn && !btn.classList.contains('sound-toggle-btn')) {
    playClick();
  }
  startBackgroundMusic();
});

/* ================== ตัวละครแบบเวกเตอร์ (SVG) ไม่ต้องใช้ไฟล์รูป ================== */
/* อัปเกรด: ใส่ gradient แสงเงา ดวงตาเรืองแสง เงาใต้ตัว ให้ดูมีมิติ/สมจริงขึ้น */

let svgUidCounter = 0;
function nextSvgUid() {
  svgUidCounter += 1;
  return 'u' + svgUidCounter;
}

function buildWizardSVG() {
  const id = nextSvgUid();
  const robe = 'wRobe' + id, hat = 'wHat' + id, glow = 'wGlow' + id, skin = 'wSkin' + id;
  return `
  <svg viewBox="0 0 200 240" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="${robe}" x1="0" y1="0" x2="0.3" y2="1">
        <stop offset="0%" stop-color="#8b5cf6"/>
        <stop offset="55%" stop-color="#5b21b6"/>
        <stop offset="100%" stop-color="#2e1065"/>
      </linearGradient>
      <linearGradient id="${hat}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#a78bfa"/>
        <stop offset="100%" stop-color="#4c1d95"/>
      </linearGradient>
      <radialGradient id="${glow}">
        <stop offset="0%" stop-color="#fff7d6"/>
        <stop offset="40%" stop-color="#d8b4fe" stop-opacity="0.9"/>
        <stop offset="100%" stop-color="#a855f7" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="${skin}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#fcdcae"/>
        <stop offset="100%" stop-color="#e3ab7c"/>
      </linearGradient>
    </defs>
    <ellipse cx="100" cy="230" rx="55" ry="9" fill="#000" opacity="0.28"/>
    <path d="M100,90 L150,225 L50,225 Z" fill="url(#${robe})" stroke="#1e0a3d" stroke-width="4"/>
    <path d="M100,90 L118,225 L82,225 Z" fill="#000" opacity="0.18"/>
    <path d="M62,215 L138,215 L143,225 L57,225 Z" fill="#f6c453" stroke="#7c2d12" stroke-width="1.5"/>
    <rect x="72" y="156" width="56" height="15" rx="4" fill="#f6c453" stroke="#7c2d12" stroke-width="2"/>
    <circle cx="100" cy="163.5" r="6" fill="#a8710f"/>
    <circle cx="100" cy="68" r="30" fill="url(#${skin})" stroke="#7c2d12" stroke-width="2.5"/>
    <path d="M74,58 Q100,38 126,58 Q118,48 100,48 Q82,48 74,58 Z" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1"/>
    <circle cx="90" cy="67" r="3.5" fill="#241040"/>
    <circle cx="112" cy="67" r="3.5" fill="#241040"/>
    <circle cx="91.5" cy="65.5" r="1.1" fill="#fff"/>
    <circle cx="113.5" cy="65.5" r="1.1" fill="#fff"/>
    <path d="M76,84 Q100,116 124,84 Q116,100 100,103 Q84,100 76,84 Z" fill="#f8fafc"/>
    <ellipse cx="100" cy="42" rx="42" ry="10" fill="url(#${hat})" stroke="#241040" stroke-width="3"/>
    <path d="M100,-18 L132,44 L68,44 Z" fill="url(#${hat})" stroke="#241040" stroke-width="3"/>
    <path d="M100,-18 L110,22 L90,24 Z" fill="#fff" opacity="0.12"/>
    <polygon points="100,-18 107,-6 93,-6" fill="#fde68a"/>
    <line x1="152" y1="95" x2="166" y2="230" stroke="#4a2e14" stroke-width="8" stroke-linecap="round"/>
    <line x1="151" y1="95" x2="165" y2="230" stroke="#7c4a24" stroke-width="3" stroke-linecap="round"/>
    <circle cx="152" cy="87" r="26" fill="url(#${glow})"/>
    <circle cx="152" cy="87" r="9" fill="#fef3c7"/>
    <circle cx="152" cy="87" r="4" fill="#fff"/>
  </svg>`;
}

const MONSTER_BUILDERS = {
  forest: () => {
    const id = nextSvgUid();
    const body = 'mBodyF' + id, glow = 'mGlowF' + id;
    return `
    <svg viewBox="0 0 220 220" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="${body}" cx="40%" cy="30%">
          <stop offset="0%" stop-color="#5cb86a"/>
          <stop offset="65%" stop-color="#2f6d3a"/>
          <stop offset="100%" stop-color="#173d20"/>
        </radialGradient>
        <radialGradient id="${glow}"><stop offset="0%" stop-color="#fff7cc"/><stop offset="60%" stop-color="#facc15" stop-opacity="0.7"/><stop offset="100%" stop-color="#facc15" stop-opacity="0"/></radialGradient>
      </defs>
      <ellipse cx="110" cy="205" rx="70" ry="10" fill="#000" opacity="0.25"/>
      <path d="M110,25 C165,25 195,70 190,120 C186,168 148,198 110,198 C72,198 34,168 30,120 C25,70 55,25 110,25 Z" fill="url(#${body})" stroke="#0f2a15" stroke-width="4"/>
      <polygon points="55,55 30,15 70,40" fill="#3f8a4a" stroke="#163a1e" stroke-width="3"/>
      <polygon points="165,55 190,15 150,40" fill="#3f8a4a" stroke="#163a1e" stroke-width="3"/>
      <path d="M60,120 Q110,145 160,120" stroke="#0f2a15" stroke-width="5" fill="none" opacity="0.4"/>
      <circle cx="85" cy="105" r="20" fill="url(#${glow})"/>
      <circle cx="135" cy="105" r="20" fill="url(#${glow})"/>
      <ellipse cx="85" cy="105" rx="13" ry="17" fill="#fef9c3"/>
      <ellipse cx="135" cy="105" rx="13" ry="17" fill="#fef9c3"/>
      <ellipse cx="87" cy="109" rx="6" ry="9" fill="#111"/>
      <ellipse cx="133" cy="109" rx="6" ry="9" fill="#111"/>
      <path d="M80,150 Q110,178 140,150 L134,162 L86,162 Z" fill="#0f2a15"/>
      <polygon points="88,150 95,136 102,150" fill="#fff"/>
      <polygon points="118,150 125,136 132,150" fill="#fff"/>
    </svg>`;
  },
  city: () => {
    const id = nextSvgUid();
    const body = 'mBodyC' + id, eye = 'mEyeC' + id;
    return `
    <svg viewBox="0 0 220 220" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="${body}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#9ca3af"/>
          <stop offset="55%" stop-color="#6b7280"/>
          <stop offset="100%" stop-color="#374151"/>
        </linearGradient>
        <radialGradient id="${eye}"><stop offset="0%" stop-color="#fff7ae"/><stop offset="60%" stop-color="#facc15" stop-opacity="0.85"/><stop offset="100%" stop-color="#facc15" stop-opacity="0"/></radialGradient>
      </defs>
      <ellipse cx="110" cy="205" rx="80" ry="10" fill="#000" opacity="0.25"/>
      <rect x="35" y="55" width="150" height="140" rx="18" fill="url(#${body})" stroke="#1f2937" stroke-width="4"/>
      <rect x="55" y="20" width="110" height="55" rx="14" fill="url(#${body})" stroke="#1f2937" stroke-width="4"/>
      <rect x="70" y="45" width="24" height="16" fill="#111827"/>
      <rect x="126" y="45" width="24" height="16" fill="#111827"/>
      <circle cx="82" cy="53" r="8" fill="url(#${eye})"/>
      <circle cx="138" cy="53" r="8" fill="url(#${eye})"/>
      <circle cx="82" cy="53" r="4" fill="#facc15"/>
      <circle cx="138" cy="53" r="4" fill="#facc15"/>
      <rect x="80" y="100" width="60" height="14" fill="#1f2937"/>
      <rect x="50" y="130" width="30" height="30" fill="url(#${body})" stroke="#1f2937" stroke-width="3"/>
      <rect x="140" y="130" width="30" height="30" fill="url(#${body})" stroke="#1f2937" stroke-width="3"/>
      <rect x="60" y="140" width="10" height="10" fill="#111827"/>
      <rect x="150" y="140" width="10" height="10" fill="#111827"/>
    </svg>`;
  },
  night: () => {
    const id = nextSvgUid();
    const body = 'mBodyN' + id, eye = 'mEyeN' + id;
    return `
    <svg viewBox="0 0 220 220" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="${body}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#f5f3ff"/>
          <stop offset="100%" stop-color="#a5b4fc"/>
        </linearGradient>
        <radialGradient id="${eye}"><stop offset="0%" stop-color="#fecaca"/><stop offset="60%" stop-color="#ef4444" stop-opacity="0.8"/><stop offset="100%" stop-color="#ef4444" stop-opacity="0"/></radialGradient>
      </defs>
      <ellipse cx="110" cy="195" rx="65" ry="9" fill="#000" opacity="0.18"/>
      <path d="M110,20 C165,20 190,65 190,110 L190,170 L172,150 L154,170 L136,150 L118,170 L100,150 L82,170 L64,150 L46,170 L46,110 C46,65 55,20 110,20 Z" fill="url(#${body})" opacity="0.92" stroke="#818cf8" stroke-width="3"/>
      <circle cx="88" cy="95" r="17" fill="url(#${eye})"/>
      <circle cx="132" cy="95" r="17" fill="url(#${eye})"/>
      <ellipse cx="88" cy="95" rx="10" ry="14" fill="#1e1b4b"/>
      <ellipse cx="132" cy="95" rx="10" ry="14" fill="#1e1b4b"/>
      <ellipse cx="110" cy="130" rx="14" ry="9" fill="#1e1b4b"/>
    </svg>`;
  },
  desert: () => {
    const id = nextSvgUid();
    const body = 'mBodyD' + id;
    return `
    <svg viewBox="0 0 220 220" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="${body}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#e0a868"/>
          <stop offset="60%" stop-color="#c2874a"/>
          <stop offset="100%" stop-color="#8a5a2b"/>
        </linearGradient>
      </defs>
      <ellipse cx="110" cy="200" rx="65" ry="9" fill="#000" opacity="0.25"/>
      <path d="M110,30 C160,30 185,75 178,120 C172,165 140,195 110,195 C80,195 48,165 42,120 C35,75 60,30 110,30 Z" fill="url(#${body})" stroke="#5c3611" stroke-width="4"/>
      <path d="M70,50 Q110,8 150,50 Q130,33 110,40 Q90,33 70,50 Z" fill="#5c3611"/>
      <ellipse cx="90" cy="100" rx="13" ry="17" fill="#fff7e6"/>
      <ellipse cx="130" cy="100" rx="13" ry="17" fill="#fff7e6"/>
      <circle cx="92" cy="105" r="6" fill="#111"/>
      <circle cx="128" cy="105" r="6" fill="#111"/>
      <circle cx="94" cy="102" r="1.6" fill="#fff"/>
      <circle cx="130" cy="102" r="1.6" fill="#fff"/>
      <path d="M85,145 Q110,168 135,145 L129,158 L91,158 Z" fill="#5c3611"/>
      <polygon points="94,145 100,133 106,145" fill="#fff"/>
      <polygon points="114,145 120,133 126,145" fill="#fff"/>
    </svg>`;
  },
  castle: () => {
    const id = nextSvgUid();
    const body = 'mBodyK' + id, eye = 'mEyeK' + id, wing = 'mWingK' + id;
    return `
    <svg viewBox="0 0 240 220" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="${wing}" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#7a1740"/>
          <stop offset="100%" stop-color="#2e0818"/>
        </linearGradient>
        <radialGradient id="${body}" cx="42%" cy="30%">
          <stop offset="0%" stop-color="#a855c9"/>
          <stop offset="60%" stop-color="#7c2d92"/>
          <stop offset="100%" stop-color="#4a1660"/>
        </radialGradient>
        <radialGradient id="${eye}"><stop offset="0%" stop-color="#fff1f2"/><stop offset="55%" stop-color="#ef4444" stop-opacity="0.9"/><stop offset="100%" stop-color="#ef4444" stop-opacity="0"/></radialGradient>
      </defs>
      <ellipse cx="120" cy="205" rx="85" ry="11" fill="#000" opacity="0.3"/>
      <path d="M40,120 C10,90 20,50 50,55 C55,40 75,35 80,50 C90,35 110,40 110,60 L100,100 Z" fill="url(#${wing})" stroke="#1a0410" stroke-width="3"/>
      <path d="M200,120 C230,90 220,50 190,55 C185,40 165,35 160,50 C150,35 130,40 130,60 L140,100 Z" fill="url(#${wing})" stroke="#1a0410" stroke-width="3"/>
      <path d="M120,30 C170,30 195,75 188,120 C182,168 150,198 120,198 C90,198 58,168 52,120 C45,75 70,30 120,30 Z" fill="url(#${body})" stroke="#2c0a3d" stroke-width="4"/>
      <polygon points="95,45 100,12 112,42" fill="#f6c453" stroke="#7c2d12" stroke-width="1"/>
      <polygon points="145,45 140,12 128,42" fill="#f6c453" stroke="#7c2d12" stroke-width="1"/>
      <circle cx="99" cy="107" r="19" fill="url(#${eye})"/>
      <circle cx="141" cy="107" r="19" fill="url(#${eye})"/>
      <ellipse cx="98" cy="105" rx="13" ry="17" fill="#fee2e2"/>
      <ellipse cx="142" cy="105" rx="13" ry="17" fill="#fee2e2"/>
      <ellipse cx="100" cy="110" rx="6" ry="8" fill="#7f1d1d"/>
      <ellipse cx="140" cy="110" rx="6" ry="8" fill="#7f1d1d"/>
      <path d="M90,150 Q120,182 150,150 L142,164 L98,164 Z" fill="#2c0a3d"/>
      <polygon points="100,150 106,136 112,150" fill="#fff"/>
      <polygon points="128,150 134,136 140,150" fill="#fff"/>
    </svg>`;
  }
};

// สลับโชว์สถานะท่าทาง (idle/walk/hit/special/death ฯลฯ) สำหรับตัวละครที่ใช้ buildMultiStateSpriteArt
// คืนค่า true ถ้าตัวละครนั้นมีสถานะนี้จริง (ตัวละครที่ยังใช้ sprite ไฟล์เดียวจะคืน false เฉยๆ ไม่มีผลอะไร ปลอดภัย)
function setCharState(rootEl, stateName) {
  const layers = rootEl.querySelectorAll('.sprite-state');
  if (layers.length === 0) return false;
  let found = false;
  layers.forEach(layer => {
    const match = layer.dataset.state === stateName;
    layer.classList.toggle('active', match);
    if (match) found = true;
  });
  return found;
}

// สร้าง sprite จากไฟล์ "เดิน" ไฟล์เดียว (ไม่ต้องมีไฟล์ idle แยก)
// ตอนยืนนิ่ง = ค้างเฟรมแรกของภาพเดิน (animation หยุดพัก), ตอนเดิน = เล่นแอนิเมชันขยับเฟรม
function buildRealSpriteArt(walkUrl, walkFrames) {
  const wrap = document.createElement('div');
  wrap.style.width = '100%';
  wrap.style.height = '100%';
  wrap.style.position = 'relative';

  const play = document.createElement('div');
  play.className = 'sprite-play frames-' + walkFrames;
  play.style.backgroundImage = "url('" + walkUrl + "')";

  wrap.appendChild(play);
  return wrap;
}

// สร้าง sprite แบบหลายสถานะ (idle/walk/hit/special/death) ซ้อนกันในกรอบเดียว
// แต่ละสถานะเป็นไฟล์สไปรท์ชีทของตัวเอง สลับโชว์ทีละสถานะด้วย setCharState()
// states = [{ state:'idle', url:'images/xxx.png', frames:20 }, ...]
function buildMultiStateSpriteArt(states) {
  const wrap = document.createElement('div');
  wrap.style.width = '100%';
  wrap.style.height = '100%';
  wrap.style.position = 'relative';

  states.forEach((s, i) => {
    const layer = document.createElement('div');
    layer.className = 'sprite-state frames-' + s.frames + (i === 0 ? ' active' : '');
    layer.dataset.state = s.state;
    layer.style.backgroundImage = "url('" + s.url + "')";
    wrap.appendChild(layer);
  });

  return wrap;
}

// เช็คว่าไฟล์รูปโหลดได้จริงไหม ก่อนจะใช้งาน (กันจอว่างเปล่าถ้าไฟล์หาย/วางผิดที่)
function checkImage(url, callback) {
  const img = new Image();
  img.onload = () => callback(true);
  img.onerror = () => callback(false);
  img.src = url;
}

function injectCharacterArt() {
  // นักเวทย์: ใช้ images/wizard-walk.png ถ้ามี ไม่มีก็ใช้ SVG สำรอง (เรียบง่าย ไม่มีไฟล์อื่นให้สับสน)
  document.querySelectorAll('.wizard-sprite').forEach(wizardEl => {
    const artEl = wizardEl.querySelector('.sprite-art');
    artEl.innerHTML = '';
    checkImage('images/wizard-walk.png', (ok) => {
      artEl.innerHTML = '';
      if (ok) {
        wizardEl.classList.add('has-real-art');
        artEl.appendChild(buildRealSpriteArt('images/wizard-walk.png', 8));
      } else {
        wizardEl.classList.remove('has-real-art');
        artEl.innerHTML = buildWizardSVG();
        console.warn('SpellQuest: ไม่พบ images/wizard-walk.png — ใช้ภาพวาด SVG สำรองแทน');
      }
    });
  });

  // อสูร: ใช้ images/demon-walk.png ถ้ามี ไม่มีก็ใช้ SVG สำรองตามธีมแต่ละด่าน
  document.querySelectorAll('.monster-sprite').forEach(monsterEl => {
    const type = monsterEl.dataset.monster;
    const artEl = monsterEl.querySelector('.sprite-art');
    artEl.innerHTML = '';
    checkImage('images/demon-walk.png', (ok) => {
      artEl.innerHTML = '';
      if (ok) {
        monsterEl.classList.add('has-real-art');
        artEl.appendChild(buildRealSpriteArt('images/demon-walk.png', 20));
      } else {
        monsterEl.classList.remove('has-real-art');
        if (MONSTER_BUILDERS[type]) artEl.innerHTML = MONSTER_BUILDERS[type]();
        console.warn('SpellQuest: ไม่พบ images/demon-walk.png — ใช้ภาพวาด SVG สำรองแทน');
      }
    });
  });
}
injectCharacterArt();

// เพิ่มแถบพื้นเลื่อน (ground-scroll) เข้าไปในสนามต่อสู้ทุกด่านอัตโนมัติ
document.querySelectorAll('.battle-field').forEach(field => {
  const ground = document.createElement('div');
  ground.className = 'ground-scroll';
  field.appendChild(ground);
});

// เพิ่มบรรยากาศเฉพาะแต่ละด่าน (ดาวระยิบตอนกลางคืน หิ่งห้อยในป่า ประกายไฟที่ปราสาท ไอร้อนในทะเลทราย)
// ทำตรงนี้ก่อนพื้นหลังภาพจริง เพื่อให้ลำดับชั้น (stacking) ถูกต้อง: พื้นหลังอยู่ล่างสุด บรรยากาศลอยอยู่เหนือมัน
const stageAmbience = {
  'scene-forest': 'fireflies',
  'scene-night': 'stars',
  'scene-desert': 'haze',
  'scene-castle': 'embers'
};
Object.keys(stageAmbience).forEach(sceneId => {
  const scene = document.getElementById(sceneId);
  if (!scene) return;
  const layer = document.createElement('div');
  layer.className = 'ambience ' + stageAmbience[sceneId];
  scene.insertBefore(layer, scene.firstChild);
});

// เพิ่มพื้นหลังภาพจริง (จากรูปที่ผู้ใช้อัปโหลด) ที่เลื่อนได้ไม่มีรอยต่อ
// tileNaturalWidth/Height = ขนาดจริงของไฟล์ภาพ (ต่อกระจกแล้ว 2 เท่าของภาพต้นฉบับ)
// ถ้าไฟล์รูปโหลดไม่ได้ จะไม่แตะ .scenery เลย ปล่อยให้ทรงเงา CSS เดิมโชว์แทน (กันฉากว่างเปล่า)
function setupParallaxBackground(sceneId, imageUrl, tileNaturalWidth, tileNaturalHeight) {
  const scene = document.getElementById(sceneId);
  if (!scene) return;

  checkImage(imageUrl, (ok) => {
    if (!ok) {
      console.warn('SpellQuest: ไม่พบไฟล์พื้นหลัง ' + imageUrl + ' — ใช้ทรงเงา CSS สำรองแทน');
      return;
    }

    const layer = document.createElement('div');
    layer.className = 'parallax-bg';
    layer.style.backgroundImage = "url('" + imageUrl + "')";
    scene.insertBefore(layer, scene.firstChild);

    // มีรูปจริงแล้ว ไม่ต้องใช้ทรงเงา (scenery) ที่วาดด้วย CSS ซ้อนทับอีก
    const scenery = scene.querySelector('.scenery');
    if (scenery) scenery.style.display = 'none';

    let offsetPx = 0;
    let tileWidthPx = 0;

    function recalcTileWidth() {
      const h = scene.clientHeight || window.innerHeight;
      layer.style.backgroundSize = 'auto ' + h + 'px';
      tileWidthPx = h * (tileNaturalWidth / tileNaturalHeight);
    }
    recalcTileWidth();
    window.addEventListener('resize', recalcTileWidth);

    function tick() {
      // เดินตอน bg-walk (นักเวทย์/อสูรกำลังเดิน) ให้ไหลเร็วขึ้น ปกติไหลช้าๆ ให้ฉากมีชีวิตอยู่ตลอด
      const speed = scene.classList.contains('bg-walk') ? 2.4 : 0.3;
      if (tileWidthPx > 0) {
        offsetPx = (offsetPx + speed) % tileWidthPx;
        layer.style.backgroundPositionX = (-offsetPx) + 'px';
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
}

// ทั้ง 5 ด่าน มีรูปจริงจากผู้ใช้ครบแล้ว (ขนาดไฟล์คือภาพต้นฉบับต่อกระจกกัน 2 เท่า)
setupParallaxBackground('scene-forest', 'images/bg-forest.jpg', 2558, 720);
setupParallaxBackground('scene-city',   'images/bg-city.jpg',   2558, 720);
setupParallaxBackground('scene-desert', 'images/bg-desert.jpg', 2580, 720);
setupParallaxBackground('scene-night',  'images/bg-night.jpg',  2558, 720);
setupParallaxBackground('scene-castle', 'images/bg-castle.jpg', 2558, 720);

/* ================== สลับฉาก ================== */

function goToScene(sceneId) {
  document.querySelectorAll('.scene').forEach(scene => {
    scene.classList.remove('active');
  });
  document.getElementById(sceneId).classList.add('active');
}

/* ================== คัตซีน (เปิด/ปิดเรื่อง) - เล่นจากไฟล์วิดิโอ ================== */

// เล่นวิดิโอของฉากที่ระบุ แล้วเรียก onComplete เมื่อวิดิโอเล่นจบ (event 'ended')
function playCutscene(sceneId, onComplete) {
  const video = document.querySelector('#' + sceneId + ' video.cutscene-video');
  if (!video) {
    if (onComplete) onComplete();
    return;
  }

  const handleEnded = () => {
    video.removeEventListener('ended', handleEnded);
    if (onComplete) onComplete();
  };
  video.addEventListener('ended', handleEnded);

  video.currentTime = 0;
  video.play().catch(() => {
    // เบราว์เซอร์บล็อกการเล่นอัตโนมัติ (เช่น ไม่มี user gesture) - ข้ามไปที่ onComplete ทันที
    handleEnded();
  });
}

document.querySelectorAll('.cutscene-skip').forEach(btn => {
  btn.addEventListener('click', () => {
    const scene = btn.closest('.scene');
    const video = scene ? scene.querySelector('video.cutscene-video') : null;
    if (video) {
      video.pause();
    }
    const target = btn.dataset.skipTarget;
    goToScene(target);
    if (target === 'scene-map') renderStageMap();
  });
});

const outroRestartBtn = document.getElementById('outro-restart-btn');
if (outroRestartBtn) {
  outroRestartBtn.addEventListener('click', () => {
    outroRestartBtn.classList.remove('show');
    goToScene('scene-start');
  });
}

// คลิกปุ่ม START GAME -> เล่นคัตซีนเปิดเรื่องก่อน แล้วค่อยไปหน้าเลือกด่าน
document.getElementById('start-btn').addEventListener('click', () => {
  goToScene('scene-intro');
  playCutscene('scene-intro', () => {
    goToScene('scene-map');
    renderStageMap();
  });
});

// คลิกปุ่มปิด (⏻) -> ถามยืนยันก่อนออกจากเกม
document.getElementById('exit-btn').addEventListener('click', () => {
  const confirmExit = confirm('ต้องการออกจากเกมหรือไม่?');
  if (confirmExit) {
    window.close();
    setTimeout(() => {
      alert('ขอบคุณที่เล่น SpellQuest! ปิดแท็บนี้ได้เลย');
    }, 200);
  }
});

/* ================== ระบบความคืบหน้าของด่าน ================== */

const TOTAL_STAGES = 5;

function loadProgress() {
  const saved = localStorage.getItem('spellquest-progress');
  if (saved) return JSON.parse(saved);
  return { unlockedStage: 1, clearedStages: [] };
}

function saveProgress(progress) {
  localStorage.setItem('spellquest-progress', JSON.stringify(progress));
}

let progress = loadProgress();
let selectedStage = null;

function renderStageMap() {
  document.querySelectorAll('.stage-node').forEach(node => {
    const stageNum = parseInt(node.dataset.stage, 10);
    node.classList.remove('locked', 'selected', 'cleared');

    if (stageNum > progress.unlockedStage) {
      node.classList.add('locked');
    } else {
      if (progress.clearedStages.includes(stageNum)) {
        node.classList.add('cleared');
      }
      if (stageNum === selectedStage) {
        node.classList.add('selected');
      }
    }
  });
}

document.querySelectorAll('.stage-node').forEach(node => {
  node.addEventListener('click', () => {
    const stageNum = parseInt(node.dataset.stage, 10);
    if (stageNum > progress.unlockedStage) return;

    selectedStage = stageNum;
    renderStageMap();
    initStage(stageNum);
  });
});

function completeStage(stageNum) {
  if (!progress.clearedStages.includes(stageNum)) {
    progress.clearedStages.push(stageNum);
  }
  if (stageNum === progress.unlockedStage && stageNum < TOTAL_STAGES) {
    progress.unlockedStage = stageNum + 1;
  }
  saveProgress(progress);
  renderStageMap();
}

document.getElementById('reset-progress-btn').addEventListener('click', () => {
  const confirmReset = confirm('ล้างความคืบหน้าทั้งหมด กลับไปเริ่มด่าน 1 ใหม่?');
  if (!confirmReset) return;

  progress = { unlockedStage: 1, clearedStages: [] };
  saveProgress(progress);
  selectedStage = null;
  renderStageMap();
});

renderStageMap();

/* ================== ระบบต่อสู้/คำศัพท์ในแต่ละด่าน ================== */

const stageScenes = {
  1: 'scene-forest',
  2: 'scene-city',
  3: 'scene-night',
  4: 'scene-desert',
  5: 'scene-castle'
};

const stageWordBank = {
  1: [
    { thai: 'ต้นไม้', correct: 'Tree',       wrong: 'Mountain' },
    { thai: 'ภูเขา',   correct: 'Mountain',   wrong: 'River' },
    { thai: 'แม่น้ำ',  correct: 'River',      wrong: 'Forest' },
    { thai: 'ป่า',     correct: 'Forest',     wrong: 'Bird' },
    { thai: 'นก',      correct: 'Bird',       wrong: 'Flower' },
    { thai: 'ดอกไม้',  correct: 'Flower',     wrong: 'Leaf' },
    { thai: 'ใบไม้',   correct: 'Leaf',       wrong: 'Rock' },
    { thai: 'หิน',     correct: 'Rock',       wrong: 'Animal' },
    { thai: 'สัตว์',   correct: 'Animal',     wrong: 'Waterfall' },
    { thai: 'น้ำตก',   correct: 'Waterfall',  wrong: 'Bridge' },
    { thai: 'สะพาน',   correct: 'Bridge',     wrong: 'Lake' },
    { thai: 'ทะเลสาบ', correct: 'Lake',       wrong: 'Tree' }
  ],
  2: [
    { thai: 'บ้าน',      correct: 'House',    wrong: 'Market' },
    { thai: 'ตลาด',      correct: 'Market',   wrong: 'Bridge' },
    { thai: 'สะพาน',     correct: 'Bridge',   wrong: 'Fountain' },
    { thai: 'น้ำพุ',     correct: 'Fountain', wrong: 'Shop' },
    { thai: 'ร้านค้า',   correct: 'Shop',     wrong: 'Street' },
    { thai: 'ถนน',       correct: 'Street',   wrong: 'Lamp' },
    { thai: 'โคมไฟ',     correct: 'Lamp',     wrong: 'Inn' },
    { thai: 'โรงแรม',    correct: 'Inn',      wrong: 'Tower' },
    { thai: 'หอคอย',     correct: 'Tower',    wrong: 'Gate' },
    { thai: 'ประตูเมือง', correct: 'Gate',    wrong: 'Wall' },
    { thai: 'กำแพง',     correct: 'Wall',     wrong: 'Bell' },
    { thai: 'ระฆัง',     correct: 'Bell',     wrong: 'House' }
  ],
  3: [
    { thai: 'ผี',           correct: 'Ghost',     wrong: 'Bone' },
    { thai: 'กระดูก',       correct: 'Bone',      wrong: 'Bat' },
    { thai: 'ค้างคาว',      correct: 'Bat',       wrong: 'Spider' },
    { thai: 'แมงมุม',       correct: 'Spider',    wrong: 'Graveyard' },
    { thai: 'สุสาน',        correct: 'Graveyard', wrong: 'Moon' },
    { thai: 'พระจันทร์',    correct: 'Moon',      wrong: 'Star' },
    { thai: 'ดวงดาว',       correct: 'Star',      wrong: 'Shadow' },
    { thai: 'เงา',          correct: 'Shadow',    wrong: 'Witch' },
    { thai: 'แม่มด',        correct: 'Witch',     wrong: 'Coffin' },
    { thai: 'โลงศพ',        correct: 'Coffin',    wrong: 'Skeleton' },
    { thai: 'โครงกระดูก',   correct: 'Skeleton',  wrong: 'Owl' },
    { thai: 'นกฮูก',        correct: 'Owl',       wrong: 'Ghost' }
  ],
  4: [
    { thai: 'ทะเลทราย',   correct: 'Desert',  wrong: 'Camel' },
    { thai: 'อูฐ',         correct: 'Camel',   wrong: 'Cactus' },
    { thai: 'กระบองเพชร', correct: 'Cactus',  wrong: 'Pyramid' },
    { thai: 'พีระมิด',     correct: 'Pyramid', wrong: 'Sand' },
    { thai: 'ทราย',        correct: 'Sand',    wrong: 'Oasis' },
    { thai: 'โอเอซิส',     correct: 'Oasis',   wrong: 'Sun' },
    { thai: 'ดวงอาทิตย์',  correct: 'Sun',     wrong: 'Dune' },
    { thai: 'เนินทราย',    correct: 'Dune',    wrong: 'Snake' },
    { thai: 'งู',          correct: 'Snake',   wrong: 'Scorpion' },
    { thai: 'แมงป่อง',     correct: 'Scorpion', wrong: 'Cliff' },
    { thai: 'หน้าผา',      correct: 'Cliff',   wrong: 'Heat' },
    { thai: 'ความร้อน',    correct: 'Heat',    wrong: 'Desert' }
  ],
  5: [
    { thai: 'ปราสาท',   correct: 'Castle',   wrong: 'Sword' },
    { thai: 'ดาบ',       correct: 'Sword',    wrong: 'Crown' },
    { thai: 'มงกุฎ',     correct: 'Crown',    wrong: 'Dragon' },
    { thai: 'มังกร',     correct: 'Dragon',   wrong: 'Princess' },
    { thai: 'เจ้าหญิง',  correct: 'Princess', wrong: 'King' },
    { thai: 'กษัตริย์',  correct: 'King',     wrong: 'Knight' },
    { thai: 'อัศวิน',    correct: 'Knight',   wrong: 'Shield' },
    { thai: 'โล่',       correct: 'Shield',   wrong: 'Throne' },
    { thai: 'บัลลังก์',  correct: 'Throne',   wrong: 'Tower' },
    { thai: 'หอคอย',     correct: 'Tower',    wrong: 'Gate' },
    { thai: 'ประตู',     correct: 'Gate',     wrong: 'Flag' },
    { thai: 'ธง',        correct: 'Flag',     wrong: 'Castle' }
  ]
};

// จำนวนคำที่สุ่มมาเล่นต่อ 1 รอบ (คลังคำมี 12 คำ/ด่าน แต่หยิบมาสุ่มแค่บางส่วนต่อรอบ ให้ไม่ยาวเกินไป)
const WORDS_PER_ROUND = 6;


const MAX_HEARTS = 2;

// เวลาต่อคำ (วินาที) ลดลงทีละนิดตามคำถัดไป เพิ่มความตื่นเต้น
const WORD_BASE_TIME = 7;
const WORD_TIME_STEP = 0.7;
const WORD_MIN_TIME = 3;

function timeForWord(wordIndex) {
  return Math.max(WORD_MIN_TIME, WORD_BASE_TIME - wordIndex * WORD_TIME_STEP);
}

let stageState = {
  stageNum: null,
  wordIndex: 0,
  hearts: MAX_HEARTS,
  combo: 0,
  words: []
};

let wordTimerId = null;
let lowTimeWarnId = null;
let wordResolved = false;

// สั่นจอสนามรบสั้นๆ ให้รู้สึกมีแรงกระแทกตอนอสูรจู่โจมโดน (ตอบผิด/หมดเวลา)
function triggerScreenShake(sceneId) {
  const field = document.querySelector('#' + sceneId + ' .battle-field');
  if (!field) return;
  field.classList.remove('screen-shake');
  void field.offsetWidth; // บังคับ reflow ให้เล่น animation ใหม่ได้ทุกครั้งแม้เพิ่งสั่นไป
  field.classList.add('screen-shake');
}

// โชว์ป้ายคอมโบลอยขึ้นเหนือกล่องคำถาม ตอนตอบถูกติดกันหลายข้อ
function showCombo(sceneId, comboCount) {
  const badge = document.querySelector('#' + sceneId + ' .combo-badge');
  if (!badge) return;
  badge.textContent = 'คอมโบ x' + comboCount + '!';
  badge.classList.remove('show');
  void badge.offsetWidth;
  badge.classList.add('show');
}

// โชว์ตัวหนังสือลอยขึ้นแล้วหายไป (ใช้ตอนเสียหัวใจ ให้เห็นชัดว่าโดนหักแต้ม)
function spawnFloatIndicator(sceneId, text) {
  const hud = document.querySelector('#' + sceneId + ' .battle-hud');
  if (!hud) return;
  const el = document.createElement('div');
  el.className = 'float-indicator';
  el.textContent = text;
  el.style.left = '4px';
  el.style.top = '46px';
  hud.appendChild(el);
  setTimeout(() => el.remove(), 900);
}

// สร้างป้ายคอมโบให้ทุกฉาก (แทรกเข้ากล่องคำถามตอนโหลดหน้าเว็บ)
function setupComboBadges() {
  document.querySelectorAll('.quiz-box').forEach(box => {
    const badge = document.createElement('div');
    badge.className = 'combo-badge';
    box.appendChild(badge);
  });
}
setupComboBadges();

// ตำแหน่งนักเวทย์ (ซ้าย คงที่) และอสูร (ขวา เคลื่อนที่ได้) แยกอิสระจากกัน
// wizardRatio: 0 = จุดยืนปกติ, 1 = ชิดกลาง | monsterRatio: 0 = จุดเริ่มไกลสุด, 1 = ประชิดตัวนักเวทย์จริงๆ (เดินมาถึงตัว ไม่ใช่หยุดกลางจอ)
function positionSprites(sceneId, wizardRatio, monsterRatio) {
  const field = document.querySelector('#' + sceneId + ' .battle-field');
  const wizard = document.querySelector('#' + sceneId + ' .wizard-sprite');
  const monster = document.querySelector('#' + sceneId + ' .monster-sprite');

  const fieldWidth = field.clientWidth;
  const wizardWidth = wizard.offsetWidth || 260;
  const monsterWidth = monster.offsetWidth || 260;

  const startGapPx = fieldWidth * 0.08;
  const meetingGapPx = 16; // ระยะห่างเล็กน้อยตอนอสูรเข้าประชิดตัว กันภาพซ้อนทับกันสนิทเกินไป

  const wR = Math.min(Math.max(wizardRatio, 0), 1);
  const mR = Math.min(Math.max(monsterRatio, 0), 1);

  const wizardMaxAdvance = Math.max(startGapPx, (fieldWidth - wizardWidth - monsterWidth) / 2);
  const wizardLeftPx = startGapPx + wR * (wizardMaxAdvance - startGapPx);
  wizard.style.left = wizardLeftPx + 'px';

  // จุดที่อสูร "ประชิดตัว" นักเวทย์จริงๆ: ขอบซ้ายอสูรมาชนขอบขวานักเวทย์ (บวกช่องว่างเล็กน้อย)
  // อ้างอิงจากตำแหน่งจริงของนักเวทย์ ไม่ใช่ค่ากลางจอแบบเดิม จึงเดินมาถึงตัวได้จริงตอนเวลาหมด
  const monsterFarPx = startGapPx;
  const monsterNearPx = Math.max(
    monsterFarPx,
    fieldWidth - monsterWidth - wizardLeftPx - wizardWidth - meetingGapPx
  );
  monster.style.right = (monsterFarPx + mR * (monsterNearPx - monsterFarPx)) + 'px';
}

// เริ่มจับเวลาของคำถามปัจจุบัน: อสูรเดินไล่เข้ามาเรื่อยๆ พร้อมแถบเวลาที่ค่อยๆ หมดไป
function startWordTimer(sceneId, seconds) {
  wordResolved = false;

  const monster = document.querySelector('#' + sceneId + ' .monster-sprite');
  const ground = document.querySelector('#' + sceneId + ' .ground-scroll');
  const scene = document.getElementById(sceneId);
  const timeFill = document.querySelector('#' + sceneId + ' .time-bar-fill');

  monster.style.transition = 'none';
  positionSprites(sceneId, 0, 0);
  void monster.offsetWidth;
  monster.style.transition = '';

  timeFill.style.transition = 'none';
  timeFill.style.transform = 'scaleX(1)';
  void timeFill.offsetWidth;
  timeFill.style.transition = 'transform ' + seconds + 's linear';

  monster.classList.add('walking');
  setCharState(monster, 'walk');
  if (ground) ground.classList.add('scrolling');
  scene.classList.add('bg-walk');

  monster.style.transitionDuration = seconds + 's';

  const timeBarEl = document.querySelector('#' + sceneId + ' .time-bar');
  if (timeBarEl) timeBarEl.classList.remove('time-low');

  requestAnimationFrame(() => {
    positionSprites(sceneId, 0, 1);
    timeFill.style.transform = 'scaleX(0)';
  });

  // เตือนตอนเวลาผ่านไปแล้ว 65% (เหลือเวลาน้อย) แถบเวลาจะกะพริบแดง เร่งความตื่นเต้น
  if (lowTimeWarnId) clearTimeout(lowTimeWarnId);
  lowTimeWarnId = setTimeout(() => {
    if (timeBarEl) timeBarEl.classList.add('time-low');
  }, seconds * 0.65 * 1000);

  wordTimerId = setTimeout(() => {
    if (!wordResolved) handleTimeout(sceneId);
  }, seconds * 1000);
}

function stopWordTimer(sceneId) {
  wordResolved = true;
  if (wordTimerId) {
    clearTimeout(wordTimerId);
    wordTimerId = null;
  }
  if (lowTimeWarnId) {
    clearTimeout(lowTimeWarnId);
    lowTimeWarnId = null;
  }
  const monster = document.querySelector('#' + sceneId + ' .monster-sprite');
  const ground = document.querySelector('#' + sceneId + ' .ground-scroll');
  const scene = document.getElementById(sceneId);
  const timeBarEl = document.querySelector('#' + sceneId + ' .time-bar');
  monster.classList.remove('walking');
  setCharState(monster, 'idle');
  monster.style.transitionDuration = '';
  if (ground) ground.classList.remove('scrolling');
  scene.classList.remove('bg-walk');
  if (timeBarEl) timeBarEl.classList.remove('time-low');
}

// สลับลำดับอาร์เรย์แบบสุ่มจริง (Fisher-Yates shuffle) ไม่แก้อาร์เรย์ต้นฉบับ
function shuffleArray(arr) {
  const result = arr.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function initStage(stageNum) {
  const sceneId = stageScenes[stageNum];
  if (!sceneId) {
    alert('ด่านนี้ยังไม่ได้สร้างฉาก (กำลังจะทำต่อไป)');
    return;
  }

  stageState = {
    stageNum: stageNum,
    wordIndex: 0,
    hearts: MAX_HEARTS,
    combo: 0,
    bestCombo: 0,
    words: shuffleArray(stageWordBank[stageNum]).slice(0, WORDS_PER_ROUND) // สุ่มหยิบคำจากคลังคำ + สลับลำดับใหม่ทุกครั้ง
  };

  document.querySelector('#' + sceneId + ' .stage-clear-overlay').classList.remove('show');
  document.querySelector('#' + sceneId + ' .stage-fail-overlay').classList.remove('show');
  document.querySelectorAll('#' + sceneId + ' .stage-clear-stars .star').forEach(s => s.classList.remove('earned'));

  const monster = document.querySelector('#' + sceneId + ' .monster-sprite');
  const wizard = document.querySelector('#' + sceneId + ' .wizard-sprite');
  monster.classList.remove('monster-die');
  setCharState(monster, 'idle');
  setCharState(wizard, 'idle');

  goToScene(sceneId);

  wizard.style.transition = 'none';
  monster.style.transition = 'none';
  positionSprites(sceneId, 0, 0);
  const wizardHomeLeft = wizard.style.left;

  wizard.style.left = '-40%';
  void wizard.offsetWidth;
  void monster.offsetWidth;
  wizard.style.transition = '';
  monster.style.transition = '';

  const ground = document.querySelector('#' + sceneId + ' .ground-scroll');
  const scene = document.getElementById(sceneId);

  wizard.classList.add('walking');
  setCharState(wizard, 'walk');
  if (ground) ground.classList.add('scrolling');
  scene.classList.add('bg-walk');
  wizard.style.transitionDuration = '1s';

  requestAnimationFrame(() => {
    wizard.style.left = wizardHomeLeft;
  });

  setTimeout(() => {
    wizard.classList.remove('walking');
    setCharState(wizard, 'idle');
    wizard.style.transitionDuration = '';
    if (ground) ground.classList.remove('scrolling');
    scene.classList.remove('bg-walk');
    renderStageBattle();
  }, 1000);
}

function renderHearts(sceneId) {
  const heartsEl = document.querySelector('#' + sceneId + ' .hearts');
  heartsEl.innerHTML = '';
  for (let i = 0; i < MAX_HEARTS; i++) {
    const span = document.createElement('span');
    span.className = 'heart' + (i < stageState.hearts ? '' : ' heart-lost');
    span.textContent = '❤';
    heartsEl.appendChild(span);
  }
}

function renderStageBattle() {
  const sceneId = stageScenes[stageState.stageNum];
  const currentWord = stageState.words[stageState.wordIndex];

  renderHearts(sceneId);

  const totalWords = stageState.words.length;
  const hpRatio = 1 - (stageState.wordIndex / totalWords);
  document.querySelector('#' + sceneId + ' .monster-hp-fill').style.width = (hpRatio * 100) + '%';

  document.querySelector('#' + sceneId + ' .thai-word').textContent = currentWord.thai;

  const options = Math.random() < 0.5
    ? [currentWord.correct, currentWord.wrong]
    : [currentWord.wrong, currentWord.correct];

  const btns = document.querySelectorAll('#' + sceneId + ' .answer-btn');
  btns.forEach((btn, i) => {
    btn.textContent = options[i];
    btn.dataset.correct = options[i] === currentWord.correct ? 'true' : 'false';
    btn.disabled = false;
    btn.classList.remove('correct-flash', 'wrong-flash');
  });

  startWordTimer(sceneId, timeForWord(stageState.wordIndex));
}

document.addEventListener('click', (e) => {
  const btn = e.target.closest('.answer-btn');
  if (!btn || btn.disabled) return;
  handleAnswer(btn);
});

// เอฟเฟกต์กระแทกสีแดงตรงตัวนักเวทย์ ตอนอสูรจู่โจมโดน (ตอบผิด/หมดเวลา) ให้เห็นชัดว่ามีการต่อสู้เกิดขึ้นจริง
function spawnImpactSpark(sceneId) {
  const field = document.querySelector('#' + sceneId + ' .battle-field');
  const wizardEl = document.querySelector('#' + sceneId + ' .wizard-sprite');
  if (!field || !wizardEl) return;

  const fieldRect = field.getBoundingClientRect();
  const wizardRect = wizardEl.getBoundingClientRect();
  const x = wizardRect.left + wizardRect.width * 0.55 - fieldRect.left;
  const y = wizardRect.top + wizardRect.height * 0.38 - fieldRect.top;

  const spark = document.createElement('div');
  spark.className = 'impact-spark';
  spark.style.left = x + 'px';
  spark.style.top = y + 'px';
  field.appendChild(spark);
  setTimeout(() => spark.remove(), 420);
}

// ยิงลูกแสงคาถาจากปลายไม้เท้านักเวทย์พุ่งไปใส่อสูร (ตอนตอบถูก)
function spawnSpellBolt(sceneId) {
  playWhoosh();
  const field = document.querySelector('#' + sceneId + ' .battle-field');
  const wizardEl = document.querySelector('#' + sceneId + ' .wizard-sprite');
  const monsterEl = document.querySelector('#' + sceneId + ' .monster-sprite');
  if (!field || !wizardEl || !monsterEl) return;

  const fieldRect = field.getBoundingClientRect();
  const wizardRect = wizardEl.getBoundingClientRect();
  const monsterRect = monsterEl.getBoundingClientRect();

  // จุดเริ่ม: ปลายไม้เท้า (ประมาณค่อนไปทางขวาบนของตัวนักเวทย์)
  const startX = wizardRect.left + wizardRect.width * 0.8 - fieldRect.left;
  const startY = wizardRect.top + wizardRect.height * 0.32 - fieldRect.top;
  // จุดหมาย: กลางตัวอสูรค่อนไปทางบนเล็กน้อย
  const endX = monsterRect.left + monsterRect.width * 0.45 - fieldRect.left;
  const endY = monsterRect.top + monsterRect.height * 0.4 - fieldRect.top;

  const bolt = document.createElement('div');
  bolt.className = 'spell-bolt';
  bolt.style.left = startX + 'px';
  bolt.style.top = startY + 'px';
  field.appendChild(bolt);

  void bolt.offsetWidth; // บังคับ reflow ก่อนเริ่ม transition
  bolt.style.transform = 'translate(' + (endX - startX) + 'px,' + (endY - startY) + 'px) scale(1.3)';
  bolt.style.opacity = '0.95';

  setTimeout(() => {
    bolt.remove();
    const burst = document.createElement('div');
    burst.className = 'spell-burst';
    burst.style.left = endX + 'px';
    burst.style.top = endY + 'px';
    field.appendChild(burst);
    setTimeout(() => burst.remove(), 420);
  }, 260);
}

function handleAnswer(btn) {
  const sceneId = stageScenes[stageState.stageNum];
  stopWordTimer(sceneId);

  const isCorrect = btn.dataset.correct === 'true';

  document.querySelectorAll('#' + sceneId + ' .answer-btn').forEach(b => b.disabled = true);

  const monsterEl = document.querySelector('#' + sceneId + ' .monster-sprite');
  const wizardEl = document.querySelector('#' + sceneId + ' .wizard-sprite');

  if (isCorrect) {
    btn.classList.add('correct-flash');
    wizardEl.classList.add('wizard-cast');
    setCharState(wizardEl, 'cast');
    spawnSpellBolt(sceneId);

    stageState.combo += 1;
    if (stageState.combo >= 2) showCombo(sceneId, stageState.combo);

    const isLastWord = stageState.wordIndex >= stageState.words.length - 1;

    // รอให้แสงพุ่งไปถึงตัวอสูรก่อน (~260ms) แล้วค่อยเล่นเอฟเฟกต์โดนโจมตี
    setTimeout(() => {
      playCorrect();
      monsterEl.classList.add('monster-hit');
      setCharState(monsterEl, 'hit');
      monsterEl.style.transitionDuration = '0.4s';
      positionSprites(sceneId, 0, 0.12);

      setTimeout(() => {
        monsterEl.classList.remove('monster-hit');
        wizardEl.classList.remove('wizard-cast');
        setCharState(wizardEl, 'idle');
        setCharState(monsterEl, 'idle');
        monsterEl.style.transitionDuration = '';

        if (isLastWord) {
          document.querySelector('#' + sceneId + ' .monster-hp-fill').style.width = '0%';
          monsterEl.classList.add('monster-die');
          setTimeout(() => {
            goToNextWord(sceneId);
          }, 550);
        } else {
          goToNextWord(sceneId);
        }
      }, 300);
    }, 260);

  } else {
    playWrong();
    btn.classList.add('wrong-flash');
    wizardEl.classList.add('wizard-hit');
    setCharState(wizardEl, 'hit');
    monsterEl.classList.add('monster-lunge');
    setCharState(monsterEl, 'special');
    triggerScreenShake(sceneId);
    spawnImpactSpark(sceneId);

    monsterEl.style.transitionDuration = '0.2s';
    positionSprites(sceneId, 0, 1);
    stageState.combo = 0;
    stageState.hearts -= 1;
    spawnFloatIndicator(sceneId, '-1 ❤');
    renderHearts(sceneId);

    setTimeout(() => {
      wizardEl.classList.remove('wizard-hit');
      monsterEl.classList.remove('monster-lunge');
      setCharState(wizardEl, 'idle');
      setCharState(monsterEl, 'idle');
      monsterEl.style.transitionDuration = '';

      if (stageState.hearts <= 0) {
        playStageFail();
        document.querySelector('#' + sceneId + ' .stage-fail-overlay').classList.add('show');
      } else {
        goToNextWord(sceneId);
      }
    }, 450);
  }
}

function handleTimeout(sceneId) {
  stopWordTimer(sceneId);
  playWrong();
  document.querySelectorAll('#' + sceneId + ' .answer-btn').forEach(b => b.disabled = true);

  const monsterEl = document.querySelector('#' + sceneId + ' .monster-sprite');
  const wizardEl = document.querySelector('#' + sceneId + ' .wizard-sprite');

  wizardEl.classList.add('wizard-hit');
  setCharState(wizardEl, 'hit');
  monsterEl.classList.add('monster-lunge');
  setCharState(monsterEl, 'special');
  triggerScreenShake(sceneId);
  spawnImpactSpark(sceneId);
  stageState.combo = 0;
  stageState.hearts -= 1;
  spawnFloatIndicator(sceneId, '-1 ❤');
  renderHearts(sceneId);

  setTimeout(() => {
    wizardEl.classList.remove('wizard-hit');
    monsterEl.classList.remove('monster-lunge');
    setCharState(wizardEl, 'idle');
    setCharState(monsterEl, 'idle');

    if (stageState.hearts <= 0) {
      playStageFail();
        document.querySelector('#' + sceneId + ' .stage-fail-overlay').classList.add('show');
    } else {
      goToNextWord(sceneId);
    }
  }, 450);
}

function goToNextWord(sceneId) {
  stageState.wordIndex += 1;

  if (stageState.bestCombo === undefined || stageState.combo > stageState.bestCombo) {
    stageState.bestCombo = stageState.combo;
  }

  if (stageState.wordIndex >= stageState.words.length) {
    completeStage(stageState.stageNum);

    const clearTitle = document.querySelector('#' + sceneId + ' .stage-clear-title');
    if (stageState.stageNum === 5) {
      clearTitle.textContent = 'ช่วยเจ้าหญิงสำเร็จ! 🎉';
    } else {
      clearTitle.textContent = 'ผ่านด่านสำเร็จ!';
    }

    // คิดจำนวนดาว: 1 ดาว = ผ่านด่าน, 2 ดาว = หัวใจเต็ม (ตอบถูกไม่พลาดเลย), 3 ดาว = หัวใจเต็ม + เคยทำคอมโบ 4 ขึ้นไป
    let stars = 1;
    if (stageState.hearts >= MAX_HEARTS) stars = 2;
    if (stageState.hearts >= MAX_HEARTS && stageState.bestCombo >= 4) stars = 3;

    const starEls = document.querySelectorAll('#' + sceneId + ' .stage-clear-stars .star');
    starEls.forEach((s, i) => s.classList.toggle('earned', i < stars));

    playStageClear();
    document.querySelector('#' + sceneId + ' .stage-clear-overlay').classList.add('show');
    spawnConfetti(sceneId);
  } else {
    renderStageBattle();
  }
}

// คอนเฟตติ้ร่วงฉลองตอนผ่านด่าน เพิ่มความตื่นเต้น
function spawnConfetti(sceneId) {
  const scene = document.getElementById(sceneId);
  if (!scene) return;
  const colors = ['#f6c453', '#22c55e', '#3b82f6', '#ef4444', '#a855f7', '#fb923c'];
  for (let i = 0; i < 40; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = Math.random() * 100 + '%';
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDuration = (1.8 + Math.random() * 1.4) + 's';
    piece.style.animationDelay = (Math.random() * 0.6) + 's';
    piece.style.transform = 'rotate(' + Math.floor(Math.random() * 360) + 'deg)';
    scene.appendChild(piece);
    setTimeout(() => piece.remove(), 3500);
  }
}

document.querySelectorAll('.back-to-map-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (stageState.stageNum === 5 && progress.clearedStages.includes(5)) {
      goToScene('scene-outro');
      playCutscene('scene-outro', () => {
        if (outroRestartBtn) outroRestartBtn.classList.add('show');
      });
    } else {
      goToScene('scene-map');
      renderStageMap();
    }
  });
});

document.querySelectorAll('.back-to-map-btn-fail').forEach(btn => {
  btn.addEventListener('click', () => {
    goToScene('scene-map');
    renderStageMap();
  });
});