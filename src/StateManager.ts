import { SnakeGameSessionParameter } from "./config/ParameterObject";
import { createTitleScene } from "./scene/TitleScene/TitleScene";
import { createMainGameScene, MainGameScene } from "./scene/MainGameScene/MainGameScene";
import {
	AccountData,
	JoinPlayerUserData,
	MessageEventType,
	MessageEventDataWaitRecruitment,
	MessageEventDataLotteryResult,
	InitPlayerLayoutData,
	MessageEventDataInitMainGame,
	MessageEventDataPlayersInConflict,
	MessageEventDataEatenFoods,
	MessageEventDataJewelOwner,
	MessageEventDataRanking,
	MessageEventDataSetPlaying,
	ScopeType,
	MessageEventDataAnimation,
	AnimationType,
	MessageEventDataCountDown,
	CountDownType,
	PreventType,
	MessageEventDataPreventUsertouch,
	MessageEventDataFinishGame,
	MessageEventDataStartResult,
	MessageEventDataInitResult,
	MessageEventDataRespawnJewel
} from "./types/MessageEventType";
import { UserTouchState } from "./types/UserTouchState";
import { PlayerList } from "./types/PlayerList";
import { Snake, SnakeType, SnakeSegmentType, SnakeRotateState } from "./entity/Snake";
import { sessionParameter } from "./config/defaultParameter";
import { Food } from "./entity/Food";
import { JewelData } from "./entity/Jewel";
import { Label } from "@akashic-extension/akashic-label";
import { createResultScene } from "./scene/ResultScene/ResultScene";
import { changeAudioMasterVolume } from "./utils/audioUtils";
import { checkStateRole, StateRoleType } from "./utils/StateRoleChecker";
import { stringToArray } from "./commonUtils/utils";
import { weightedLottery } from "./commonUtils/lottery";

export interface StateManagerParameterObject {
	sessionParameter: SnakeGameSessionParameter;
	broadcaster: g.Player;
}

/**
 * ゲーム全体の状態を管理するクラス
 */
export class StateManager {
	sessionParameter: SnakeGameSessionParameter;
	broadcaster: g.Player;
	broadcasterData: AccountData;
	isBroadcaster: boolean;
	startTime: number;

	resource: {
		font: g.Font;
	};
	randomGenerator: g.XorshiftRandomGenerator;

	audioAssets: {[key: string]: g.AudioAsset;};

	applicantList: JoinPlayerUserData[];

	playerList: PlayerList;
	userNameLabels: {[key: string]: Label;};
	topPlayerList: PlayerInfo[];

	foodList: Food[];
	waitingFoodList: Food[];
	jewelData: JewelData;
	maxFoodListLength: number; // フィールド上に表示するエサの最大数
	isGameOver: boolean;

	constructor(param: StateManagerParameterObject){
		this.sessionParameter = param.sessionParameter;
		this.broadcaster = param.broadcaster;
		this.isBroadcaster = param.broadcaster.id === g.game.selfId;
		this.audioAssets = {};
		this.userNameLabels = {};
		this.topPlayerList = [];
		this.foodList = [];
		this.waitingFoodList = [];
		this.maxFoodListLength = 25;
		this.isGameOver = false;
		this.createResource();
	}

	createResource(): void {
		const foodCharsAsset = g.game.assets.foodAvailableChars as g.TextAsset;
		const foodString: string = JSON.parse(foodCharsAsset.data).foodAvailableChars.join("");
		const font = new g.DynamicFont({
			game: g.game,
			fontFamily: g.FontFamily.SansSerif,
			size: 72,
			fontWeight: g.FontWeight.Bold,
			hint: {
				presetChars: foodString
			}
		});
		this.resource = {
			font: font
		};
	}

	changeTitleScene(): void {
		const scene = createTitleScene(this);
		g.game.pushScene(scene);
	}

	changeMainGameScene(): void {
		const scene = createMainGameScene(this);
		g.game.pushScene(scene);
	}

	changeResultScene(): void {
		const scene = createResultScene(this);
		g.game.pushScene(scene);
	}

	setPlayerList(playerList: {[key: string]: PlayerInfo;}): void {
		this.playerList = {};
		Object.keys(playerList).forEach((playerId) => {
			this.playerList[playerId] = new PlayerInfo({
				player: playerList[playerId].player,
				user: playerList[playerId].user,
				isBroadcaster: playerId === this.broadcaster.id,
				snakeType: playerList[playerId].snakeType
			});
		});
	}

	/**
	 * サーバインスタンスのみ実行
     * ゲーム参加者の募集を開始する
     */
	startRecruitment(broadcasterData: AccountData): void {
		this.broadcasterData = broadcasterData;
		this.applicantList = [];
		this.startTime = g.game.age;
		const message: MessageEventDataWaitRecruitment = {
			messageType: MessageEventType.waitRecruitment,
			messageData: {
				startTime: this.startTime
			}
		};
		g.game.raiseEvent(new g.MessageEvent(message));
	}

