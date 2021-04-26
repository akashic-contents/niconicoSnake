import { MainGameScene } from "./MainGameScene";
import { StateManager, AudioType, PlayerState } from "../../StateManager";
import { Behavior } from "../Behavior";
import {
	MessageEventType,
	MessageEventDataInitMainGame,
	MessageEventDataChangeUserTouchState,
	MessageEventDataPlayersInConflict,
	MessageEventDataEatenFoods,
	MessageEventDataJewelOwner,
	MessageEventDataRanking,
	MessageEventDataRemainTime,
	MessageEventDataSetPlaying,
	ScopeType,
	MessageEventDataAnimation,
	MessageEventDataCountDown,
	MessageEventDataPreventUsertouch,
	MessageEventDataDestroySnake,
	MessageEventDataRespawnJewel
} from "../../types/MessageEventType";
import { UserTouchState } from "../../types/UserTouchState";
import { StateRoleType, checkStateRole } from "../../utils/StateRoleChecker";

export interface MainGameBehaviorParameterObject {
	scene: MainGameScene;
	stateManager: StateManager;
}

export class MainGameBehavior extends Behavior {
	scene: MainGameScene;
	constructor(param: MainGameBehaviorParameterObject){
		super(param);
	}

	onMessageEvent(event: g.MessageEvent): void {
		this._onAllInstanceEvent(event);
		if (g.game.isActiveInstance()) this._onActiveInstanceEvent(event);
	}

