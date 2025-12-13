import { inputButtonPush, outputIndicatorLight, outputLight, outputSocket } from "../factory/factory";

export const kitchenLightCeiling = outputLight({
    edge: "edge1",
    device: 1,
    pin: 0,
    description: "Main ceiling light in the kitchen area",
});

export const kitchenLightDiningTable = outputLight({
    edge: "edge1",
    device: 1,
    pin: 1,
    description: "Ceiling light above the dining table in the kitchen area",
});

export const kitchenSocketForToaster = outputSocket({
    edge: "edge1",
    device: 1,
    pin: 2,
    description: "Socket on the left side of the main kitchen countertop for the toaster",
});

export const kitchenSocketCountertop = outputSocket({
    edge: "edge1",
    device: 1,
    pin: 3,
    description: "Additional socket on the kitchen countertops",
});

export const kitchenSocketCoffeeMachine = outputSocket({
    edge: "edge1",
    device: 1,
    pin: 4,
    description: "Socket on the right side of the main kitchen countertop for the coffee machine",
});

export const kitchenLightCountertops = outputLight({
    edge: "edge1",
    device: 1,
    pin: 7,
    description: "Main power to light tubes under the cabinets above kitchen countertops",
});

export const kitchenSocketUnderWindow = outputSocket({
    edge: "edge1",
    device: 5,
    pin: 0,
    description: "Socket under the kitchen window",
});

export const kitchenSocketOverWindow = outputSocket({
    edge: "edge1",
    device: 5,
    pin: 1,
    description: "Socket over the kitchen window",
});
export const kitchenSocketLeftSideOfWindow = outputSocket({
    edge: "edge1",
    device: 5,
    pin: 2,
    description: "Socket on the left side of the kitchen window",
});
export const kitchenSocketWashingMachine = outputSocket({
    edge: "edge1",
    device: 5,
    pin: 3,
    description: "Socket for the washing machine in the kitchen area under the countertop",
});
export const kitchenPanelButtonCountertopTopRow = inputButtonPush({
    edge: "edge1",
    device: 4,
    pin: 4,
    description: "Top row button on the kitchen panel to control countertop lights",
});
export const kitchenPanelButtonCountertopBottomRow = inputButtonPush({
    edge: "edge1",
    device: 4,
    pin: 5,
    description: "Bottom row button on the kitchen panel to control countertop sockets",
});
export const kitchenPanelIndicatorLightCountertopTop = outputIndicatorLight({
    edge: "edge1",
    device: 5,
    pin: 6,
    description: "Indicator light on the kitchen panel to show top row power status",
});

export const kitchenPanelIndicatorLightBottom = outputIndicatorLight({
    edge: "edge1",
    device: 5,
    pin: 7,
    description: "Indicator light on the kitchen panel to show bottom row power status",
});

export const kitchenPanelButtonWallEdgeTopLeft = inputButtonPush({
    edge: "edge1",
    device: 4,
    pin: 0,
    description: "Top left button on the kitchen wall panel on the edge of the wall",
});
export const kitchenPanelButtonWallEdgeTopRight = inputButtonPush({
    edge: "edge1",
    device: 4,
    pin: 1,
    description: "Top right button on the kitchen wall panel on the edge of the wall",
});
export const kitchenPanelButtonWallEdgeBottomLeft = inputButtonPush({
    edge: "edge1",
    device: 4,
    pin: 2,
    description: "Bottom left button on the kitchen wall panel on the edge of the wall",
});
export const kitchenPanelButtonWallEdgeBottomRight = inputButtonPush({
    edge: "edge1",
    device: 4,
    pin: 3,
    description: "Bottom right button on the kitchen wall panel on the edge of the wall",
});

export const kitchenPanelIndicatorWallEdgeTop = outputIndicatorLight({
    edge: "edge1",
    device: 5,
    pin: 0,
    description: "Top indicator light on the kitchen wall panel on the edge of the wall",
});
export const kitchenPanelIndicatorWallEdgeBottom = outputIndicatorLight({
    edge: "edge1",
    device: 3,
    pin: 1,
    description: "Bottom indicator light on the kitchen wall panel on the edge of the wall",
});
export const kitchenLightNight = outputLight({
    edge: "edge1",
    device: 1,
    pin: 2,
    description: "Night light in the kitchen area with dimmed light",
});