// UNIFY News feed service — no dependencies, Node 18+.
//   npm start                  → http://localhost:8787  (academy) and /api/broadcast?city=Atlanta&grade=6
// Optional env: ANTHROPIC_API_KEY (better anchor copy), ANTHROPIC_MODEL, PORT
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const PORT = process.env.PORT || 8787;
const UA = 'Mozilla/5.0 (compatible; UnifyNewsBot/1.0; school-broadcast)';
const CACHE_MS = 10 * 60 * 1000;

/* ---------- Sources: edit freely ---------- */
const FEEDS = {
  national: [
    { name: 'PBS NewsHour', url: 'https://www.pbs.org/newshour/feeds/rss/headlines' },
    { name: 'NPR', url: 'https://feeds.npr.org/1001/rss.xml' },          // may block some hosts; skipped if it fails
  ],
  world: [
    { name: 'BBC News', url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
  ],
  kids: [ // used for grades K-5 in place of the general feeds
    { name: 'BBC Newsround', url: 'https://feeds.bbci.co.uk/newsround/rss.xml' },
  ],
};
const localFeeds = city => [{
  name: 'Local news',
  url: `https://news.google.com/rss/search?q=${encodeURIComponent(`"${city}" (students OR school OR teens OR youth OR library OR museum OR festival OR science OR team)`)}&hl=en-US&gl=US&ceid=US:en`,
  splitSource: true, // Google News titles end with " - Outlet"
}];

/* ---------- Helpers ---------- */
const decode = s => s.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, ' ');
const strip = s => decode(s).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const tag = (x, t) => { const m = x.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`, 'i')); return m ? m[1] : ''; };

async function get(url, ms = 9000) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), ms);
  try { const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: ctl.signal }); if (!r.ok) throw new Error(r.status); return r; }
  finally { clearTimeout(t); }
}

async function readFeed(f) {
  try {
    const xml = await (await get(f.url)).text();
    return [...xml.matchAll(/<item[\s>][\s\S]*?<\/item>/gi)].slice(0, 25).map(m => {
      const x = m[0]; let title = strip(tag(x, 'title')), source = f.name;
      if (f.splitSource) { const i = title.lastIndexOf(' - '); if (i > 0) { source = title.slice(i + 3); title = title.slice(0, i); } }
      let snippet = strip(tag(x, 'description')); if (snippet.toLowerCase().startsWith(title.toLowerCase().slice(0, 30))) snippet = '';
      return { title, snippet: snippet.slice(0, 400), link: strip(tag(x, 'link')), source, date: new Date(strip(tag(x, 'pubDate')) || Date.now()) };
    }).filter(i => i.title);
  } catch (e) { console.warn('feed failed:', f.name, e.message); return []; }
}

/* ---------- Age-appropriate filtering ---------- */
const HARSH = /\b(kill(ed|ing|s)?|murder\w*|shoot(ing|er|s)?|shot dead|dead|deaths?|die[sd]?|dying|attack(s|ed)?|war|bomb\w*|rape\w*|abus\w+|suicid\w*|terror\w*|massacre|hostage|stabb\w*|gun\w*|sexual\w*|overdose|crash(es|ed)?)\b/i;
const SEVERE = /\b(rape\w*|suicid\w*|sexual\w*|massacre|overdose|graphic)\b/i;
const gradeNum = g => (String(g).toUpperCase() === 'K' ? 0 : parseInt(g, 10) || 6);
const okForGrade = (i, g) => !(g >= 9 ? SEVERE : HARSH).test(i.title + ' ' + i.snippet);
// Local stories should feel like school-community news, not politics or crime.
const LOCAL_LIKE = /\b(school|student|teen|youth|kids?|children|teacher|library|museum|zoo|park|garden|festival|science|stem|robot\w*|art|music|band|choir|theater|team|champion\w*|college|universit\w*|scholar\w*|community|volunteer|food|chef|animal|aquarium|concert|reading|sports?)\b/i;
const LOCAL_SKIP = /\b(elect\w*|endorse\w*|campaign|council|zoning|lawsuit|indict\w*|polic\w*|arrest\w*|court|mayor|vote\w*|poll|governor|senator|sheriff|develop\w*|tax|budget|candidate|editorial|opinion|column|school board|board of)\b/i;
const localScore = i => (LOCAL_SKIP.test(i.title) ? -5 : 0) + (LOCAL_LIKE.test(i.title + ' ' + i.snippet) ? 3 : 0);
const norm = t => t.toLowerCase().replace(/[^a-z0-9 ]/g, '').slice(0, 50);

function pickItems(items, n, g, maxAgeH) {
  const seen = new Set(), now = Date.now();
  return items.filter(i => i.date && now - i.date.getTime() < maxAgeH * 3600e3 && okForGrade(i, g))
    .sort((a, b) => b.date - a.date)
    .filter(i => { const k = norm(i.title); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, n);
}

/* ---------- Weather (Open-Meteo, no key) ---------- */
async function geocode(city) {
  const j = await (await get(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`)).json();
  const r = j.results?.[0]; if (!r) throw new Error('city not found: ' + city);
  return { name: r.name, admin: r.admin1 || '', lat: r.latitude, lon: r.longitude };
}
const WX = code => code === 0 ? ['sun', 'Sunny'] : code <= 2 ? ['partly', 'Partly cloudy'] : code === 3 ? ['partly', 'Cloudy'] : code <= 48 ? ['partly', 'Foggy']
  : code <= 67 || (code >= 80 && code <= 82) ? ['rain', 'Rain'] : code <= 77 || code === 85 || code === 86 ? ['rain', 'Snow'] : ['rain', 'Storms'];
