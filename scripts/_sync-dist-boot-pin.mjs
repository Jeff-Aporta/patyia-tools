import fs from "fs";

for (const file of ["dist/js/boot/cdn.mjs", "dist/js/boot/loader.mjs"]) {
  if (!fs.existsSync(file)) {
    console.log("skip missing", file);
    continue;
  }
  let s = fs.readFileSync(file, "utf8");
  const before = s;
  s = s.replaceAll("f8ce806", "0a19d91");
  s = s.replace("${JSDELIVR_CDN}dist/isa/", "${JSDELIVR_CDN}_dist/isa/");
  s = s.replace("JSDELIVR_CDN}dist/isa", "JSDELIVR_CDN}_dist/isa");
  if (s !== before) {
    fs.writeFileSync(file, s);
    console.log("patched", file);
  } else {
    console.log("unchanged", file);
  }
}
