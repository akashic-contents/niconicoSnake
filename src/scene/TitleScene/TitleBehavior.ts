import { StateManager } from "../../StateManager";
import { Behavior } from "../Behavior";
import { TitleScene } from "./TitleScene";
import {
	MessageEventType,
	MessageEventDataWaitRecruitment,
	MessageEventDataJoinRequest,
	MessageEventDataLotteryResult,
	MessageEventDataStartRecruitment
} from "../../types/MessageEventType";


export interface TitleBehaviorParameterObject {
	scene: TitleScene;
	stateManager: StateManager;
}

export class TitleBehavior extends Behavior {
	scene: TitleScene;
	constructor(param: TitleBehaviorParameterObject){
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
		case MessageEventType.waitRecruitment:
			this.scene.createJoinButton();
			this.scene.setRecruitmentTimer((data as MessageEventDataWaitRecruitment).messageData.startTime);
			break;
		case MessageEventType.lotteryResult:
			const messageData = (data as MessageEventDataLotteryResult).messageData;
			this.stateManager.setPlayerList(messageData.playerList);
			this.scene.showLotteryResult(messageData.numPlayers);
			break;
		case MessageEventType.startGame:
			this.stateManager.changeMainGameScene();
			break;
		case MessageEventType.restartRecruitment:
			this.scene.resetScene();
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
		case MessageEventType.startRecruitment:
			this.stateManager.startRecruitment(
				(data as MessageEventDataStartRecruitment).messageData.broadcasterUser
			);
			const checkTimeUp: () => void = () => {
				if ((g.game.age - this.stateManager.startTime) > this.stateManager.sessionParameter.entrySec * g.game.fps) {
					this.stateManager.startLottery();
					this.scene.update.remove(checkTimeUp);
				}
			};
			this.scene.onUpdate.add(checkTimeUp);
			break;
		case MessageEventType.joinRequest:
			this.stateManager.receiveJoinRequest(
				(data as MessageEventDataJoinRequest).messageData.joinPlayer,
				(data as MessageEventDataJoinRequest).messageData.joinUser,
			);
			break;
		default:
			// do nothing
		}
	}
}
