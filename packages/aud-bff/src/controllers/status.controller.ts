import { Route } from "@uxp/bff-common";

export class StatusController {
    @Route("get", "/status", { authenticate: true, roles: ["user"] })
    async status() {
        return { status: "ok" };
    }
}
