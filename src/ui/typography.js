// Typographie française (espaces insécables)

// Typographie française : espace insécable avant « : ; ! ? » et à l'intérieur des guillemets (évite une ponctuation seule en début de ligne)
export function installTypography() {
  (function () {
    const SK = new Set(["SCRIPT", "STYLE", "TEXTAREA", "CODE", "PRE"]),
      has = / [:;!?»]|« /,
      re = / ([:;!?»])|(«) /g;
    const fx = n => {
      const v = n.nodeValue;
      if (!v || !has.test(v)) return;
      const p = n.parentElement;
      if (!p || SK.has(p.tagName) || p.isContentEditable) return;
      const r = v.replace(re, (m, a, b) => (a ? " " + a : b + " "));
      if (r !== v) n.nodeValue = r;
    };
    const walk = root => {
      if (root.nodeType === 3) return fx(root);
      if (root.nodeType !== 1 || SK.has(root.tagName)) return;
      const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = w.nextNode())) fx(n);
    };
    walk(document.body);
    new MutationObserver(ms => {
      for (const m of ms) {
        if (m.type === "characterData") fx(m.target);
        else m.addedNodes.forEach(walk);
      }
    }).observe(document.body, { subtree: true, childList: true, characterData: true });
  })();
}
