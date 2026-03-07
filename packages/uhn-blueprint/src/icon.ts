/** Curated icon names for views, locations, scenes, and resources.
 *  UI maps each to a MUI icon component — no MUI dependency here.
 *  Scoped with colon separator: "category:name".
 *  Add new entries as needed: one line here + one line in UI icon map. */
export type BlueprintIcon =
    // Lighting
    | "lighting:bulb" | "lighting:ceiling" | "lighting:flashlight" | "lighting:indicator"
    // Power
    | "power:socket" | "power:plug" | "power:switch" | "power:energy" | "power:current"
    // Sensor
    | "sensor:motion" | "sensor:pir" | "sensor:temperature" | "sensor:humidity" | "sensor:light"
    // Control
    | "control:button" | "control:dimmer" | "control:valve" | "control:timer" | "control:schedule"
    | "control:toggle" | "control:speed" | "control:relay"
    // Opening
    | "opening:door" | "opening:window"
    // Room
    | "room:kitchen" | "room:bathroom" | "room:bedroom" | "room:living" | "room:hallway"
    | "room:garage" | "room:outdoor" | "room:generic" | "room:toilet"
    | "room:children" | "room:baby" | "room:youth"
    | "room:theatre" | "room:sauna" | "room:gym" | "room:dining" | "room:utility"
    | "room:terrace" | "room:laundry" | "room:ironing" | "room:wardrobe"
    // Structure
    | "structure:home" | "structure:floor"
    // Scene
    | "scene:default" | "scene:night" | "scene:away" | "scene:eco" | "scene:dining" | "scene:tv"
    // Status
    | "status:dashboard" | "status:device"
    ;
