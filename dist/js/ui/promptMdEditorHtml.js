import{mdToHtml as b}from"../core/platform.js";import{PROMPT_VAR_PATTERN as $,repairPromptVarBraces as N,varToneStyleAttr as L}from"../core/promptVariables.js";function u(t){return String(t).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;")}const g=new Set(["h1","h2","h3","h4","h5","h6","p","ul","ol","li","pre","blockquote","hr"]),v=new Set(["strong","b","em","i","code","a","br","img"]);function i(t){return t.outerHTML}function y(t,e={}){return`<span class="prompt-var-chip" contenteditable="false" data-var="${u(t)}" style="${L(t)}" title="${u(t)}"><span class="prompt-var-chip__label">{{${u(t)}}}</span></span>`}function _(t){return t.includes(`
`)?t.replace(/(?<!\n)\n(?!\n)/g,`  
`):t}function p(t,e={}){const n=N(String(t??""));if(!n)return"";const r=[];let o=0;const s=n.replace($,(f,l)=>{const h=`\uE000PV${o++}\uE001`;return r.push({token:h,name:l}),h});let c=b(_(s));for(const{token:f,name:l}of r)c=c.split(f).join(y(l,e));return c}function M(t){const e=String(t??"");return e?e.includes(`
`)?S(e.split(`
`)):p(e,{editable:!1}):""}function S(t){return!Array.isArray(t)||!t.length?"":t.map(e=>{const n=p(String(e??""),{editable:!1});return n?`<div class="prompt-content-line">${n}</div>`:'<div class="prompt-content-line prompt-content-line--empty"><br aria-hidden="true" /></div>'}).join("")}function x(t){return p(t,{editable:!0})||"<p><br></p>"}function m(t){return t.dataset.var?`{{${t.dataset.var}}}`:""}function E(t){return t.classList?.contains("prompt-var-chip")?m(t):[...t.childNodes].map(e=>(e.nodeType===Node.ELEMENT_NODE,a(e))).join("").trim()}function T(t){const e=[...t.querySelectorAll("tr")];if(!e.length)return i(t);const n=[],r=[...e[0].querySelectorAll("th,td")].map(E);n.push(`| ${r.join(" | ")} |`),n.push(`| ${r.map(()=>"---").join(" | ")} |`);for(let o=1;o<e.length;o+=1){const s=[...e[o].querySelectorAll("th,td")].map(E);n.push(`| ${s.join(" | ")} |`)}return n.join(`
`)}function a(t){if(t.nodeType===Node.TEXT_NODE)return t.textContent||"";if(t.nodeType!==Node.ELEMENT_NODE)return"";const e=t;if(e.classList?.contains("prompt-var-chip"))return m(e);const n=e.tagName.toLowerCase(),r=()=>[...e.childNodes].map(a).join("");if(!v.has(n))return i(e);switch(n){case"strong":case"b":return`**${r()}**`;case"em":case"i":return`*${r()}*`;case"code":return`\`${r()}\``;case"a":{const o=e.getAttribute("href")||"",s=r();return o?`[${s||o}](${o})`:s}case"img":{const o=e.getAttribute("alt")||"imagen",s=e.getAttribute("src")||"";return s?`![${o}](${s})`:""}case"br":return`
`;default:return i(e)}}function d(t){const e=t.tagName.toLowerCase(),n=()=>[...t.childNodes].map(r=>(r.nodeType===Node.ELEMENT_NODE,a(r))).join("");if(t.classList?.contains("prompt-var-chip"))return m(t);if(!g.has(e)){if(e==="div"&&t.classList.contains("md-table-wrap")){const r=t.querySelector(":scope > table");if(r)return`${T(r)}

`}return e==="table"?`${T(t)}

`:`${i(t)}

`}switch(e){case"h1":return`# ${n().trim()}

`;case"h2":return`## ${n().trim()}

`;case"h3":return`### ${n().trim()}

`;case"h4":return`#### ${n().trim()}

`;case"h5":return`##### ${n().trim()}

`;case"h6":return`###### ${n().trim()}

`;case"p":return`${n()}

`;case"li":return`${t.parentElement?.tagName.toLowerCase()==="ol"?"1.":"-"} ${n().trimStart()}
`;case"ul":case"ol":return[...t.children].map(r=>d(r)).join("")+`
`;case"pre":return`\`\`\`
${t.querySelector("code")?.textContent??t.textContent??""}
\`\`\`

`;case"blockquote":return n().split(`
`).filter(Boolean).map(r=>`> ${r}`).join(`
`)+`

`;case"hr":return`---

`;case"div":{const r=[...t.children];return t.attributes.length>0||t.classList.length>0||r.some(o=>!g.has(o.tagName.toLowerCase()))?`${i(t)}

`:r.map(o=>d(o)).join("")}default:return`${i(t)}

`}}function C(t){let e="";for(const n of t.childNodes)n.nodeType===Node.ELEMENT_NODE?e+=d(n):n.nodeType===Node.TEXT_NODE&&(e+=n.textContent||"");return e.replace(/\n{3,}/g,`

`).trimEnd()}const H=/\{\{\s*[A-Za-z_]\w*\s*\}\}/;function j(t){if(!t)return!1;const e=document.createTreeWalker(t,NodeFilter.SHOW_TEXT);let n;for(;n=e.nextNode();)if(!n.parentElement?.closest(".prompt-var-chip")&&H.test(n.textContent??""))return!0;return!1}export{M as bodyPreviewHtml,S as bodyPreviewHtmlFromLines,x as bodyToEditorHtml,C as editorHtmlToBody,j as surfaceHasRawVarTokens,y as varChipHtml};
