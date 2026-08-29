# Lane Drop

A simple top-down endless driving game built with plain HTML, CSS, and JavaScript.

## Play

Open [`index.html`](./index.html) in a browser. No build step or dependencies are required.

Live version: https://notmuchbytes.github.io/Top-Down-drive/index.html

## Controls

- **W** or **Up Arrow**: Accelerate
- **A / D** or **Left / Right Arrow**: Steer
- **Space**: Pause or resume
- **Mouse**: move the pointer over the canvas to track the car horizontally; the initial click starts the run
- **Touch**: tap or drag across the canvas to follow the pointer and start the game
- **On-screen mobile buttons**: tap to steer and accelerate on phones/tablets

> The click/tap is the initial starter, but after the run begins the car follows the pointer X position continuously.

## Features

- Endless scrolling road
- Random traffic cars
- Buses, box trucks, and petrol tankers with distinct designs and large labels
- Rare rogue traffic with an original arrow emblem and unpredictable swerving
- Collectible stars for bonus points
- Increasing speed and score tracking
- Best score saved in browser local storage
- Crash cutscene with screen shake, impact flash, debris, and a special tanker blast
- Responsive layout for desktop, mobile, and mouse/touch controls
- Pointer-follow steering for the player car after the game starts

## Files

- `index.html` - Game markup and UI
- `styles.css` - Visual styling and responsive layout
- `game.js` - Game loop, controls, traffic, collisions, scoring, and effects
