import { inputButtonPush, inputPir, outputIndicatorLight, outputLight } from "../factory/factory";

export const toiletLightCeiling = outputLight({
    edge: "edge1",
    device: 1,
    pin: 6,
    description: "Located on the ceiling above the toilet area",

});

export const toiletLightMirror = outputLight({
    edge: "edge1",
    device: 1,
    pin: 7,
    description: "Located around the mirror above the sink",
});

export const toiletPanelButtonTopLeft = inputButtonPush({
    edge: "edge1",
    device: 2,
    pin: 0,
    description: "Top left button on panel, to the left side of the toilet door when walking in",
});
export const toiletPanelButtonTopRight = inputButtonPush({
    edge: "edge1",
    device: 2,
    pin: 1,
    description: "Top right button on panel, to the right side of the toilet door when walking in",
});
export const toiletPanelButtonBottomLeft = inputButtonPush({
    edge: "edge1",
    device: 2,
    pin: 2,
    description: "Bottom left button on panel, to the left side of the toilet door when walking in",
});
export const toiletPanelButtonBottomRight = inputButtonPush({
    edge: "edge1",
    device: 2,
    pin: 3,
    description: "Bottom right button on panel, to the right side of the toilet door when walking in",
});

export const toiletPanelIndicatorLightTop = outputIndicatorLight({
    edge: "edge1",
    device: 1,
    pin: 4,
    description: "Indicates status in the top button row of the panel",
});

export const toiletPanelIndicatorLightBottom = outputIndicatorLight({
    edge: "edge1",
    device: 1,
    pin: 5,
    description: "Indicates status in the bottom button row of the panel",
});

export const toiletPirSensor = inputPir({
    edge: "edge1",
    device: 2,
    pin: 4,
    description: "PIR sensor to detect presence in the toilet",
});

export const toiletLightStarryCeiling = outputLight({
    edge: "edge1",
    device: 1,
    pin: 0,
    description: "Fiber light in the ceiling to simulate starry sky",
});

export const toiletLightNight = outputLight({
    edge: "edge1",
    device: 1,
    pin: 1,
    description: "Led in the ceiling cornice for night light",
});