	/**
	 * サーバインスタンスのみ実行
     * 参加プレイヤーリクエストを受け付ける
     * リクエストに対する挙動は抽選の有無などによる
     */
	receiveJoinRequest(player: g.Player, user: AccountData): void {
		if ((g.game.age - this.startTime) > this.sessionParameter.entrySec * g.game.fps) return;
		if (this.applicantList.some(p => p.player.id === player.id)) {
			return;
		}
		this.applicantList.push({
			player: player,
			user: user
		} as JoinPlayerUserData);
	}

	/**
	 * サーバインスタンスのみ実行
	 * 抽選を開始する。
	 */
	startLottery(): void {
		let seed = +this.broadcaster.id;
		this.applicantList.forEach((applicant, i) => {
			seed += +applicant.player.id + i;
		});
		if (
			!!this.sessionParameter.config.debug &&
			this.sessionParameter.config.debug.skipLottery
		) seed = 2525;
		this.randomGenerator = new g.XorshiftRandomGenerator(seed); // サーバインスタンスだけg.game.randomの状態が変わってしまうのを避ける
		const winners = weightedLottery(
			this.applicantList,
			Math.min(this.applicantList.length, this.sessionParameter.numPlayers),
			this.sessionParameter.premiumWeight,
			this.randomGenerator,
			(userData: JoinPlayerUserData): boolean => userData.user.isPremium
		);

		const playerList: {[key: string]: PlayerInfo;} = {};
		playerList[this.broadcaster.id] = new PlayerInfo({
			player: this.broadcaster,
			user: this.broadcasterData,
			isBroadcaster: true,
			snakeType: "ABCDEFGHI".charAt(Math.floor(this.randomGenerator.generate() * 9)) as SnakeType
		});
		winners.forEach(winner => {
			playerList[winner.player.id] = new PlayerInfo({
				player: winner.player,
				user: winner.user,
				isBroadcaster: false,
				snakeType: "ABCDEFGHI".charAt(Math.floor(this.randomGenerator.generate() * 9)) as SnakeType
			});
		});

		this._currentSetTimeout(() => {
			// 「集計中...」表示のためのバッファ
			const numPlayers = Object.keys(playerList).length;
			const message: MessageEventDataLotteryResult = {
				messageType: MessageEventType.lotteryResult,
				messageData: {
					playerList: playerList,
					numPlayers: numPlayers
				}
			};
			g.game.raiseEvent(new g.MessageEvent(message));
			if (numPlayers > 1) {
				this.startGame();
			} else {
				this.restartRequruitment();
			}
		}, 3000);
	}

	/**
     * ゲームを開始する
     */
	startGame(): void {
		this._currentSetTimeout(() => {
			//　抽選結果表示のためのバッファ
			g.game.raiseEvent(new g.MessageEvent({
				messageType: MessageEventType.startGame
			}));
		}, 3000);
	}

	/**
	 * 参加者が集まらなかったので抽選をやり直す
	 */
	restartRequruitment(): void {
		this._currentSetTimeout(() => {
			g.game.raiseEvent(new g.MessageEvent({
				messageType: MessageEventType.restartRecruitment
			}));
		}, 3000);
	}

	/**
	 * サーバインスタンスのみ実行
	 * プレイヤーの初期位置を生成する
	 */
	setupInitLayout(): void {
		const playerInitLayoutList = this._generateInitLayout();
		const message: MessageEventDataInitMainGame = {
			messageType: MessageEventType.initMainGame,
			messageData: {
				playerInitLayoutList: playerInitLayoutList
			}
		};
		g.game.raiseEvent(new g.MessageEvent(message));

		this.endInvincibleTime(ScopeType.All);
	}

	/**
	 * 全てのインスタンスで実行
	 * 各プレイヤーインスタンスのカメラとSnakeを設定する
	 */
	setCameraAndSnake(playerId: string, snake: Snake): void {
		this.playerList[playerId].snake = snake;
		this.playerList[playerId].camera = new g.Camera2D({});
		if (playerId === g.game.selfId) g.game.focusingCamera = this.playerList[playerId].camera;

		// 最初は無敵状態なので透過させる
		this.playerList[playerId].snake.modifyOpacity(0.5);
	}

	/**
	 * 全てのインスタンスで実行
	 * 受け取ったプレイヤー操作を状態に反映する
	 */
	applyTouchState(playerId: string, state: UserTouchState, direction?: number): void {
		if (!this.playerList[playerId]) return;
		this.playerList[playerId].uiState.state = state;
		if (direction != null) this.playerList[playerId].uiState.direction = direction;
		if (
			!!this.playerList[playerId].snake &&
			state === UserTouchState.onPoint &&
			direction != null
		) {
			const snake = this.playerList[playerId].snake;
			const radianFineness = this.sessionParameter.config.userInput.radianFineness;
			const deg = ((
				this.playerList[playerId].uiState.direction / radianFineness
			) * 360 + 90) % 360;
			snake.head.angle = deg;

			if (this.playerList[playerId].snake.rotateState !== SnakeRotateState.noRotate){
				const rad = deg / 180 * Math.PI;
				const check = snake.head.x * (- Math.cos(rad)) - snake.head.y * Math.sin(rad);
				if (check > 0) snake.rotateState = SnakeRotateState.onClockwise;
				else snake.rotateState = SnakeRotateState.onCounterClockwise;
			}
		}

		if (!!this.playerList[playerId].snake) this.playerList[playerId].snake.dashing(state);
	}