	/**
	 * 全てのインスタンスで拾うイベント
	 */
	_onAllInstanceEvent(event: g.MessageEvent): void {
		const data = event.data;
		const messageType = data.messageType;

		switch (messageType) {
		case MessageEventType.initMainGame:
			this.scene.init((data as MessageEventDataInitMainGame).messageData.playerInitLayoutList);
			break;
		case MessageEventType.setPlaying:
			switch ((data as MessageEventDataSetPlaying).messageData.scope){
			case ScopeType.All:
				this.stateManager.applyPlayingStateForAllSnakes();
				break;
			case ScopeType.One:
				if (!(data as MessageEventDataSetPlaying).messageData.playerId) break;
				this.stateManager.applyPlayingStateForOneSnake(
					(data as MessageEventDataSetPlaying).messageData.playerId
				);
				break;
			default:
				// do nothing
			}
			break;
		case MessageEventType.changeUserTouchState:
			const playerId = (data as MessageEventDataChangeUserTouchState).messageData.id;
			this.stateManager.applyTouchState(
				(playerId) ? playerId : event.player.id,
				(data as MessageEventDataChangeUserTouchState).messageData.newState,
				(data as MessageEventDataChangeUserTouchState).messageData.newDirection
			);

			const canPlaySE = (data as MessageEventDataChangeUserTouchState).messageData.canPlaySE;
			if (
				(canPlaySE == null || (!!canPlaySE && canPlaySE)) &&
				playerId === this.stateManager.broadcaster.id &&
				this.scene._isAudience(g.game.selfId)
			) {
				if ((data as MessageEventDataChangeUserTouchState).messageData.newState === UserTouchState.onDoubleTap){
					this.stateManager.playAudioAtParamVolume(AudioType.Dash);
				} else {
					this.stateManager.audioAssets[AudioType.Dash].stop();
				}
			}
			break;
		case MessageEventType.sendPlayersInConflict:
			this.scene.receivePlayersInConflict((data as MessageEventDataPlayersInConflict).messageData.playersInConflict);
			break;
		case MessageEventType.respawnSnake:
			if (this.stateManager.playerList[event.player.id].state !== PlayerState.dead) break; // 重複リスポーンを防ぐ

			this.stateManager.setRespawnSnake(event.player.id, this.scene.snakeLayer, this.scene.stage.getNowRadius());
			if (event.player.id === g.game.selfId) {
				this.scene.localParameter.respawnButton.destroy();
				this.scene.localParameter.respawnButton = null;
				this.scene.localParameter.broadcasterDisplayViewing.hide();
				this.scene.localParameter.dashingGauge = this.stateManager.sessionParameter.config.snake.dashingTime * g.game.fps;
				this.scene.localParameter.dashingGaugeBar.updateGauge(this.stateManager.sessionParameter.config.snake.dashingTime);
				this.scene.localParameter.dashingGaugeBar.opacity = 0.0;
				this.scene.localParameter.dashingGaugeBar.show();
			}
			break;
		case MessageEventType.respawnBroadcasterAngelSnake:
			if (this.stateManager.playerList[this.stateManager.broadcaster.id].state !== PlayerState.dead) break; // 重複リスポーンを防ぐ

			this.stateManager.setBroadcasterAngelSnake(this.scene.snakeLayer, this.scene.stage.getNowRadius());
			this.scene.modifyBroadcasterAngelSnake();
			if (event.player.id === g.game.selfId) {
				this.scene.localParameter.respawnButton.destroy();
				this.scene.localParameter.respawnButton = null;
				this.scene.localParameter.broadcasterDisplayViewing.hide();
				this.scene.localParameter.dashingGauge = this.stateManager.sessionParameter.config.snake.dashingTime * g.game.fps;
				this.scene.localParameter.dashingGaugeBar.updateGauge(this.stateManager.sessionParameter.config.snake.dashingTime);
				this.scene.localParameter.dashingGaugeBar.opacity = 0.0;
				this.scene.localParameter.dashingGaugeBar.show();
			}
			break;
		case MessageEventType.respawnJewel:
			this.stateManager.setRespawnJewel((data as MessageEventDataRespawnJewel).messageData.position);
			break;
		case MessageEventType.eatenFoods:
			this.stateManager.applyEatenFoods(
				(data as MessageEventDataEatenFoods).messageData.eatenFoodInfo,
				(data as MessageEventDataEatenFoods).messageData.noEatenFoodIndexList,
				(data as MessageEventDataEatenFoods).messageData.fieldRadius
			);
			break;
		case MessageEventType.updateJewelOwner:
			const stolenPlayerId = this.stateManager.jewelData.ownerId; // お宝を盗まれたプレイヤーのid（applyEatenJewelで更新）
			this.stateManager.applyEatenJewel(
				(data as MessageEventDataJewelOwner).messageData.ownerId
			);
			this.scene.switchGoldenSnake(
				(data as MessageEventDataJewelOwner).messageData.ownerId,
				stolenPlayerId
			);
			break;
		case MessageEventType.rankingAccountData:
			this.scene.rewriteRanking((data as MessageEventDataRanking).messageData.rankingAccountData);
			break;
		case MessageEventType.updateRemainTime:
			this.scene.rewriteTime((data as MessageEventDataRemainTime).messageData.remainTime);
			break;
		case MessageEventType.animation:
			switch ((data as MessageEventDataAnimation).messageData.scope){
			case ScopeType.All:
				this.stateManager.animateAllSnakes(
					(data as MessageEventDataAnimation).messageData.animationType
				);
				break;
			case ScopeType.One:
				if (!(data as MessageEventDataAnimation).messageData.playerId) break;
				this.stateManager.animateOneSnake(
					(data as MessageEventDataAnimation).messageData.animationType,
					(data as MessageEventDataAnimation).messageData.playerId
				);
				break;
			default:
					// do nothing
			}
			break;
		case MessageEventType.countDown:
			this.scene.showCountDown(
				(data as MessageEventDataCountDown).messageData.countDownType
			);
			break;
		case MessageEventType.preventUsertouch:
			this.stateManager.applyPreventUserTouch(
				(data as MessageEventDataPreventUsertouch).messageData.playerId,
				(data as MessageEventDataPreventUsertouch).messageData.preventType
			);
			break;
		case MessageEventType.destroySnake:
			this.scene.snakeDestructionProcedure((data as MessageEventDataDestroySnake).messageData.deadPlayerId);
			break;
		case MessageEventType.finishGame:
			(this.scene.assets.snake_bgm as g.AudioAsset).stop();
			this.stateManager.isGameOver = true;
			Object.keys(this.stateManager.playerList).forEach(playerId => {
				if ( checkStateRole(this.stateManager.playerList[playerId].state, StateRoleType.CanCountType) ){
					this.stateManager.playerList[playerId].lastWords = this.stateManager.playerList[playerId].getsLastWords();
				}
			});
			this.scene.showFinishView();
			break;
		case MessageEventType.startResult:
			this.scene._stopAllAudio();
			this.stateManager.changeResultScene();
			break;
		default:
			// do nothing
		}
	}

	/**
	 * サーバーインスタンスでのみ拾うイベント
	 */
	_onActiveInstanceEvent(event: g.MessageEvent): void {
		const data = event.data;
		const messageType = data.messageType;

		switch (messageType) {
		case MessageEventType.setPlaying:
			switch ((data as MessageEventDataSetPlaying).messageData.scope){
			case ScopeType.All:
			// タイマー起動
				this.scene.setCountDownIntervalInActiveInstance();
				break;
			default:
			// do nothing
			}
			break;
		case MessageEventType.sendPlayersInConflict:
			this.scene.manageSnakeDestructionInActiveInstance((data as MessageEventDataPlayersInConflict).messageData.playersInConflict);
			break;
		case MessageEventType.respawnSnake:
			this.stateManager.endInvincibleTime(
				ScopeType.One,
				event.player.id
			);
			break;
		case MessageEventType.finishGame:
			if (this.scene.localParameter.remainGameTimer != null) {
				this.scene.clearInterval(this.scene.localParameter.remainGameTimer);
				this.scene.localParameter.remainGameTimer = null;
			}
			break;
		default:
			// do nothing
		}
	}
}
