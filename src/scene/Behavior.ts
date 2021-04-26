import { SceneBase } from "./SceneBase";
import { StateManager } from "../StateManager";

export interface BehaviorParameterObject {
	scene: SceneBase;
	stateManager: StateManager;
}

export abstract class Behavior {
	scene: SceneBase;
	stateManager: StateManager;

	constructor(param: BehaviorParameterObject) {
		this.scene = param.scene;
		this.stateManager = param.stateManager;
	}

	abstract onMessageEvent(event: g.MessageEvent): void;
}
