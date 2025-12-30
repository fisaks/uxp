import { ResourceState } from "@uhn/blueprint";
import { RuntimeStateService } from "./runtime-state.service";

export class RuleEngineService {
  constructor(
    private readonly stateService: RuntimeStateService,
    //private readonly actionService: ActionService
  ) {}

  onStateChanged(resourceId: string) {
    const snapshot = this.stateService.snapshot();

    const actions = this.evaluateRules(snapshot);

    //if (actions.length) {
      //this.actionService.emit(actions);
    //}
  }

  private evaluateRules(state: Map<string, ResourceState>) {
    // actual rule execution
    return [];
  }
}
