import { Behavior } from "./Behavior";

export class SceneBase extends g.Scene{
	behavior: Behavior;

	setBehavior(_behavior: Behavior): void {
		this.behavior = _behavior;
	}

	setMessageEventListener(): void {
		this.onMessage.add((event) => {
			this.behavior.onMessageEvent(event);
		});
	}
}
