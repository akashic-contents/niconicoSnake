import { SnakeGameMainParameterObject } from "./config/ParameterObject";
import { sessionParameter } from "./config/defaultParameter";
import { StateManager, PlayerInfo } from "./StateManager";

export function main(param: SnakeGameMainParameterObject): void {
	const userSessionParameter= param.sessionParameter;
	if (userSessionParameter) {
		assign(sessionParameter, userSessionParameter);
	}

	const stateManager = new StateManager({
		sessionParameter: sessionParameter,
		broadcaster: param.broadcasterPlayer
	});

	if (!!stateManager.sessionParameter.config.debug &&
		stateManager.sessionParameter.config.debug.skipLottery){
		stateManager.playerList = {};
		stateManager.playerList[stateManager.broadcaster.id] = new PlayerInfo({
			player: stateManager.broadcaster,
			user: {
				name: "debug",
				id: "000000000",
				isPremium: false
			},
			isBroadcaster: true,
			snakeType: "A"
		});
		stateManager.randomGenerator = new g.XorshiftRandomGenerator(2525);
		stateManager.changeMainGameScene();
	} else {
		stateManager.changeTitleScene();
	}
}

function assign(target: any, _: any): void {
	const to = Object(target);

	for (let index = 1; index < arguments.length; index++) {
		const nextSource = arguments[index];

		if (nextSource != null) {
			for (const nextKey in nextSource) {
				if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
					if (nextSource[nextKey] != null && typeof nextSource[nextKey] === "object") {
						to[nextKey] = assign(to[nextKey], nextSource[nextKey]);
					} else {
						to[nextKey] = nextSource[nextKey];
					}
				}
			}
		}
	}
	return to;
}
