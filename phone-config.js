/* UNIFY Flip Phone: one place to configure the phone app (it runs on its own at /phone.html, installed on a real phone, or inside the game).
 * Edit these values and redeploy; nothing else needs to change. */
window.PHONE_CONFIG = {
  appName: "UNIFY Flip Phone",        // browser tab title
  accent: "#E07A66",                  // main colour of the phone body and buttons
  accent2: "#b95a48",                 // darker shade for edges and shadows
  network: true,                      // show "Real friends" (people network). false hides it.
  networkLocalOnly: false,            // true = keep real-friend chats on this device only (no cloud), good for testing
  defaultName: "",                    // pre-filled display name
  installHint: true                   // show the "Install" button when the browser allows it
};
