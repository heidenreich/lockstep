// Generic headless loader: runs a prototype's whole <script> with DOM/canvas stubs and returns its globals.
const fs = require("fs");
function loadGame(file, exportsList) {
  const html = fs.readFileSync(file, "utf8");
  const src = html.slice(html.indexOf("<script>") + 8, html.lastIndexOf("</script>"));
  const ctxProxy = new Proxy(function () {}, {
    get: (t, k) => (k === "roundRect" ? () => {} : k === "createRadialGradient" ? () => ({ addColorStop() {} }) : () => ctxProxy),
    set: () => true, apply: () => ctxProxy
  });
  const el = () => new Proxy({
    textContent: "", innerHTML: "", hidden: false, checked: true, value: "6", style: {}, clientWidth: 528, dataset: {},
    classList: { add() {}, remove() {}, toggle() {} }, getContext: () => ctxProxy, parentElement: { hidden: false }
  }, { get: (t, k) => (k in t ? t[k] : () => null), set: (t, k, v) => { t[k] = v; return true; } });
  const stubs = {
    document: { getElementById: () => el(), querySelectorAll: () => [], documentElement: {}, body: { dataset: {} }, fonts: undefined, addEventListener() {}, hidden: true },
    window: { addEventListener() {}, devicePixelRatio: 1 },
    requestAnimationFrame: () => 0,
    localStorage: { getItem: () => null, setItem() {} },
    getComputedStyle: () => ({ getPropertyValue: () => "#000000" }),
    matchMedia: () => ({ matches: true }),
    ResizeObserver: class { observe() {} },
    setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {}
  };
  const names = Object.keys(stubs);
  const body = `${src}
    render = function(){}; draw = function(){};
    return { ${exportsList.map(n => `get ${n}(){ return ${n}; }, set ${n}(v){ ${n} = v; }`).join(",")} };`;
  return new Function(...names, body)(...names.map(n => stubs[n]));
}
module.exports = { loadGame };
