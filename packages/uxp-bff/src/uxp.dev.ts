import { runBackgroundTransaction } from "@uxp/bff-common";
import { DataSource } from "typeorm";
import { ConfigApplyService } from "./services/config-apply.service";

export async function applyDevConfig(dataSource: DataSource): Promise<void> {
    const devConfig = (await import("@uxp/config-dev")).default;
    const stats = await runBackgroundTransaction(dataSource, () =>
        ConfigApplyService.applyConfig(devConfig),
    );
    console.log("Dev config applied:", stats);
}
