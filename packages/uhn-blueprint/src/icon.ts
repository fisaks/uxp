/** Curated icon names for views, locations, scenes, and resources.
 *  UI maps each to a MUI icon component — no MUI dependency here.
 *  Scoped with colon separator: "category:name".
 *  Add new entries as needed: one line here + one line in UI icon map. */
export type BlueprintIcon =
    // Lighting
    | "lighting:bulb" | "lighting:ceiling" | "lighting:flashlight" | "lighting:indicator" | "lighting:spot" | "lighting:starlight" | "lighting:mirror"
    // Power
    | "power:socket" | "power:plug" | "power:switch" | "power:off" | "power:energy" | "power:current"
    // Sensor
    | "sensor:motion" | "sensor:pir" | "sensor:temperature" | "sensor:humidity" | "sensor:light" | "sensor:dark"
    | "sensor:co2" | "sensor:air" | "sensor:air-quality" | "sensor:dust" | "sensor:cold"
    | "sensor:leak" | "sensor:water" | "sensor:smoke" | "sensor:fire" | "sensor:alarm"
    | "sensor:camera" | "sensor:doorbell" | "sensor:pressure" | "sensor:sound"
    | "sensor:gas" | "sensor:voltage" | "sensor:vibration"
    // Control
    | "control:button" | "control:dimmer" | "control:valve" | "control:timer" | "control:schedule"
    | "control:toggle" | "control:speed" | "control:relay" | "control:pump" | "control:lock"
    | "control:blind" | "control:shade" | "control:curtain" | "control:volume" | "control:mode" | "control:effect"
    | "control:play" | "control:pause"
    // Climate
    | "climate:heater" | "climate:ac" | "climate:fan" | "climate:heat-pump" | "climate:fireplace"
    // Opening
    | "opening:door" | "opening:window" | "opening:gate"
    // Room
    | "room:kitchen" | "room:bathroom" | "room:bedroom" | "room:living" | "room:hallway"
    | "room:garage" | "room:outdoor" | "room:generic" | "room:toilet"
    | "room:children" | "room:baby" | "room:youth"
    | "room:theatre" | "room:sauna" | "room:gym" | "room:dining" | "room:utility"
    | "room:terrace" | "room:laundry" | "room:ironing" | "room:wardrobe"
    | "room:office" | "room:pool" | "room:staircase" | "room:basement" | "room:storage"
    // Structure
    | "structure:home" | "structure:floor"
    // Scene
    | "scene:default" | "scene:night" | "scene:away" | "scene:eco" | "scene:dining" | "scene:tv"
    | "scene:party" | "scene:morning" | "scene:sleep"
    | "scene:cleaning" | "scene:movie" | "scene:romantic" | "scene:focus" | "scene:welcome" | "scene:chill"
    // Device
    | "device:router" | "device:wifi" | "device:signal" | "device:controller" | "device:gateway" | "device:chip" | "device:satellite"
    | "device:tv" | "device:speaker" | "device:microphone"
    | "device:computer" | "device:laptop" | "device:gaming" | "device:printer"
    | "device:coffee" | "device:microwave" | "device:fridge" | "device:washer"
    | "device:iron" | "device:blender" | "device:charger"
    // Energy
    | "energy:battery" | "energy:battery-half" | "energy:battery-low" | "energy:charging" | "energy:solar" | "energy:meter"
    // Weather
    | "weather:sun"
    // Garden
    | "garden:grass" | "garden:sprinkler" | "garden:tree" | "garden:water"
    // Vehicle
    | "vehicle:ev" | "vehicle:charger"
    // Color
    | "color:brightness" | "color:temperature" | "color:hue" | "color:saturation"
    // Status
    | "status:dashboard" | "status:device" | "status:warning" | "status:error" | "status:ok" | "status:notification" | "status:favorite"
    ;