	/**
	 * サーバインスタンスのみ実行
	 * 無敵状態解除シーケンスを開始する
	 */
	endInvincibleTime(scope: ScopeType, playerId?: string): void {
		let animationMessageData: {animationType: AnimationType; scope: ScopeType; playerId?: string;};
		let setPlayingMessageData: {scope: ScopeType; playerId?: string;};

		switch (scope){
		case ScopeType.All:
			animationMessageData = {
				animationType: AnimationType.Blinking,
				scope: ScopeType.All
			};
			setPlayingMessageData = {
				scope: ScopeType.All
			};
			break;
		case ScopeType.One:
			animationMessageData = {
				animationType: AnimationType.Blinking,
				scope: ScopeType.One,
				playerId: playerId
			};
			setPlayingMessageData = {
				scope: ScopeType.One,
				playerId: playerId
			};
			break;
		default:
			// do nothing
		}

		// 点滅アニメーション
		this._currentSetTimeout(() => {
			const message: MessageEventDataAnimation= {
				messageType: MessageEventType.animation,
				messageData: animationMessageData
			};
			g.game.raiseEvent(new g.MessageEvent(message));
		}, this.sessionParameter.config.snake.invincibleTime * 0.75);

		if (scope === ScopeType.All) this.setCountDown();

		// 無敵状態解除通知
		this._currentSetTimeout(() => {
			const message: MessageEventDataSetPlaying= {
				messageType: MessageEventType.setPlaying,
				messageData: setPlayingMessageData
			};
			g.game.raiseEvent(new g.MessageEvent(message));
		}, this.sessionParameter.config.snake.invincibleTime);
	}

	/**
	 * サーバーインスタンスのみ実行
	 * カウントダウン表示を行う
	 */
	setCountDown(): void {
		for (let count = 4; count > 0; --count){
			let countDownType: CountDownType;
			switch (count){
			case 4:
				countDownType = CountDownType.Three;
				break;
			case 3:
				countDownType = CountDownType.Two;
				break;
			case 2:
				countDownType = CountDownType.One;
				break;
			case 1:
				countDownType = CountDownType.Start;
				break;
			default:
				// do nothing
			}

			this._currentSetTimeout(() => {
				const message: MessageEventDataCountDown= {
					messageType: MessageEventType.countDown,
					messageData: {
						countDownType: countDownType
					}
				};
				g.game.raiseEvent(new g.MessageEvent(message));
			}, this.sessionParameter.config.snake.invincibleTime - count * 1000);
		}
	}

	/**
	 * 全てのインスタンスで実行
	 * 各スネークの無敵状態を解除し、ゲームを開始する
	 */
	applyPlayingStateForAllSnakes(): void {
		Object.keys(this.playerList).forEach(playerId => {
			if (!this.playerList[playerId].snake) return;
			this.setPlayerState(playerId, PlayerState.playing);
			this.playerList[playerId].snake.removeTween(AnimationType.Blinking);
			this.playerList[playerId].snake.modifyOpacity(1.0);
		});
	}

	/**
	 * 全てのインスタンスで実行
	 * 特定のスネークの無敵状態を解除し、リスポーンする
	 */
	applyPlayingStateForOneSnake(playerId: string): void {
		if (!this.playerList[playerId].snake) return;
		this.setPlayerState(playerId, PlayerState.playing);
		this.playerList[playerId].snake.removeTween(AnimationType.Blinking);
		this.playerList[playerId].snake.modifyOpacity(1.0);
	}

	/**
	 * 指定PlayerのPlayerStateをセットする
	 */
	setPlayerState(playerId: string, state: PlayerState): void {
		this.playerList[playerId].state = state;
	}

	/**
	 * 全てのインスタンスで実行
	 * 全スネークのアニメーション処理
	 */
	animateAllSnakes(animationType: AnimationType): void {
		Object.keys(this.playerList).forEach(playerId => {
			if (!this.playerList[playerId].snake) return;
			const snake = this.playerList[playerId].snake;
			switch (animationType){
			case AnimationType.Blinking:
				snake.blinking();
				break;
			default:
					// do nothing
			}
		});
	}

