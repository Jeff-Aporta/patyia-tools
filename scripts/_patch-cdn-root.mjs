import fs from "fs";

const p = "vendor/front-shared/dist/isa/js/index.min.js";
let s = fs.readFileSync(p, "utf8");

const idx = s.indexOf("function Ia(){");
const end = s.indexOf("function Ze()", idx);
if (idx < 0 || end < 0) throw new Error("Ia/Ze not found");
const oldIa = s.slice(idx, end);
const newIa =
  'function Ia(){try{let e=new URL(import.meta.url);if(typeof location<"u"&&e.origin===location.origin){let t=e.href,n=t.indexOf("/dist/isa/");if(n>=0)return t.slice(0,n).replace(/\\/?$/,"");let r=t.indexOf("/_dist/isa/");if(r>=0)return t.slice(0,r).replace(/\\/?$/,"");let i=t.indexOf("/isa/js/");if(i>=0)return t.slice(0,i).replace(/\\/?$/,"")}if(e.protocol==="file:"&&typeof location<"u"&&/localhost|127\\.0\\.0\\.1|\\[::1\\]/.test(location.hostname))return new URL("../../../../",e).href.replace(/\\/?$/,"")}catch{}return Aa}';

s = s.slice(0, idx) + newIa + s.slice(end);

const oldTa = 'var to=Ia(),Ta=to+"/dist",_r=to+"/isa",Ot=Ta+"/isa"';
const newTa = 'var to=Ia(),Ta=to+(to.includes("cdn.jsdelivr.net")?"/_dist":"/dist"),_r=to+"/isa",Ot=Ta+"/isa"';
if (!s.includes(oldTa)) throw new Error("Ta assignment not found");
s = s.replace(oldTa, newTa);
s = s.replaceAll("f8ce806", "0a19d91");

fs.writeFileSync(p, s);
console.log("patched", p);
console.log("same-origin", s.includes("e.origin===location.origin"));
console.log("_dist switch", s.includes('?"/_dist":"/dist"'));
console.log("old Ia gone", !s.includes(oldIa));

for (const hp of ["vendor/front-shared/src/head-init-tail.js"]) {
  if (!fs.existsSync(hp)) continue;
  let h = fs.readFileSync(hp, "utf8");
  if (h.includes("f8ce806")) {
    fs.writeFileSync(hp, h.replaceAll("f8ce806", "0a19d91"));
    console.log("patched", hp);
  }
}
