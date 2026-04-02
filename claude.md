# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a minimal, single-file project. It contains one deliverable:

- **sliding-puzzle.html** — A fully self-contained 4×4 sliding tile puzzle intended for embedding in newsletters. No build step, no dependencies, no server required. Open directly in a browser.

## Architecture

The HTML file is structured as a single page with three sections:

1. **CSS** — Inline styles using CSS Grid for the board layout, gradient-colored tiles (`.t1`–`.t15`), and a keyframe animation for the win state.
2. **HTML** — A `.board` div (populated by JS), a shuffle button, a move counter, and a hidden `.congrats` banner.
3. **JavaScript** — Pure vanilla JS managing state as a flat 16-element array (`tiles[]`), where `0` represents the empty cell. Key functions:
   - `shuffle()` — Fisher-Yates shuffle with a solvability check (`isSolvable`) to guarantee the puzzle is always completable.
   - `clickTile(index)` — Validates adjacency to the empty cell before swapping.
   - `isSolved()` — Checks if `tiles` matches `[1..15, 0]`.
   - `render()` — Rebuilds the board DOM from scratch on each state change.
