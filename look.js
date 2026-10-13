/* Sets the app-wide look before anything else loads. The build for the Pixar app rewrites LOOK to "pixar". */
(function () {
  var LOOK = "papercut";
  window.UNIFY_LOOK = LOOK;
  document.documentElement.setAttribute("data-look", LOOK);
  if (LOOK === "pixar") {
    var l = document.createElement("link"); l.rel = "stylesheet"; l.href = "pixar-ui.css"; document.head.appendChild(l);
  }
})();