async function weather(place) {
  const offs = [[0, 0, place.name], [0.12, 0, 'Northside'], [0, 0.14, 'Eastside'], [-0.12, 0, 'Southside']];
  const lat = offs.map(o => (place.lat + o[0]).toFixed(3)).join(','), lon = offs.map(o => (place.lon + o[1]).toFixed(3)).join(',');
  const j = await (await get(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,wind_speed_10m_max,precipitation_probability_max&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto&forecast_days=1`)).json();
  return (Array.isArray(j) ? j : [j]).map((d, i) => {
    let [type, label] = WX(d.daily.weather_code[0]);
    if (type !== 'rain' && d.daily.wind_speed_10m_max[0] >= 22) { type = 'wind'; label = 'Breezy'; }
    return { name: offs[i][2], type, label, temp: Math.round(d.daily.temperature_2m_max[0]), rainChance: d.daily.precipitation_probability_max[0], windMph: Math.round(d.daily.wind_speed_10m_max[0]) };
  });
}

/* ---------- Anchor copy ---------- */
const firstSentence = s => (s.match(/^.{20,240}?[.!?](\s|$)/) || [s.slice(0, 200)])[0].trim();
function plainCopy(s) { // no-LLM fallback: uses only the feed's own words
  const vo = []; const snip = s.snippet && firstSentence(s.snippet); if (snip) vo.push(snip);
  vo.push(snip ? `That's according to ${s.source}.` : `The story comes from ${s.source}, and there's a link for the full report.`);
  return { intro: `${{ local: 'Close to home', national: 'Nationally', world: 'Around the world' }[s.tier]}: ${s.title}.`, vo };
}
async function llmCopy(stories, grade) {
  const key = process.env.ANTHROPIC_API_KEY; if (!key) return null;
  const prompt = `You write anchor copy for a school news broadcast for grade ${grade} students.
For each story return JSON: {"id":number,"intro":string (<=25 words, anchor lead-in),"vo":[1-3 sentences, <=22 words each]}.
Rules: use ONLY facts present in the title/snippet. Never add names, numbers, places or claims that are not there. If the snippet is thin, use one sentence. Mention the source once ("according to X"). Age-appropriate, calm tone, no graphic detail. Do not copy sentences verbatim; retell in your own words.
Return ONLY a JSON array.\n\n` + JSON.stringify(stories.map((s, id) => ({ id, tier: s.tier, source: s.source, title: s.title, snippet: s.snippet })));
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001', max_tokens: 1800, messages: [{ role: 'user', content: prompt }] }) });
    const j = await r.json(); const txt = j.content?.map(c => c.text || '').join('') || '';
    return JSON.parse(txt.slice(txt.indexOf('['), txt.lastIndexOf(']') + 1));
  } catch (e) { console.warn('LLM copy failed:', e.message); return null; }
}

/* ---------- Build the broadcast ---------- */
const cache = new Map();
async function build(city, grade) {
  const g = gradeNum(grade), key = `${city.toLowerCase()}|${g <= 5 ? 'k5' : g <= 8 ? 'ms' : 'hs'}`;
  const hit = cache.get(key); if (hit && Date.now() - hit.t < CACHE_MS) return hit.data;
  const place = await geocode(city);
  const kids = g <= 5;
  const [wx, loc, nat, wor] = await Promise.all([
    weather(place),
    Promise.all(localFeeds(city).map(readFeed)).then(a => a.flat()),
    Promise.all((kids ? FEEDS.kids : FEEDS.national).map(readFeed)).then(a => a.flat()),
    Promise.all((kids ? FEEDS.kids : FEEDS.world).map(readFeed)).then(a => a.flat()),
  ]);
  const natPick = pickItems(nat, 1, g, 72);
  const worPick = pickItems(wor.filter(w => !natPick.some(n => norm(n.title) === norm(w.title))), 1, g, 72);
  const chosen = [
    ...pickItems(loc.filter(i => localScore(i) > 0), 2, g, 24 * 14).map(i => ({ ...i, tier: 'local' })),
    ...natPick.map(i => ({ ...i, tier: 'national' })),
    ...worPick.map(i => ({ ...i, tier: 'world' })),
  ];
  const ai = await llmCopy(chosen, g === 0 ? 'K' : g);
  const stories = chosen.map((s, idx) => {
    const c = (ai && ai.find(x => x.id === idx)) || plainCopy(s);
    return { tier: s.tier, headline: s.title, source: s.source, link: s.link, published: s.date.toISOString(), intro: c.intro, vo: (c.vo || []).slice(0, 3), place: s.tier === 'local' ? `${place.name}, ${place.admin}` : undefined };
  });
  const data = { generatedAt: new Date().toISOString(), place: `${place.name}, ${place.admin}`, grade: g, llm: !!ai,
    weather: wx, local: stories.filter(s => s.tier === 'local'), national: stories.filter(s => s.tier === 'national'), world: stories.filter(s => s.tier === 'world') };
  cache.set(key, { t: Date.now(), data }); return data;
}

/* ---------- HTTP ---------- */
// Serves the UNIFY academy (repo root) + the news feed API.
//   /                  -> index.html (academy shell: hallway + auditorium + newsroom)
//   /*.html            -> pages at the repo root
//   /assets/unify/...  -> public/assets/unify/...
//   /demo/dist/...     -> built auditorium bundle (npm run build)
//   /api/broadcast     -> live weather + local/national/world stories
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.css': 'text/css', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
function resolveStatic(pathname) {
  let p = decodeURIComponent(pathname);
  if (p === '/') p = '/index.html';
  let file;
  if (/^\/[\w-]+\.html$/.test(p)) file = path.join(root, p);
  else if (p.startsWith('/assets/')) file = path.join(root, 'public', p);
  else if (p.startsWith('/demo/dist/')) file = path.join(root, p);
  else return null;
  file = path.normalize(file);
  return file.startsWith(root + path.sep) && MIME[path.extname(file)] ? file : null;
}
http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x'); res.setHeader('Access-Control-Allow-Origin', '*');
  if (u.pathname === '/api/broadcast') {
    try { const d = await build(u.searchParams.get('city') || process.env.SCHOOL_CITY || 'Atlanta', u.searchParams.get('grade') || '6');
      res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(d)); }
    catch (e) { res.writeHead(502, { 'content-type': 'application/json' }); res.end(JSON.stringify({ error: String(e.message) })); }
    return;
  }
  try {
    const file = resolveStatic(u.pathname);
    if (!file) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'content-type': MIME[path.extname(file)], 'cache-control': file.endsWith('.png') ? 'public, max-age=3600' : 'no-cache' });
    res.end(await readFile(file));
  } catch { res.writeHead(404); res.end('not found'); }
}).listen(PORT, () => console.log(`UNIFY academy on http://localhost:${PORT}  (feed: /api/broadcast?city=Atlanta&grade=6)`));