	/**
	 * 全てのインスタンスで実行
	 * 特定のスネークのアニメーション処理
	 */
	animateOneSnake(animationType: AnimationType, playerId: string): void {
		if (!this.playerList[playerId].snake) return;
		const snake = this.playerList[playerId].snake;
		switch (animationType){
		case AnimationType.Blinking:
			snake.blinking();
			break;
		case AnimationType.ToBroadcasterView:
			snake.modifyOpacity(0.0);
			if (playerId===g.game.selfId){
				(snake.parent.scene as MainGameScene).showBroadcasterDisplayViewing();
			}
			break;
		default:
			// do nothing
		}
	}

	/**
	 * 参加プレイヤーの初期配置を生成する
	 */
	_generateInitLayout(): {[key: string]: InitPlayerLayoutData;} {
		const playerList: {[key: string]: InitPlayerLayoutData;}  = {};

		const playerCountRank = this.dividePlayerCountIntoTiers();
		const fieldRadius = this.sessionParameter.config.field.radius[playerCountRank] - 50;
		const lengthOfSquareInField = Math.floor(fieldRadius / Math.sqrt(2)) * 2;

		Object.keys(this.playerList).forEach((playerId) => {
			playerList[playerId] = {
				direction: this.randomGenerator.get(0, this.sessionParameter.config.userInput.radianFineness - 1),
				state: UserTouchState.noPoint,
				position: {
					x: this.randomGenerator.generate() * lengthOfSquareInField - lengthOfSquareInField / 2,
					y: this.randomGenerator.generate() * lengthOfSquareInField - lengthOfSquareInField / 2
				},
				name: this.playerList[playerId].user.name
			};
		});
		return playerList;
	}

	/**
	 * サーバーインスタンスのみ実行
	 * スネークの衝突判定をチェックする
	 */
	checkSnakeCollision(): void {
		if (this.isGameOver) return;

		const playersInConflict: SnakeCollisionInfo[] = [];
		Object.keys(this.playerList).forEach(playerId => {
			Object.keys(this.playerList).forEach(enemyId => {
				const playerState = this.playerList[playerId].state;
				const enemyState = this.playerList[enemyId].state;
				if (
					enemyId !== playerId &&
					checkStateRole(playerState, StateRoleType.CanCollideType) &&
					checkStateRole(enemyState, StateRoleType.CanCollideType)
				){
					if (this._isSnakeSegmentCollision(playerId, enemyId)){
						// 衝突後の処理
						playersInConflict.push({
							deadPlayerId: playerId,
							killerPlayerId: enemyId
						});
					}
				}
			});
		});

		if (playersInConflict.length){
			const message: MessageEventDataPlayersInConflict = {
				messageType: MessageEventType.sendPlayersInConflict,
				messageData: {
					playersInConflict: playersInConflict
				}
			};
			g.game.raiseEvent(new g.MessageEvent(message));
		}
	}

	_isSnakeSegmentCollision(playerId: string, enemyId: string): boolean {
		let collided: boolean = false;
		const playerSnake = this.playerList[playerId].snake;
		const enemySnake = this.playerList[enemyId].snake;

		if (!playerSnake || !enemySnake) return false;

		const playerHeadArea = commonAreaFromSprite(playerSnake.head.body);

		/** スネークの頭同士の判定 */
		const enemyHeadArea = commonAreaFromSprite(enemySnake.head.body);
		collided = collided || g.Collision.withinAreas(playerHeadArea, enemyHeadArea, playerSnake.head.body.width / 2);

		/** あるスネークと敵スネーク節の当たり判定 */
		enemySnake.segments.forEach(seg => {
			if (seg.type === SnakeSegmentType.Jewel) return;
			const enemyBodyArea = commonAreaFromSprite(seg.body);
			collided = collided || g.Collision.withinAreas(playerHeadArea, enemyBodyArea,
				(seg.body.width + playerSnake.head.body.width) / 2
			);
		});
		return collided;
	}

	/**
	 * サーバーインスタンスのみ実行
	 * 食べられたエサをチェックする
	 */
	checkEatenFoods(fieldRadius: number): void {
		if (this.isGameOver) return;

		const noEatenFoodIndexList: number[] = [];
		const eatenFoodInfo: EatenFoodInfo[] = [];
		this.foodList.forEach((shownFood, foodIndex) => {
			let isEaten = false;
			Object.keys(this.playerList).forEach(playerId => {
				if (isEaten) return;
				const playerSnake = this.playerList[playerId].snake;

				if (
					!shownFood ||
					!playerSnake ||
					!checkStateRole(this.playerList[playerId].state, StateRoleType.CanDropType)
				) return;

				const foodArea: g.CommonArea = {
					width: shownFood.food.width,
					height: shownFood.food.height,
					x: shownFood.food.x - shownFood.food.width / 2,
					y: shownFood.food.y - shownFood.food.height / 2
				};

				const playerHeadArea = commonAreaFromSprite(playerSnake.head.body);
				if (
					!isEaten &&
					g.Collision.withinAreas(foodArea, playerHeadArea, (foodArea.width + playerSnake.head.body.width) / 2)
				){
					isEaten = true;
					eatenFoodInfo.push({eaterId: playerId, eatenIndex: foodIndex});
					return;
				}
			});
			if (!isEaten) noEatenFoodIndexList.push(foodIndex);
		});

		if (
			this.waitingFoodList.length !== 0 ||
			eatenFoodInfo.length !== 0
		) {
			const message: MessageEventDataEatenFoods = {
				messageType: MessageEventType.eatenFoods,
				messageData: {
					eatenFoodInfo: eatenFoodInfo,
					noEatenFoodIndexList: noEatenFoodIndexList,
					fieldRadius: fieldRadius
				}
			};
			g.game.raiseEvent(new g.MessageEvent(message));
		}
	}

