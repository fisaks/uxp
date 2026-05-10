
# UHN UI Architecture Summary

## 1. Main User Interface (Locations)

Primary UI for normal users.

Structure:

Locations
- Bathroom
- Kitchen
- Living Room
- Garage

Example:

Bathroom ▼ (number of tiles)
[ Dimmer ][ Vent ][ Humidity ][ Timer ]

Behavior:
- Only **one row of tiles visible**
- Location **expandable to show all devices**
- Tiles ordered by **importance**

Importance order:
1. **Pinned tiles**
2. **Most interacted tiles**
3. Remaining devices

---

## 2. Personalization

### Pinned Tiles
Users can pin devices in a location.

Example:

Bathroom  
📌 Dimmer  
📌 Ventilation  
Humidity  
Timer

Pinned tiles always stay in the first row.

### Favorites Page
Personal dashboard per user.

Example:

Favorites
- Garage Door
- Bathroom Dimmer
- Kitchen Coffee Machine
- Sauna Ventilation

Stored per user.

---

## 3. Location Ordering

Locations reorder automatically based on usage.

Example order:

1. Kitchen
2. Bathroom
3. Living Room
4. Garage
5. Basement

Most used locations float upward.

---

## 4. Search + Command Palette (Merged)

Single system used for both discovery and actions.

### Desktop Activation
Ctrl + K  
/

### Mobile Activation

Floating search icon at the bottom right corner 

Opens a **command palette overlay**.

### Palette Results Include

- Locations
- Devices
- Actions
- Scenes
- Views

Example:

> kitchen

Locations  
Kitchen  

Devices  
Kitchen Ceiling Light  

Actions  
Turn Kitchen Light OFF  

Scenes  
Cooking Scene  

Views  
Kitchen Dashboard

Rule:
**Command palette does NOT show technical IDs but it search based on it if used.**

### Command palette

We don’t manually define commands. Commands should be generated automatically from the domain model.

Because in UHN we already have the structure needed:

Locations
Resources
Capabilities
Actions/Rules
Scenes
Views

So commands are derived from these objects, not hardcoded.

Core Rule

A command is generated from:

<Entity> + <Action>

Examples:

Kitchen Light + Turn On
Garage Door + Open
Bathroom Vent + Start
Kitchen + Open
Cooking Scene + Activate

Commands from Locations

Every location automatically creates a command.

Example location: Kitchen

Generated command: Open Kitchen

Commands from Resources

Each resource generates commands based on its capabilities.

Commands from  resource:

Kitchen Ceiling Light
capability: switch

Generated commands:

Turn Kitchen Ceiling Light ON
Turn Kitchen Ceiling Light OFF

Example resource:

Bathroom Dimmer
capability: dimmer

Generated commands:

Turn Bathroom Dimmer ON
Turn Bathroom Dimmer OFF
Set Bathroom Dimmer Brightness

Capability → Command Mapping

You define commands per capability, not per resource.

Commands from Views

Views generate navigation commands.

Example view:

Garage Dashboard

Generated command:

Open Garage Dashboard

## 5. Search Capabilities

Search matches:

- name
- aliases (do we need?)
- keywords (do we need?)
- technical id 

Example query:

countertop

Matches:

Kitchen Countertop Light

Even if the internal resource id is:

kitchenPanelButtonCountertopTopRow

The technical ID stays hidden in the palette.

---

## 6. Technical Sections

System configuration pages.

Sections:

- Resources
- Views
- Scenes
- Rules
- Schedules

Example resource:

kitchenPanelButtonCountertopTopRow

These sections require strong search because of scale.

---

## 7. Linking Location Tiles to Technical Resources

Each tile can link to its technical definition in Resources,scenes,views not sure what kind of ui.


---

## 8. Performance Strategy

With ~500 devices:

- Render only **first tile row** when location collapsed
- Render **full tile grid only when expanded**

Keeps UI fast.

---

## 9. Search Result Ranking

Preferred ranking:

1. exact match
2. location
3. device
4. actions
5. scenes
6. views

---

## 10. Final System Architecture

Four entry paths:

Browse
- Locations page

Find
- Search / command palette

Act
- Command palette actions

Configure
- Resources / Scenes / Views

This structure scales to **hundreds of devices**.

---

## 11. Key Design Decisions

✔ Location sections with expandable tiles  
✔ Pinned tiles  
✔ Usage-based ordering  
✔ Favorites page  
✔ Merged search + command palette  
✔ Mobile search trigger  
✔ Technical sections with strong search  
✔ Links from tiles to technical resources

---


