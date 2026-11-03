// Draws the site icons and the link-preview image from the game's own tin soldiers (js/art.js), so they match the game.
// usage: node design/make-icons.js   (writes img/icon-512.png, img/icon-180.png, img/icon-32.png and img/preview.jpg)
// It serves the repo on a spare port, opens the page in the pre-installed Chromium and draws with tin().
const http = require("http"), fs = require("fs"), path = require("path");
const { chromium } = require("playwright");
const root = path.join(__dirname, ".."), out = path.join(root, "img");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };

const server = http.createServer((req, res) => {
  const f = path.join(root, decodeURIComponent(new URL(req.url, "http://x").pathname.replace(/\/$/, "/index.html")));
  if (!f.startsWith(root) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" });
  fs.createReadStream(f).pipe(res);
});

server.listen(0, async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`http://localhost:${server.address().port}/`);
  await page.evaluate(() => Promise.all(['900 150px "Big Shoulders Display"', '600 46px "Caveat"', '500 30px "Barlow"'].map(f => document.fonts.load(f))));
  const images = await page.evaluate(() => {
    const canvas = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return [c, c.getContext("2d")]; };
    const BG = "#0d121b", BRASS = "#e0ac45";

    // The icon: your cadet in brass ring on a dark tile. iOS and Android round the corners themselves.
    // The 32px favicon crops in to the shako and coat so it still reads in a browser tab.
    const icon = (size, tight) => {
      const [c, g] = canvas(size, size), k = size / (tight ? 76 : 128);
      const glow = g.createRadialGradient(size / 2, size * 0.42, 0, size / 2, size * 0.42, size * 0.62);
      glow.addColorStop(0, "#2a3a55"); glow.addColorStop(1, BG);
      g.fillStyle = glow; g.fillRect(0, 0, size, size);
      tin(g, size / 2, size * (tight ? 1.2 : 0.86), k, TIN.cadet, { ring: tight ? null : BRASS });
      return c.toDataURL("image/png");
    };

    // The preview card (1200x630): the name, the hook, and a line of soldiers copying the cadet's step.
    const preview = () => {
      const W = 1200, H = 630, [c, g] = canvas(W, H);
      const glow = g.createRadialGradient(W / 2, -60, 0, W / 2, -60, 760);
      glow.addColorStop(0, "#4d3c25"); glow.addColorStop(1, "#15110c");
      g.fillStyle = glow; g.fillRect(0, 0, W, H);
      g.textAlign = "center";
      g.font = '900 150px "Big Shoulders Display"';
      const a = "LOCK", b = "STEP", wa = g.measureText(a).width, wb = g.measureText(b).width, x0 = W / 2 - (wa + wb) / 2;
      g.textAlign = "left";
      g.fillStyle = "#f4ecdc"; g.fillText(a, x0, 190);
      g.fillStyle = BRASS; g.fillText(b, x0 + wa, 190);
      g.textAlign = "center"; g.fillStyle = "#d8cbb2";
      g.font = '600 46px "Caveat"'; g.fillText("The room copies your every move.", W / 2, 262);
      // The floor: a strip of tiles, the cadet in brass and a line of soldiers mirroring it.
      const s = 104, top = 340, cols = 12, rowH = 150, left = (W - cols * s) / 2;
      for (let x = 0; x < cols; x++) { g.fillStyle = x % 2 ? "#6b5a3f" : "#7a6848"; g.fillRect(left + x * s, top, s, rowH); }
      const k = 1.15;
      g.fillStyle = "rgba(214,148,30,0.55)"; g.fillRect(left + 2 * s + 3, top + 3, s - 6, rowH - 6);
      tin(g, left + 2.5 * s, top + rowH * 0.86, k, TIN.cadet, { ring: BRASS });
      for (const [x, type, mirror] of [[5, "drone"], [6.5, "heavy"], [8, "drone"], [9.5, "contra", true]])
        tin(g, left + (x + 0.5) * s, top + rowH * 0.86, k, TIN[type], { mirror });
      g.font = '500 30px "Barlow"'; g.fillStyle = "#b3a48c";
      g.fillText("A free tactical roguelite you play in the browser", W / 2, 572);
      // JPEG keeps it small: some chat apps drop preview images over about 300 KB.
      return c.toDataURL("image/jpeg", 0.9);
    };
    return { "icon-512.png": icon(512), "icon-180.png": icon(180), "icon-32.png": icon(32, true), "preview.jpg": preview() };
  });
  fs.mkdirSync(out, { recursive: true });
  for (const [name, url] of Object.entries(images)) {
    fs.writeFileSync(path.join(out, name), Buffer.from(url.split(",")[1], "base64"));
    console.log("wrote img/" + name);
  }
  await browser.close();
  server.close();
});