	/**
	 * サーバーインスタンスでのみ実行
	 * ランキング情報を更新する
	 */
	updateRanking(): void {
		const rankingList: PlayerInfo[] = [];
		Object.keys(this.playerList).forEach(playerId => {
			const playerState = this.playerList[playerId].state;
			if (
				!this.playerList[playerId].snake ||
				playerState !== PlayerState.playing
			) return;
			rankingList.push(this.playerList[playerId]);
		});
		rankingList.sort((left, right) => {
			return (left.snake.words.length > right.snake.words.length) ? -1 : 1;
		});

		let isSame = (rankingList.length === this.topPlayerList.length);
		this.topPlayerList.forEach((player, i) => {
			if (!isSame || !player) return;
			if (player.player.id !== rankingList[i].player.id) isSame = false;
		});

		// 変更があった場合のみ通知する
		if (!isSame || this.topPlayerList.length === 0){
			this.topPlayerList = rankingList;
			const topPlayerAccountDataList: AccountData[] = [];
			this.topPlayerList.forEach(player => {
				const playerState = this.playerList[player.player.id].state;
				if (
					!this.playerList[player.player.id].snake ||
					playerState !== PlayerState.playing
				) return;
				topPlayerAccountDataList.push({
					id: player.player.id,
					name: player.user.name,
					isPremium: player.user.isPremium
				});
			});

			const message: MessageEventDataRanking = {
				messageType: MessageEventType.rankingAccountData,
				messageData: {
					rankingAccountData: topPlayerAccountDataList
				}
			};
			g.game.raiseEvent(new g.MessageEvent(message));
		}
	}

	/**
	 * 全てのインスタンスで実行
	 * 食べられたエサの情報を反映する
	 */
	applyEatenFoods(eatenFoodInfo: EatenFoodInfo[], noEatenFoodIndexList: number[], fieldRadius: number): void {
		eatenFoodInfo.forEach(info => {
			if (!this.foodList[info.eatenIndex].root.destroyed()) this.foodList[info.eatenIndex].destroy();
			if (!this.playerList[info.eaterId].snake) return;
			this.playerList[info.eaterId].snake.eatFood(this.foodList[info.eatenIndex]);
		});

		const newFoodList: Food[] = [];
		noEatenFoodIndexList.forEach(noEatenIndex => {
			const food = this.foodList[noEatenIndex].food;
			if (Math.pow(food.x, 2) + Math.pow(food.y, 2) <= Math.pow(fieldRadius + 100, 2)) {
				newFoodList.push(this.foodList[noEatenIndex]);
			} else {
				if (!this.foodList[noEatenIndex].root.destroyed()) this.foodList[noEatenIndex].destroy();
			}
		});
		this.waitingFoodList.forEach(food => newFoodList.push(food));
		this.waitingFoodList = [];
		this.foodList = newFoodList;
	}

	/**
	 * サーバーインスタンスのみ実行
	 * 食べられたお宝をチェックする
	 */
	checkEatenJewel(): void {
		if (this.isGameOver) return;

		let nowOwnerId = this.jewelData.ownerId;
		let jewelArea: g.CommonArea;
		if (nowOwnerId != null) {
			// お宝所有者がいる場合
			if (!checkStateRole(this.playerList[nowOwnerId].state, StateRoleType.CanDropType)) return;
			const segments =  this.playerList[nowOwnerId].snake.segments;
			const jewel = segments[segments.length - 1];
			if (!jewel || jewel.type !== SnakeSegmentType.Jewel) return;

			jewelArea = {
				width: jewel.body.width,
				height: jewel.body.height,
				x: jewel.x + jewel.body.x,
				y: jewel.y + jewel.body.y
			};
		} else {
			jewelArea = {
				width: this.jewelData.jewel.jewel.width,
				height: this.jewelData.jewel.jewel.height,
				x: this.jewelData.jewel.jewel.x - this.jewelData.jewel.jewel.width / 2,
				y: this.jewelData.jewel.jewel.y - this.jewelData.jewel.jewel.height / 2
			};
		}

		Object.keys(this.playerList).forEach(playerId => {
			const playerSnake = this.playerList[playerId].snake;
			if (
				!playerSnake ||
				playerId === nowOwnerId ||
				!checkStateRole(this.playerList[playerId].state, StateRoleType.CanDropType)
			) return;

			const playerHeadArea = commonAreaFromSprite(playerSnake.head.body);
			if (g.Collision.withinAreas(jewelArea, playerHeadArea, (jewelArea.width + playerHeadArea.height) / 2)){
				// お宝をゲットした最初の一人をオーナーとする
				nowOwnerId = playerId;
				return;
			}
		});

		if (nowOwnerId !== this.jewelData.ownerId) {
			const message: MessageEventDataJewelOwner = {
				messageType: MessageEventType.updateJewelOwner,
				messageData: {
					ownerId: nowOwnerId
				}
			};
			g.game.raiseEvent(new g.MessageEvent(message));
		}
	}

