(function () {
  "use strict";
  var KEY = "legion-ai-pwa-dismiss";
  var standalone =
    window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  if (standalone) return;
  try {
    if (localStorage.getItem(KEY)) return;
  } catch (e) {}

  var ua = window.navigator.userAgent;
  var isIos = /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
  var deferred = null;
  var bar = null;

  function dismiss() {
    try {
      localStorage.setItem(KEY, String(Date.now()));
    } catch (e) {}
    if (bar) bar.remove();
  }

  function render(text, withInstall) {
    if (bar) return;
    bar = document.createElement("div");
    bar.setAttribute("role", "dialog");
    bar.setAttribute("aria-label", "Install Legion AI");
    bar.style.cssText =
      "position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:9999;" +
      "width:min(560px,calc(100% - 24px));display:flex;align-items:center;gap:12px;" +
      "padding:12px 14px;border-radius:14px;background:#0C1630;border:1px solid #27395E;" +
      "box-shadow:0 18px 50px rgba(0,0,0,.55);color:#EEF3FA;font:500 15px/1.4 Geist,system-ui,sans-serif";

    var icon = document.createElement("img");
    icon.src = "/icons/icon-192.png";
    icon.alt = "";
    icon.width = 40;
    icon.height = 40;
    icon.style.cssText = "border-radius:10px;flex:none";

    var msg = document.createElement("p");
    msg.style.cssText = "margin:0;flex:1";
    msg.textContent = text;

    bar.appendChild(icon);
    bar.appendChild(msg);

    if (withInstall) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = "Install";
      btn.style.cssText =
        "flex:none;min-height:40px;padding:0 16px;border:0;border-radius:10px;cursor:pointer;" +
        "background:#45E2A3;color:#04070F;font:700 15px Geist,system-ui,sans-serif";
      btn.addEventListener("click", function () {
        if (!deferred) return;
        deferred.prompt();
        deferred.userChoice.finally(function () {
          deferred = null;
          dismiss();
        });
      });
      bar.appendChild(btn);
    }

    var close = document.createElement("button");
    close.type = "button";
    close.setAttribute("aria-label", "Dismiss");
    close.textContent = "\u00d7";
    close.style.cssText =
      "flex:none;width:40px;height:40px;border:0;border-radius:10px;cursor:pointer;" +
      "background:transparent;color:#A9B7CB;font-size:24px;line-height:1";
    close.addEventListener("click", dismiss);
    bar.appendChild(close);

    document.body.appendChild(bar);
  }

  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferred = e;
    setTimeout(function () {
      render("Install Legion AI on your device for one-tap access.", true);
    }, 4000);
  });

  window.addEventListener("appinstalled", dismiss);

  if (isIos) {
    setTimeout(function () {
      render("Install Legion AI: tap Share, then \u201cAdd to Home Screen\u201d.", false);
    }, 4000);
  }
})();
