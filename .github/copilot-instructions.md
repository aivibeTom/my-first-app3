# Repository instructions

## Commands

This is a static browser project with no configured build, test, or lint scripts.

- Serve locally with `python3 -m http.server 8000`, then open `http://localhost:8000`.
- There is no automated test or single-test command; verify gameplay in a browser.

## Architecture

- `index.html` provides the page structure, canvas (`#game`), HUD and message elements, and touch buttons. `game.js` queries these elements directly, so keep IDs and `data-control` values synchronized with the script.
- `game.js` owns game state, input, physics and collisions, enemies, camera/progress, effects, and canvas rendering. It runs `update(dt)` and `draw()` from `requestAnimationFrame`.
- The canvas uses a fixed 960×540 logical coordinate space and CSS scales it responsively. Keep game-world drawing and page/HUD content separate: draw the world on canvas and update HUD/message content through the DOM.
- The `ready`, `playing`, `over`, and `won` states govern simulation and the DOM message overlay. Starting or retrying resets the game state.
- `style.css` implements the visual design, responsive page layout, and mobile touch-control presentation; the touch controls' event behavior is wired in `game.js`.

## Conventions

- Display explanations in Japanese.
- Keep the project dependency-free and use browser APIs directly; there is no framework or module/build setup.
- Keyboard and touch inputs share the same movement flags and `jump()`/`attack()` actions. Preserve equivalent behavior across both input paths when changing controls.
- Player-facing text is Japanese in the HTML and game messages; keep new UI copy consistent with it.

