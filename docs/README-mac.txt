RaceTime for macOS (unsigned build)
-----------------------------------
Apple Silicon (M1-M4): RaceTime-mac-arm64.zip -> RaceTime-darwin-arm64/RaceTime.app
Intel Macs:            RaceTime-mac-x64.zip   -> RaceTime-darwin-x64/RaceTime.app

1. Unzip, drag RaceTime.app to /Applications (optional).
2. FIRST LAUNCH: right-click (or Control-click) RaceTime.app > Open > Open.
   (The app is not signed/notarized, so a double-click shows "cannot be opened".)
   If macOS says the app is "damaged", run once in Terminal:
       xattr -cr /Applications/RaceTime.app
3. Saves persist automatically in ~/Library/Application Support/RaceTime.

Controls are fully remappable: click "⌨ Controls" in the top bar, on the Test Day
screen, or in the pause menu while driving. Every on-screen hint shows your current keys.
Bindings are stored separately from your career, so "Start fresh legacy" keeps them.

Default keys:
  Throttle W / Up        Brake / reverse S / Down     Steer A D / Left Right
  Handbrake Space        Upshift M                    Downshift N
  Reset car R            Camera C                     Ghost on/off G
  Traction control T     Stability assist Y           Mute K
  Pause Esc / P
