import { SceneBase } from "./SceneBase";
import type { StateManagerLike } from "../StateManagerLike";

export interface BehaviorParameterObject {
	scene: SceneBase;
	stateManager: StateManagerLike;
}

export abstract class Behavior {
	scene: SceneBase;
	stateManager: StateManagerLike;

	constructor(param: BehaviorParameterObject) {
		this.scene = param.scene;
		this.stateManager = param.stateManager;
	}

	abstract onMessageEvent(event: g.MessageEvent): void;
}