	/**
	 * サーバーインスタンスでのみ実行
	 * フィールド上のお宝がフィールド外に存在するか判定する
	 */
	checkJewelOutsideField(fieldRadius: number): void {
		if (this.jewelData.ownerId != null) return;

		const jewel = this.jewelData.jewel.jewel;
		if (Math.pow(jewel.x, 2) + Math.pow(jewel.y, 2) > Math.pow(fieldRadius, 2)) {
			const playerCountRank = this.dividePlayerCountIntoTiers();
			const fieldRadius = this.sessionParameter.config.field.radius[playerCountRank] - 50;
			const lengthOfSquareInField = Math.floor(fieldRadius / Math.sqrt(2)) * 2;

			const message: MessageEventDataRespawnJewel = {
				messageType: MessageEventType.respawnJewel,
				messageData: {
					position: {
						x: this.randomGenerator.generate() * lengthOfSquareInField - lengthOfSquareInField / 2,
						y: this.randomGenerator.generate() * lengthOfSquareInField - lengthOfSquareInField / 2
					}
				}
			};
			g.game.raiseEvent(new g.MessageEvent(message));
		}
	}

	/**
	 * 全インスタンスで実行
	 * お宝をリスポーンさせる
	 */
	setRespawnJewel(position: g.CommonOffset): void {
		if (this.jewelData.ownerId != null) return;
		this.jewelData.jewel.respawn(position);
	}

	/**
	 * 全てのインスタンスで実行
	 * お宝の更新情報を反映する
	 */
	applyEatenJewel(ownerId: string): void {
		if (!this.playerList[ownerId].snake) return;
		const stolenPlayerId = this.jewelData.ownerId; // お宝を盗まれたプレイヤーのid
		if (stolenPlayerId != null) this.playerList[stolenPlayerId].snake.removeJewel();
		this.playerList[ownerId].snake.eatJewel();
		if (stolenPlayerId == null && !this.jewelData.jewel.root.destroyed()){
			this.jewelData.jewel.destroy();
		}
		this.jewelData.ownerId = ownerId;
	}

	/**
	 * 全てのインスタンスで実行
	 * リスポーンしたSnakeを設定する
	 */
	setRespawnSnake(playerId: string, snakeLayer: g.E, nowRadius: number): void {
		--this.playerList[playerId].respawnTimes;

		const [snake, direction] = this._generateNewSnakeLayout(playerId, snakeLayer, true, nowRadius);
		this.playerList[playerId].snake = snake;
		this.playerList[playerId].uiState = {
			direction: direction,
			state: UserTouchState.noPoint
		};
		this.setPlayerState(playerId, PlayerState.invincible);
		this.playerList[playerId].snake.modifyOpacity(0.5);
		this.userNameLabels[playerId].show();
	}

	/**
	 * 全てのインスタンスで実行
	 * 放送者の天使スネークを設定する
	 */
	setBroadcasterAngelSnake(snakeLayer: g.E, nowRadius: number): void {
		const [snake, direction] = this._generateNewSnakeLayout(this.broadcaster.id, snakeLayer, false, nowRadius);
		this.playerList[this.broadcaster.id].snake = snake;
		this.playerList[this.broadcaster.id].uiState = {
			direction: direction,
			state: UserTouchState.noPoint
		};
		this.setPlayerState(this.broadcaster.id, PlayerState.ghost);
		this.userNameLabels[this.broadcaster.id].show();
	}

	/**
	 * 全てのインスタンスで実行
	 * PreventTypeを適用する
	 */
	applyPreventUserTouch(playerId: string, preventType: PreventType): void {
		this.playerList[playerId].preventType = preventType;
	}

	/**
	 * サーバーインスタンスでのみ実行
	 * フィールド上のスネークをカウントし、ゲームを終了するか判定する
	 */
	checkGameEnd(): void {
		if (
			this.isGameOver ||
			(
				!!this.sessionParameter.config.debug &&
				(
					this.sessionParameter.config.debug.skipLottery ||
					this.sessionParameter.config.debug.banEndingGameByNumberOfPlayers
				)
			)
		) return;

		const playingSnakes = Object.keys(this.playerList).filter(playerId => {
			return checkStateRole(this.playerList[playerId].state, StateRoleType.CanCountType);
		});

		playingSnakes.forEach(playerId => {
			this.playerList[playerId].lengthCount = this.playerList[playerId].snake.words.length;
		});

		if (playingSnakes.length <= 1) {
			this.gameEndProcedure();
		}
	}

