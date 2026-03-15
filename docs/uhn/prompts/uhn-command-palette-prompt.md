
# UHN Command Palette – Design Prompt

## Goal
Create a **combined Search + Command Palette** that allows users to quickly find and control items exposed in Locations without bypassing the rule system.

## Core Principle
All actions must follow the system control path:

emitSignal(resource) → rule → resource

The command palette **must never bypass rules** or directly control arbitrary resources.

## Scope of the Palette
Commands are generated **only from location‑assigned items**:
- Resources
- Views
- Scenes

These items are already intentionally exposed by the blueprint author and are therefore safe to interact with.

## What the Palette Can Do

### 1. Search for Controls
Users can quickly find items by name.

Example queries:
- kitchen
- dimmer
- sauna
- countertop

Example results:
- Kitchen • Ceiling Light
- Kitchen • Countertop Light
- Bathroom • Dimmer Ceiling

Selecting a result focuses the tile or opens its location.

### 2. Execute Actions
Actions are generated from the **capabilities of the resource**.

Example:

Query:
> kitchen light

Results:
- Turn on Kitchen Ceiling Light
- Turn off Kitchen Ceiling Light
- Set Kitchen Ceiling Light to 50%
- Open Kitchen location

### 3. Navigate to System Pages
The palette also includes navigation shortcuts.

Examples:
- Go to Resources
- Go to Rules
- Go to Scenes
- Go to Views

## Result Groups
Results should be visually grouped:

Devices
- Kitchen Ceiling Light
- Bathroom Dimmer

Actions
- Turn off Kitchen Ceiling Light
- Set Kitchen Ceiling Light to 50%

Navigation
- Go to Resources
- Go to Rules

## Where the Palette Appears

### Home Page
A persistent search field:

[ Search or command... ]

Typing triggers palette results.

### Technical Pages
Keyboard shortcut:

Ctrl + K

Opens the command palette overlay.

## Mobile Behavior
Mobile uses the same search field at the top of the page. Results appear below the input.

## Empty Query Behavior
When no search text is entered, show:

- Favorite items
- Recently used controls
- Top locations
- Navigation shortcuts

## Summary
The command palette acts as a **fast control layer** for the system:

Search  
+ Execute actions  
+ Navigate system pages

while always respecting the rule-based architecture.
