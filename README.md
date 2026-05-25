# Linear Chess

Linear Chess is a browser-based chess experiment that keeps standard chess rules but renders the board as a single horizontal strip of 64 squares.

Under the hood, move validation and game-state logic are still true 8x8 chess. You can optionally show a synced 8x8 preview board while playing on the linear layout.

## Demo

- Hosted demo: [https://youbee.cloud/chess/chess.html](https://youbee.cloud/chess/chess.html)

## Features

- 1D board UI with 64 squares in a single row
- Standard chess movement, check/checkmate, stalemate, castling, en passant, and promotion
- Optional AI opponent (levels 1 to 5)
- FEN input support to load custom positions
- 8x8 read-only preview board that stays in sync
- Square size slider and UI toggles (notations, selected-piece panel, preview)
- Restart to default starting position

## Tech Stack

- HTML, CSS, and vanilla JavaScript
- [`js-chess-engine`](https://github.com/josefjadrny/js-chess-engine) loaded via ESM CDN (`https://esm.sh`)

## Project Structure

- `chess.html`: App layout, controls, settings, FAQ, and script/style wiring
- `chess.css`: Board, pieces, layout, settings panel, and responsive styling
- `chess.js`: Board rendering, move handling, FEN parsing/apply flow, AI turns, and game-state updates

## Run Locally

In many browsers, you can open `chess.html` directly and play right away.

If your browser blocks module/CDN loading from `file://`, use a local HTTP server instead.

### Quick Start (Direct Open)

- Open `chess.html` in your browser.

### Option 1: Python

```bash
python3 -m http.server 8000
```

Then open:

- `http://localhost:8000/chess.html`

### Option 2: Node.js

```bash
npx serve .
```

Then open the URL shown in your terminal.

## How To Play

- Click a piece, then click a destination square.
- Legal moves are highlighted.
- Toggle AI in **Settings** and choose your side and difficulty.
- Paste a FEN in the settings panel and click **Apply FEN**.

## Notes

- Internet access is required to load `js-chess-engine` from `esm.sh`.
- If you want fully offline play, you can vendor the engine locally and update the import path in `chess.js`.