	/**
	 * サーバーインスタンスでのみ実行
	 * ゲームを終了手続きを行う
	 */
	gameEndProcedure(): void {
		if (this.isGameOver) return;

		const message: MessageEventDataFinishGame = {
			messageType: MessageEventType.finishGame
		};
		g.game.raiseEvent(new g.MessageEvent(message));

		this._currentSetTimeout(() => {
			const message: MessageEventDataStartResult = {
				messageType: MessageEventType.startResult
			};
			g.game.raiseEvent(new g.MessageEvent(message));
		}, 5000);
	}

	/**
	 * オーディオをセッションパラメータで指定されたボリュームで再生する
	 */
	playAudioAtParamVolume(audioType: AudioType): void {
		const audioPlayer = this.audioAssets[audioType].play();
		changeAudioMasterVolume(audioPlayer, this.sessionParameter.config);
	}

	/**
	 * サーバインスタンスのみ実行
	 * リザルト画面で表示するランキングの準備をする
	 */
	setupResultRanking(): void {
		const rankingList: PlayerInfo[] = [];
		Object.keys(this.playerList).forEach(playerId => {
			rankingList.push(this.playerList[playerId]);
		});

		const lengthRankingList = rankingList.slice();
		const killRankingList = rankingList.slice();
		lengthRankingList.sort((left, right) => {
			return (left.lengthCount > right.lengthCount) ? -1 : 1;
		});
		killRankingList.sort((left, right) => {
			return (left.killCount > right.killCount) ? -1 : 1;
		});

		// そのままRankingListを送れないので、最低限のデータだけ送る
		const lengthRankingPlayerIdList: {playerId: string; count: number;}[] = [];
		const killRankingPlayerIdList:  {playerId: string; count: number;}[] = [];
		lengthRankingList.forEach(p => lengthRankingPlayerIdList.push({
			playerId: p.player.id,
			count: this.playerList[p.player.id].lengthCount
		}));
		killRankingList.forEach(p => killRankingPlayerIdList.push({
			playerId: p.player.id,
			count: this.playerList[p.player.id].killCount
		}));

		const message: MessageEventDataInitResult = {
			messageType: MessageEventType.initResult,
			messageData: {
				lengthRankingPlayerIdList: lengthRankingPlayerIdList,
				killRankingPlayerIdList: killRankingPlayerIdList,
				jewelOwnerId: this.jewelData.ownerId
			}
		};
		g.game.raiseEvent(new g.MessageEvent(message));
	}

	/**
	 * プレイヤー人数をランク分けする
	 */
	dividePlayerCountIntoTiers(): number {
		let playerCount = 0;
		Object.keys(this.playerList).forEach(playerId => {
			const playerState = this.playerList[playerId].state;
			if (checkStateRole(playerState, StateRoleType.CanCountType)) ++playerCount;
		});
		if (playerCount <= 10) {
			return 4;
		} else if (playerCount <= 30) {
			return 3;
		} else if (playerCount <= 50) {
			return 2;
		} else if (playerCount <= 70) {
			return 1;
		} else {
			return 0;
		}
	}

	_generateNewSnakeLayout(playerId: string, snakeLayer: g.E, rebornEffect: boolean, nowRadius: number): [Snake, number] {
		const snakeConfig = this.sessionParameter.config.snake;
		const maxLength = (
			nowRadius - snakeConfig.baseSpeed *
			snakeConfig.maxNameLength *
			Math.round(90 / snakeConfig.baseSpeed) *
			2); // speed * segments * historyDistanceInterval
		const direction = Math.ceil(g.game.random.get(0, 1) * (this.sessionParameter.config.userInput.radianFineness - 1) / 2); // 左右の2択

		const position = {
			x: (g.game.random.generate() - 0.5) * maxLength,
			y: (g.game.random.generate() - 0.5) * maxLength
		};
		const name =  this.playerList[playerId].user.name;

		const words = stringToArray(name).slice(0, Math.min(name.length, this.sessionParameter.config.snake.maxNameLength));
		if (words.length < this.sessionParameter.config.snake.maxNameLength) {
			const blankCount = this.sessionParameter.config.snake.maxNameLength - words.length;
			for (let i = 0; i < blankCount; ++i) words.push("　");
		}

		const snake = new Snake({
			parent: snakeLayer,
			x: position.x,
			y: position.y,
			angle: (
				direction / this.sessionParameter.config.userInput.radianFineness
			) * 360,
			words: words,
			snakeBaseSpeed: this.sessionParameter.config.snake.baseSpeed,
			snakeMaxSpeedScale: this.sessionParameter.config.snake.maxSpeedScale,
			snakeMaxKnotLength: this.sessionParameter.config.snake.maxKnotLength,
			font: this.resource.font,
			snakeType: this.playerList[playerId].snakeType,
			rebornEffect: rebornEffect,
			onEndRebornEffect: () => {
				if (!g.game.isActiveInstance()) return;
				const preventTouchMessage: MessageEventDataPreventUsertouch = {
					messageType: MessageEventType.preventUsertouch,
					messageData: {
						playerId: playerId,
						preventType: PreventType.None
					}
				};
				g.game.raiseEvent(new g.MessageEvent(preventTouchMessage));
			}
		});
		return [snake, direction];
	}

