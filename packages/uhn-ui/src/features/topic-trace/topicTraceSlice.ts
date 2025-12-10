import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { base64ToBinaryString, DeviceStatePayload, UHNAppActionPayloadResponseMap } from "@uhn/common";

export type TopicMessagePayload = UHNAppActionPayloadResponseMap["topic:message"];

type TopicTraceState = {
    trace: TopicMessagePayload[];
    topicPattern?:string
}

const initialState: TopicTraceState = {
    trace: [],
};

const topicTraceSlice = createSlice({
    name: "topicTrace",
    initialState,
    reducers: {
        addTopicMessage: (state, action: PayloadAction<TopicMessagePayload>) => {
            if (action.payload.topic.endsWith("/state")) {
                const p = action.payload.message as DeviceStatePayload;
                console.log("DeviceStatePayload", p.digitalOutputs && base64ToBinaryString(p.digitalOutputs));
                state.trace.push({
                    ...action.payload,
                    message: {
                        ...p,
                        ...(p.digitalInputs ? { digitalInputsStr: base64ToBinaryString(p.digitalInputs) } : {}),
                        ...(p.digitalOutputs ? { digitalOutputsStr: base64ToBinaryString(p.digitalOutputs) } : {}),
                    }
                });
            } else {
                state.trace.push(action.payload);
            }
            return state;
        },
        setTopicPattern: (state, action: PayloadAction<string | undefined>) => {
            state.topicPattern = action.payload;
        },

    },
});

export const { addTopicMessage ,setTopicPattern} = topicTraceSlice.actions;
export default topicTraceSlice.reducer;
