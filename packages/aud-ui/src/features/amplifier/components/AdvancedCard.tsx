import { AmplifierInfo, AmplifierStatus } from "@aud/common";
import { Stack } from "@mui/material";
import React from "react";
import { SendAmplifierCommand } from "../useAmplifierCommand";
import { CollapsibleCard } from "./CollapsibleCard";
import { SoundSection } from "./SoundSection";
import { ToneSection } from "./ToneSection";

type AdvancedCardProps = {
    info: AmplifierInfo;
    status: AmplifierStatus;
    disabled: boolean;
    send: SendAmplifierCommand;
};

/** The sound and tone settings, which are used less than the controls above them, so they start collapsed. */
export const AdvancedCard: React.FC<AdvancedCardProps> = ({ info, status, disabled, send }) => (
    <CollapsibleCard title="Advanced">
        <Stack spacing={3}>
            <SoundSection info={info} status={status} disabled={disabled} send={send} />
            <ToneSection info={info} status={status} disabled={disabled} send={send} />
        </Stack>
    </CollapsibleCard>
);
