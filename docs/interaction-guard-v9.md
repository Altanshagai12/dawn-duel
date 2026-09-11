# Game-document selection and zoom guard

Included in the v9 release alongside the facing fix. Implementation verification below.

- First-paint CSS disables text selection, WebKit touch callouts and image/canvas dragging,
  including dynamically created hero cards, upgrade labels and HUD text.
- A small idempotent document guard cancels context menu, selection, drag, double-click,
  Safari gesture defaults, multi-touch zoom movement and modified-wheel zoom. Ctrl/Cmd+A
  and zoom-in/out shortcuts are guarded inside the game; zoom reset and normal keys remain.
- PointerEvents, touchstart/end, click and change are not cancelled or stopped. Scrollable
  panels retain pan-y. Target-priority SELECT, hero selection and upgrades are not removed.
- Installed before platform, UI and input startup. No Usion, server, balance, camera or
  orientation-transform changes; base.css cache version advances to 9.

Apple documents default gesture cancellation in its [Safari event guide](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/HandlingEvents/HandlingEvents.html).
WebKit explains that [touch-action manipulation still permits pinch zoom](https://webkit.org/blog/5610/more-responsive-tapping-on-ios/),
so it is not used as the sole zoom guard.

Verification: a new CSS regression failed on the old source; 7 new guard tests now pass.
Full `npm run check`: 275 tests, 29 assets, SDK contract, both builds and signed multiplayer
smoke passed. Independent critic reran 36 focused tests without an actionable P0/P1/P2.
Browser checks on the actual local bundle: no visible text highlight after double-click/
Ctrl+A, no right-click menu or Ctrl+= layout zoom; hero selection, guest Ready/host Start,
target-priority change, skill click and live combat-info panel worked without console errors.

Real-device iOS pinch/long-press was not available. Browser/OS accessibility magnification
and host chrome are outside this iframe's authority. The attempted browser mobile viewport
override did not alter its reported 1280×720 surface, so it is not counted as phone testing.
