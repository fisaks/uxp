// rules/kitchen_auto_light.ts
/*import { rule } from "@uhn/blueprint";
import { kitchen_button_heating, kitchen_light } from "../resources/kitchen";

export default rule("kitchen_auto_light")
    .onPress(kitchen_button_heating)
    .run(({ state, set, env, flag }) => {
        if (state(kitchen_button_heating).active && env.isDark === true) {
            set(kitchen_light).to(1);
            flag.nightMode = true;
        }
    });
*/
const a=1