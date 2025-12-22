// ResourceActionButton.tsx
import { Button, Switch } from "@mui/material";
import { InputType, ResourceType } from "@uhn/blueprint";
import { ResourceStateValue } from "@uhn/common";
import { useDispatch } from "react-redux";

type ResourceActionButtonProps = {
    resource: {
        id: string;
        type: ResourceType
        inputType?: InputType
        name?: string;
    };
    state?: {
        value: ResourceStateValue;
    };
};
export const ResourceActionButton = ({ resource, state }: ResourceActionButtonProps) => {
    const dispatch = useDispatch();
    const toggleOutput = (resourceId: string) => {
        console.log(`Toggling output for resource ${resourceId}`);
    }
    if (resource.type === "digitalOutput") {
        return (
            <Button
                variant={state?.value ? "contained" : "outlined"}
                color={state?.value ? "success" : "primary"}
                onClick={() => toggleOutput(resource.id)}
            >
                {state?.value ? "On" : "Off"}
            </Button>
        );
    }
    if (resource.type === "digitalInput") {
        if (resource.inputType === "toggle") {
            return <Switch checked={!!state?.value} disabled />;
        }
        if (resource.inputType === "push") {
            return (
                <Button variant="outlined" >
                    PUSH
                </Button>
            );
        }
    }
    return null;
}