	_currentSetTimeout(handler: () => void, milliseconds: number): void {
		const scene = g.game.scene();
		if (scene) {
			scene.setTimeout(handler, milliseconds);
		}
	}
}

export interface PlayerInfoParameterObject {
	player: g.Player;
	user: AccountData;
	isBroadcaster: boolean;
	snakeType: SnakeType; // スネークの種類
}

export enum PlayerState {
	/**
     * 不可視な天使（ゴースト）として参加している
     */
	ghost = "ghost",

	/**
     * 盤面に影響を持つスネークを操作している
     */
	playing = "playing",

	/**
     * join済みだがゴーストもスネークも操作していない
     */
	dead = "dead",

	/**
	 * 無敵状態（当たり判定なし）
	 * ゲーム開始・リスポン直後に即死するのを避けるための状態で、ghostとは区別される
	 * 生きているプレイヤーとしてカウントされる
	 */
	invincible = "invincible",

	/**
	 * 演出中の状態（当たり判定なし）
	 * キルされた時などに演出を行うための状態
	 * 生きているプレイヤーとしてカウントされる
	 */
	staging = "staging"

	/**
     * joinを押してないプレイヤーはPlayerStateが生成されないため、これを表現する種別はない
     */
}

export class PlayerInfo {
	player: g.Player;
	user: AccountData;
	uiState: {
		direction: number;
		state: UserTouchState;
	};
	camera: g.Camera2D;
	snake: Snake;
	snakeType: SnakeType;
	state: PlayerState;
	respawnTimes: number;
	killCount: number;
	preventType: PreventType;
	lengthCount: number;
	lastWords: string;

	constructor(param: PlayerInfoParameterObject) {
		this.player = param.player;
		this.user = param.user;
		this.snakeType = param.snakeType;
		this.state = PlayerState.invincible;
		this.respawnTimes = (param.user.isPremium || param.isBroadcaster) ?
			sessionParameter.config.snake.premiumRespawnTimes :
			sessionParameter.config.snake.respawnTimes;
		this.killCount = 0;
		this.preventType = PreventType.None;
		this.lengthCount = 0;
		this.lastWords = "";
	}

	destroySnake(): void {
		this.lastWords = this.getsLastWords();
		this.snake.destroy();
		this.snake = null;
		this.state = PlayerState.dead;
	}

	getsLastWords(): string {
		return this.snake.words.reduce((str, ch) => str + ch, "");
	}
}

export interface SnakeCollisionInfo{
	/**
	 * 倒されたプレイヤーのid
	 */
	deadPlayerId: string;

	/**
	 * deadPlayerIdを倒したプレイヤーのid
	 */
	killerPlayerId: string;
}

export interface EatenFoodInfo{
	/**
	 * エサを食べたプレイヤーのid
	 */
	eaterId: string;

	/**
	 * 食べられたエサのindex
	 */
	eatenIndex: number; // データ削減のためFoodを使わない
}

export enum AudioType {
	// ----------
	// ゲーム画面のオーディオ
	// ----------

	/**
	 * ゲーム画面BGM
	 */
	GameBGM = "GameBGM",

	/**
	 * ３２１カウントダウン時のSE
	 */
	Count = "Count",

	/**
	 * ゲーム開始時のSE
	 */
	Start = "Start",

	/**
	 * ゲーム終了時のSE
	 */
	Finish = "Finish",

	/**
	 * 衝突時のSE
	 */
	Collision = "Collision",

	/**
	 * ダッシュ時のSE
	 */
	Dash = "Dash",

	/**
	 * お宝ゲット時のSE
	 */
	Jewel = "Jewel",

	/**
	 * 選択時のSE
	 */
	Select = "Select",

	// ----------
	// リザルト画面のオーディオ
	// ----------

	/**
	 * イントロ
	 */
	Intro = "Intro",

	/**
	 * リザルト画面BGM
	 */
	ResultBGM = "ResultBGM"
}

function commonAreaFromSprite(e: g.E): g.CommonArea {
	const centerPos = e.localToGlobal({ // Eの中心座標を得る
		x: e.anchorX * e.width,
		y: e.anchorY * e.height
	});
	return {
		x: centerPos.x - e.anchorX * e.width, // anchor位置をオフセットする
		y: centerPos.y - e.anchorY * e.height,
		width: e.width,
		height: e.height
	};
}
