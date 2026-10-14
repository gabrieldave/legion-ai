(function () {
  "use strict";
  var root = document.querySelector("[data-scanner]");
  if (!root) return;
  var tabs = Array.prototype.slice.call(root.querySelectorAll('[role="tab"]'));
  var panes = Array.prototype.slice.call(root.querySelectorAll('[role="tabpanel"]'));

  function show(index, focus) {
    tabs.forEach(function (tab, i) {
      var on = i === index;
      tab.setAttribute("aria-selected", on ? "true" : "false");
      tab.tabIndex = on ? 0 : -1;
      panes[i].hidden = !on;
    });
    if (focus) {
      tabs[index].focus();
      tabs[index].scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  }

  tabs.forEach(function (tab, i) {
    tab.addEventListener("click", function () {
      show(i);
    });
    tab.addEventListener("keydown", function (e) {
      var step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (e.key === "Home") step = -i;
      if (e.key === "End") step = tabs.length - 1 - i;
      if (!step) return;
      e.preventDefault();
      show((i + step + tabs.length) % tabs.length, true);
    });
  });

  root.classList.add("js");
  show(0);
})();
