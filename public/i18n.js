(function () {
  "use strict";
  var COOKIE = "legion-ai-lang";
  var current = document.documentElement.lang === "en" ? "en" : "es";

  document.querySelectorAll(".lang-sw [data-lang]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var next = btn.getAttribute("data-lang");
      if (next === current) return;
      document.cookie =
        COOKIE + "=" + next + "; Path=/; Max-Age=31536000; SameSite=Lax" +
        (location.protocol === "https:" ? "; Secure" : "");
      document.documentElement.lang = next;
      window.dispatchEvent(new CustomEvent("legion-ai:locale", { detail: { locale: next } }));
      location.reload();
    });
  });
})();
