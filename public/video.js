(function () {
  "use strict";
  document.querySelectorAll("[data-yt]").forEach(function (link) {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      var frame = document.createElement("iframe");
      frame.src =
        "https://www.youtube-nocookie.com/embed/" +
        link.getAttribute("data-yt") +
        "?autoplay=1&rel=0&playsinline=1";
      frame.title = link.getAttribute("aria-label") || "YouTube";
      frame.allow = "accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share";
      frame.referrerPolicy = "strict-origin-when-cross-origin";
      frame.allowFullscreen = true;
      link.replaceWith(frame);
      frame.focus();
    });
  });
})();
