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
const enc = encodeURIComponent;
const googleEdition = cc => { const c = (cc || 'US').toUpperCase(); return `hl=en-${c === 'GB' ? 'GB' : 'US'}&gl=${c}&ceid=${c}:en`; };
const GN = (p, cc) => `https://news.google.com/rss${p}${p.includes('?') ? '&' : '?'}${googleEdition(cc)}`;
const GN_TOPICS = ['NATION', 'BUSINESS', 'TECHNOLOGY', 'ENTERTAINMENT', 'SPORTS', 'SCIENCE', 'HEALTH'];
const US_NATIONAL = [
  { name: 'PBS NewsHour', url: 'https://www.pbs.org/newshour/feeds/rss/headlines' }, { name: 'NPR', url: 'https://feeds.npr.org/1001/rss.xml' },
  { name: 'ABC News', url: 'https://abcnews.go.com/abcnews/topstories' }, { name: 'CBS News', url: 'https://www.cbsnews.com/latest/rss/main' },
  { name: 'NBC News', url: 'https://feeds.nbcnews.com/nbcnews/public/news' }, { name: 'The Guardian US', url: 'https://www.theguardian.com/us-news/rss' },
];
const WORLD = [
  { name: 'BBC News', url: 'https://feeds.bbci.co.uk/news/world/rss.xml' }, { name: 'BBC Africa', url: 'https://feeds.bbci.co.uk/news/world/africa/rss.xml' },
  { name: 'BBC Asia', url: 'https://feeds.bbci.co.uk/news/world/asia/rss.xml' }, { name: 'BBC Europe', url: 'https://feeds.bbci.co.uk/news/world/europe/rss.xml' },
  { name: 'BBC Latin America', url: 'https://feeds.bbci.co.uk/news/world/latin_america/rss.xml' }, { name: 'BBC Middle East', url: 'https://feeds.bbci.co.uk/news/world/middle_east/rss.xml' },
  { name: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml' }, { name: 'DW', url: 'https://rss.dw.com/rdf/rss-en-all' }, { name: 'France 24', url: 'https://www.france24.com/en/rss' },
  { name: 'NPR World', url: 'https://feeds.npr.org/1004/rss.xml' }, { name: 'The Guardian World', url: 'https://www.theguardian.com/world/rss' }, { name: 'UN News', url: 'https://news.un.org/feed/subscribe/en/news/all/rss.xml' },
];
/** Classroom sources by grade band: article feeds for the "learn" tier, plus watch-and-learn sites (CNN 10 and PBS KIDS have no usable feed, so they are links). */
const LEARN = {
  k5: [{ name: 'DOGOnews', url: 'https://www.dogonews.com/articles.rss' }],
  ms: [{ name: 'PBS NewsHour Classroom', url: 'https://www.pbs.org/newshour/classroom/rss/latest-daily-news-lessons' }],
  hs: [{ name: 'PBS NewsHour Classroom', url: 'https://www.pbs.org/newshour/classroom/rss/latest-daily-news-lessons' }, { name: 'PBS Student Reporting Labs', url: 'https://studentreportinglabs.org/feed/' }],
};
const RESOURCES = {
  k5: [{ name: 'DOGOnews', url: 'https://www.dogonews.com', what: 'Kid-friendly articles' }, { name: 'PBS KIDS', url: 'https://pbskids.org', what: 'Videos, games and activities' }],
  ms: [{ name: 'CNN 10', url: 'https://www.cnn.com/cnn10', what: 'Short news videos' }, { name: 'PBS NewsHour Classroom', url: 'https://www.pbs.org/newshour/classroom', what: 'News lessons' }],
  hs: [{ name: 'PBS NewsHour Classroom', url: 'https://www.pbs.org/newshour/classroom', what: 'Current events lessons' }, { name: 'PBS Student Reporting Labs', url: 'https://studentreportinglabs.org', what: 'Journalism and media literacy' }],
};
const band = g => (g <= 5 ? 'k5' : g <= 8 ? 'ms' : 'hs');
const KIDS = [{ name: 'BBC Newsround', url: 'https://feeds.bbci.co.uk/newsround/rss.xml' }];
/** feeds for a place + edition. `when:` narrows Google News searches to the edition's time window. */
function feedsFor(place, edition, kids) {
  const cc = place.cc || 'US', when = edition === 'am' ? 'when:1d' : 'when:12h', where = [place.name, place.admin].filter(Boolean).join(', ');
  const local = [
    { name: 'Local news', url: GN(`/headlines/section/geo/${enc(where)}`, cc), splitSource: true },
    { name: 'Local news', url: GN(`/search?q=${enc(`"${place.name}" ${when}`)}`, cc), splitSource: true },
    { name: 'Local news', url: GN(`/search?q=${enc(`${where} (community OR city OR county OR weather OR traffic OR school OR students) ${when}`)}`, cc), splitSource: true },
  ];
  const national = kids ? [...KIDS] : [{ name: 'Top stories', url: GN('', cc), splitSource: true }, ...GN_TOPICS.map(t => ({ name: t.toLowerCase(), url: GN(`/headlines/section/topic/${t}`, cc), splitSource: true })), ...(cc === 'US' ? US_NATIONAL : [])];
  const world = kids ? [...KIDS] : [{ name: 'World', url: GN('/headlines/section/topic/WORLD', cc), splitSource: true }, ...WORLD];
  return { local, national, world };
}

/* ---------- Helpers ---------- */
const decode = s => s.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, ' ');
const strip = s => decode(s).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const tag = (x, t) => { const m = x.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`, 'i')); return m ? m[1] : ''; };

const parseDate = v => { const d = new Date(v); return isNaN(d) ? new Date() : d; };
async function get(url, ms = 7000) {
  if (process.env.UNIFY_MOCK_FEEDS) return mockResponse(url);
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), ms);
  try { const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: ctl.signal }); if (!r.ok) throw new Error(r.status); return r; }
  finally { clearTimeout(t); }
}

async function readFeed(f) {
  try {
    const xml = await (await get(f.url)).text();
    return [...xml.matchAll(/<(?:item|entry)[\s>][\s\S]*?<\/(?:item|entry)>/gi)].slice(0, 120).map(m => {
      const x = m[0]; let title = strip(tag(x, 'title')), source = f.name;
      if (f.splitSource) { const i = title.lastIndexOf(' - '); if (i > 0) { source = title.slice(i + 3); title = title.slice(0, i); } }
      let snippet = strip(tag(x, 'description') || tag(x, 'summary') || tag(x, 'content')); if (snippet.toLowerCase().startsWith(title.toLowerCase().slice(0, 30))) snippet = '';
      return { title, snippet: snippet.slice(0, 400), link: strip(tag(x, 'link')) || ((x.match(/<link[^>]*href="([^"]+)"/i) || [])[1] || ''), source, date: parseDate(strip(tag(x, 'pubDate') || tag(x, 'dc:date') || tag(x, 'published') || tag(x, 'updated'))) };
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

/** Newest-first, de-duplicated stories inside the edition window (widened until there are `min` of them, up to 4 days). No upper cap. */
function selectTier(items, g, hours, min, filter = () => true) {
  const now = Date.now(), ok = items.filter(i => okForGrade(i, g) && filter(i)).sort((a, b) => b.date - a.date);
  let h = hours, out = [];
  for (let k = 0; k < 4; k++, h *= 2) {
    const seen = new Set(); out = ok.filter(i => now - i.date.getTime() < h * 3600e3).filter(i => { const key = norm(i.title) + '|' + i.title.toLowerCase().split(/\s+/).slice(0, 5).join(' '); if (seen.has(key)) return false; seen.add(key); return true; });
    if (out.length >= min || h >= 96) break;
  }
  return { items: out, hours: h };
}
/** local time pieces for an IANA zone */
function localParts(tz) {
  try { const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz || 'UTC', hour: 'numeric', minute: 'numeric', hour12: false, weekday: 'long', month: 'long', day: 'numeric' }).formatToParts(new Date()).map(x => [x.type, x.value]));
    return { h: (+p.hour) % 24, m: +p.minute, weekday: p.weekday, month: p.month, day: p.day }; } catch { const d = new Date(); return { h: d.getUTCHours(), m: d.getUTCMinutes(), weekday: '', month: '', day: '' }; }
}
const editionNow = tz => localParts(tz).h < 12 ? 'am' : 'pm';
/** AM = since 6 pm yesterday, PM = since 6 am today (hours back from now, clamped) */
function windowHours(edition, tz) { const { h, m } = localParts(tz), now = h + m / 60; return Math.max(6, Math.min(30, edition === 'am' ? now + 6 : now - 6)); }

/* ---------- Weather (Open-Meteo, no key) ---------- */
async function geocode(city) {
  const j = await (await get(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`)).json();
  const r = j.results?.[0]; if (!r) throw new Error('city not found: ' + city);
  return { name: r.name, admin: r.admin1 || '', cc: r.country_code || 'US', country: r.country || '', lat: r.latitude, lon: r.longitude, tz: r.timezone };
}
async function reverseGeocode(lat, lon) {
  try { const j = await (await get(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`)).json();
    const name = j.city || j.locality || j.principalSubdivision || 'Your area'; return { name, admin: j.principalSubdivisionCode ? String(j.principalSubdivisionCode).split('-').pop() : (j.principalSubdivision || ''), cc: j.countryCode || 'US', country: j.countryName || '', lat: +lat, lon: +lon };
  } catch { return { name: 'Your area', admin: '', cc: 'US', country: '', lat: +lat, lon: +lon }; }
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
async function llmChunk(stories, grade, offset) {
  const key = process.env.ANTHROPIC_API_KEY; if (!key) return null;
  const prompt = `You write anchor copy for a school news broadcast for grade ${grade} students.
For each story return JSON: {"id":number,"intro":string (<=25 words, anchor lead-in),"vo":[1-3 sentences, <=22 words each]}.
Rules: use ONLY facts present in the title/snippet. Never add names, numbers, places or claims that are not there. If the snippet is thin, use one sentence. Mention the source once ("according to X"). Age-appropriate, calm tone, no graphic detail. Do not copy long phrases from the snippet.
Return ONLY a JSON array.\n\n` + JSON.stringify(stories.map((s, i) => ({ id: offset + i, tier: s.tier, source: s.source, title: s.title, snippet: s.snippet })));
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001', max_tokens: 3000, messages: [{ role: 'user', content: prompt }] }) });
    const j = await r.json(); const txt = j.content?.map(c => c.text || '').join('') || '';
    return JSON.parse(txt.slice(txt.indexOf('['), txt.lastIndexOf(']') + 1));
  } catch (e) { console.warn('LLM copy failed:', e.message); return null; }
}
/** every story gets copy: model chunks of 12 in parallel (4 at a time), the plain fallback for any that fail */
async function llmCopy(stories, grade) {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  const out = [], chunks = []; for (let i = 0; i < stories.length; i += 12) chunks.push([i, stories.slice(i, i + 12)]);
  for (let i = 0; i < chunks.length; i += 4) (await Promise.all(chunks.slice(i, i + 4).map(([o, c]) => llmChunk(c, grade, o)))).forEach(r => r && out.push(...r));
  return out;
}

/* ---------- Build the broadcast ---------- */
const cache = new Map();
/** opts: { city, lat, lon, tz, grade, edition ('am'|'pm'), limit } */
async function build(o) {
  const g = gradeNum(o.grade || 6), kids = g <= 5;
  let place; if (o.lat != null && o.lon != null && !isNaN(+o.lat) && !isNaN(+o.lon)) place = await reverseGeocode(+o.lat, +o.lon); else place = await geocode(o.city || process.env.SCHOOL_CITY || 'Atlanta');
  const tz = o.tz || place.tz, edition = o.edition === 'am' || o.edition === 'pm' ? o.edition : editionNow(tz), win = windowHours(edition, tz);
  const key = `${place.name}|${place.admin}|${place.cc}|${edition}|${g <= 5 ? 'k5' : g <= 8 ? 'ms' : 'hs'}|${Math.floor(Date.now() / CACHE_MS)}`;
  const hit = cache.get(key); if (hit) return withLimit(hit, o.limit);
  const f = feedsFor(place, edition, kids), all = a => Promise.all(a.map(readFeed)).then(r => r.flat());
  const [wx, loc, nat, wor, lrn] = await Promise.all([weather(place).catch(() => []), all(f.local), all(f.national), all(f.world), all(LEARN[band(g)])]);
  const Ln = selectTier(lrn, g, 14 * 24, 1);
  const L = selectTier(loc.filter(i => localScore(i) > -4), g, win, 8), N = selectTier(nat, g, win, 12), Wd = selectTier(wor.filter(w => !nat.some(n => norm(n.title) === norm(w.title))), g, win, 12);
  const chosen = [...L.items.map(i => ({ ...i, tier: 'local' })), ...N.items.map(i => ({ ...i, tier: 'national' })), ...Wd.items.map(i => ({ ...i, tier: 'world' })), ...Ln.items.slice(0, 8).map(i => ({ ...i, tier: 'learn' }))];
  const ai = await llmCopy(chosen, g === 0 ? 'K' : g);
  const stories = chosen.map((s, idx) => {
    const c = (ai && ai.find(x => x.id === idx)) || plainCopy(s);
    return { id: createHash(s.link || s.title), tier: s.tier, headline: s.title, source: s.source, link: s.link, published: s.date.toISOString(), snippet: s.snippet.slice(0, 280), intro: c.intro, vo: (c.vo || []).slice(0, 3), place: s.tier === 'local' ? [place.name, place.admin].filter(Boolean).join(', ') : undefined };
  });
  const lp = localParts(tz), data = { generatedAt: new Date().toISOString(), place: [place.name, place.admin].filter(Boolean).join(', '), country: place.country, cc: place.cc, lat: place.lat, lon: place.lon, tz: tz || 'UTC', grade: g, edition,
    editionLabel: `${edition === 'am' ? 'Morning' : 'Evening'} edition`, localDate: `${lp.weekday}, ${lp.month} ${lp.day}`, windowHours: Math.round(Math.max(L.hours, N.hours, Wd.hours)), llm: !!ai, weather: wx, stories,
    local: stories.filter(s => s.tier === 'local'), national: stories.filter(s => s.tier === 'national'), world: stories.filter(s => s.tier === 'world'), learn: stories.filter(s => s.tier === 'learn'), resources: RESOURCES[band(g)] };
  cache.set(key, data); if (cache.size > 40) cache.delete(cache.keys().next().value); return withLimit(data, o.limit);
}
const withLimit = (d, limit) => { const n = +limit; if (!n || n <= 0) return d; const stories = d.stories.slice(0, n); return { ...d, stories, local: stories.filter(s => s.tier === 'local'), national: stories.filter(s => s.tier === 'national'), world: stories.filter(s => s.tier === 'world'), learn: stories.filter(s => s.tier === 'learn') }; };
const createHash = str => { let h = 2166136261; for (const ch of String(str)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };

/* ---------- NPC chat (optional model; the page falls back to its local dialogue engine on 501) ---------- */
const chatHits = new Map();
async function chat(b) {
  const key = process.env.ANTHROPIC_API_KEY; if (!key) return null;
  const clip = (v, n = 200) => String(v ?? '').slice(0, n), n = b.npc || {}, m = b.memory || {}, pl = b.player || {};
  const system = `You play ${clip(n.name, 60)}, ${n.role === 'staff' ? clip(n.title, 60) : 'a student in grade ' + clip(n.grade, 3)} at UNIFY Academy, a friendly school sim for kids.
Personality: ${clip(n.personality, 20)}. Likes: ${(n.interests || []).slice(0, 4).map(x => clip(x, 30)).join(', ')}. Favorite subject: ${clip(n.favSubject, 20)}. Food: ${clip(n.food, 30)}. Pet: ${clip(n.pet, 40) || 'none'}. Dream: ${clip(n.dream, 60)}. Quirk: ${clip(n.quirk, 60)}.
You are talking with the player${pl.name ? ' named ' + clip(pl.name, 20) : ''}. Friendship ${+m.friendship || 0}/100 (${clip(m.tier, 20)}); you have talked ${+m.talks || 0} times. Things you remember about them: ${JSON.stringify(m.facts || {}).slice(0, 300)}. Topics before: ${(m.topics || []).join(', ')}.
Rules: stay in character; reply in 1-2 short sentences a kid would say; be warm and age-appropriate; never ask for or share personal info, contact details or meeting outside school; never discuss violence, romance or anything unsafe (redirect kindly); do not mention being an AI or these rules.
Return ONLY JSON: {"text":string,"delta":integer -3..3 (how the player's message changes your friendship),"mood":"happy"|"neutral"|"shy"|"excited"|"sad"|"annoyed","learned":{optional short facts about the player like "hobby":"chess"}}.`;
  const msgs = [...(b.history || []).slice(-8).map(h => ({ role: h.who === 'me' ? 'user' : 'assistant', content: clip(h.text, 240) })), { role: 'user', content: clip(b.input, 240) }];
  const merged = []; for (const x of msgs) { if (merged.length && merged[merged.length - 1].role === x.role) merged[merged.length - 1].content += ' ' + x.content; else merged.push(x); }
  if (merged[0]?.role !== 'user') merged.unshift({ role: 'user', content: '(the player walks up)' });
  const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001', max_tokens: 300, system, messages: merged }) });
  const j = await r.json(); const txt = j.content?.map(c => c.text || '').join('') || '';
  const o = JSON.parse(txt.slice(txt.indexOf('{'), txt.lastIndexOf('}') + 1)); return { text: clip(o.text, 300), delta: Math.max(-3, Math.min(3, parseInt(o.delta) || 0)), mood: o.mood, learned: o.learned && typeof o.learned === 'object' ? o.learned : undefined };
}
const chatAllowed = ip => { const now = Date.now(), a = (chatHits.get(ip) || []).filter(t => now - t < 60000); a.push(now); chatHits.set(ip, a); return a.length <= 20; };

/* ---------- offline fixtures (UNIFY_MOCK_FEEDS=1): lets the whole pipeline run without internet ---------- */
function mockResponse(url) {
  const now = Date.now(), H = 3600e3, rss = items => `<?xml version="1.0"?><rss><channel>${items.map(([t, d, h]) => `<item><title>${t}</title><link>https://example.com/${encodeURIComponent(t).slice(0, 40)}</link><description>${d}</description><pubDate>${new Date(now - h * H).toUTCString()}</pubDate></item>`).join('')}</channel></rss>`;
  const u = new URL(url);
  if (/dogonews|studentreportinglabs/.test(u.hostname) || u.pathname.includes('/classroom/')) return { ok: true, text: async () => rss([['Why do we have leap years? A simple explainer', 'Earth takes a little longer than 365 days to circle the Sun.', 20], ['Students build a tiny weather station', 'A class shows how to measure rain and wind with simple tools.', 40], ['How to spot a trustworthy news source', 'Check who wrote it, when, and whether others report the same facts.', 60]]) };
  if (u.hostname.startsWith('geocoding-api')) return { ok: true, json: async () => ({ results: [{ name: u.searchParams.get('name'), admin1: 'Georgia', country_code: 'US', country: 'United States', latitude: 33.75, longitude: -84.39, timezone: 'America/New_York' }] }) };
  if (u.hostname.startsWith('api.bigdatacloud')) return { ok: true, json: async () => ({ city: 'Decatur', principalSubdivisionCode: 'US-GA', principalSubdivision: 'Georgia', countryCode: 'US', countryName: 'United States' }) };
  if (u.hostname.startsWith('api.open-meteo')) { const one = { daily: { weather_code: [2], temperature_2m_max: [71], wind_speed_10m_max: [9], precipitation_probability_max: [20] } }; return { ok: true, json: async () => [one, one, one, one] }; }
  const tier = u.hostname.includes('google') ? (u.pathname.includes('/geo/') || u.pathname.includes('/search') ? 'local' : 'nat') : /bbc|jazeera|dw\.com|france24|un\.org|guardian\.com\/world|npr\.org\/1004/.test(u.hostname + u.pathname) ? 'world' : 'nat';
  const seed = [...u.hostname + u.pathname].reduce((a, c) => a + c.charCodeAt(0), 0);
  const L = [['Decatur students win regional robotics title after record build', 'A team from the area took first place and will head to the state finals next month.', 3], ['Library in Decatur opens new maker space for kids', 'The space has 3D printers, art supplies and quiet reading corners.', 5], ['Heavy rain expected across metro Atlanta this evening', 'Forecasters say storms will clear by morning with temperatures near 60.', 2], ['Atlanta farmers market adds weekend hours', 'Vendors will sell fruit, bread and flowers until 4 pm.', 7], ['Local high school choir to perform at the city hall concert series', 'The free concert starts Saturday at noon.', 9]];
  const N = [['NASA announces new moon mission crew', 'Four astronauts will train for a lunar flyby planned for next year.', 2], ['Congress debates school lunch funding bill', 'Lawmakers are weighing a proposal to expand free meals.', 4], ['U.S. economy adds jobs as inflation cools', 'Economists say hiring was steady across several industries.', 6], ['National park service reports record spring visitors', 'Parks in the West saw the busiest season on record.', 8], ['New study links sleep and better grades in teens', 'Researchers followed 2,000 students for two years.', 5], ['Basketball finals begin tonight in Chicago', 'Both teams are healthy and fans filled the arena.', 3], ['Tech company unveils solar powered laptop', 'The battery can run a week on a sunny windowsill.', 10]];
  const W = [['Japan launches new high speed train line', 'The line connects two major cities in under an hour.', 4], ['Floods hit northern India as monsoon arrives early', 'Rescue teams moved families to shelters.', 3], ['Brazil celebrates restored rainforest corridor', 'Conservationists planted a million trees over five years.', 6], ['European leaders meet in Brussels to discuss climate goals', 'Talks focused on clean energy and public transport.', 5], ['Kenya runner breaks marathon record in Berlin', 'The new time is two minutes faster than last year.', 7], ['Australia opens world largest marine reserve expansion', 'The protected waters are home to coral and sea turtles.', 11], ['Egypt museum shows newly found ancient artifacts', 'Visitors can see gold masks and papyrus scrolls.', 9]];
  const src = tier === 'local' ? L : tier === 'world' ? W : N, rot = seed % src.length; const items = [...src.slice(rot), ...src.slice(0, rot)].map(([t, d, h], i) => [`${t}${u.hostname.includes('google') ? ' - ' + ['Daily Courier', 'City Herald', 'Metro Times'][i % 3] : ''}`, d, h + (seed % 3)]);
  return { ok: true, text: async () => rss(items) };
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
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.css': 'text/css', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json' };
function resolveStatic(pathname) {
  let p = decodeURIComponent(pathname);
  if (p === '/') p = '/index.html';
  let file;
  if (p === '/phone') p = '/phone.html';
  if (/^\/[\w-]+\.html$/.test(p) || /^\/phone[\w.-]*\.(webmanifest|js|svg)$/.test(p) || /^\/(game\.webmanifest|icon-(180|192|512)\.png)$/.test(p) || p === '/firebase-config.js') file = path.join(root, p);
  else if (p.startsWith('/assets/')) file = path.join(root, 'public', p);
  else if (p.startsWith('/demo/dist/')) file = path.join(root, p);
  else return null;
  file = path.normalize(file);
  return file.startsWith(root + path.sep) && MIME[path.extname(file)] ? file : null;
}
http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x'); res.setHeader('Access-Control-Allow-Origin', '*');
  if (u.pathname === '/api/broadcast') {
    try { const q = u.searchParams, d = await build({ city: q.get('city'), lat: q.get('lat'), lon: q.get('lon'), tz: q.get('tz'), grade: q.get('grade') || '6', edition: q.get('edition'), limit: q.get('limit') });
      res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(d)); }
    catch (e) { res.writeHead(502, { 'content-type': 'application/json' }); res.end(JSON.stringify({ error: String(e.message) })); }
    return;
  }
  if (u.pathname === '/api/chat' && req.method === 'POST') {
    try { const chunks = []; let n = 0; for await (const c of req) { n += c.length; if (n > 16000) throw new Error('too big'); chunks.push(c); }
      if (!chatAllowed(req.socket.remoteAddress || 'x')) { res.writeHead(429); return res.end('slow down'); }
      const r = await chat(JSON.parse(Buffer.concat(chunks).toString())); if (!r) { res.writeHead(501); return res.end('no model'); }
      res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(r)); }
    catch (e) { res.writeHead(502); res.end('chat failed'); }
    return;
  }
  try {
    const file = resolveStatic(u.pathname);
    if (!file) { res.writeHead(404); return res.end('not found'); }
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[path.extname(file)], 'cache-control': file.endsWith('.png') ? 'public, max-age=3600' : 'no-cache' });
    res.end(body);
  } catch { res.writeHead(404); res.end('not found'); }
}).listen(PORT, () => console.log(`UNIFY academy on http://localhost:${PORT}  (feed: /api/broadcast?city=Atlanta&grade=6)`));
