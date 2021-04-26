import { main } from "./main";
import { SnakeGameMainParameterObject, SnakeGameSessionParameter } from "./config/ParameterObject";

export = (originalParam: g.GameMainParameterObject) => {
	const param: any = {} as SnakeGameMainParameterObject;
	Object.keys(originalParam).forEach((key) => {
		param[key] = (originalParam as any)[key];
	});
	param.sessionParameter = {};

	let sessionParameter: SnakeGameSessionParameter;
	let broadcasterPlayer: g.Player;

	const scene = new g.Scene({
		game: g.game
	});

	function start(): void {
		param.sessionParameter = sessionParameter;
		g.game.popScene();
		main(param);
	}

	g.game.onJoin.add((event) => {
		broadcasterPlayer = event.player;
		param.broadcasterPlayer = broadcasterPlayer;
	});

	scene.onMessage.add((message) => {
		if (message.data && message.data.type === "start" && message.data.parameters) {
			sessionParameter = message.data.parameters;
		}
	});

	// 生主の playerId 確定とセッションパラメータが揃ったらゲーム開始
	scene.onUpdate.add(() => {
		if (broadcasterPlayer && sessionParameter) {
			start();
		}
	});

	g.game.pushScene(scene);
};
