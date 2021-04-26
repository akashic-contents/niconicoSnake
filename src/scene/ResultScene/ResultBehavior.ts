import { StateManager } from "../../StateManager";
import { Behavior } from "../Behavior";
import { ResultScene } from "./ResultScene";
import {
	MessageEventType, MessageEventDataInitResult, MessageEventDataNextRankingType, MessageEventDataScrollSpeed
} from "../../types/MessageEventType";


export interface ResultBehaviorParameterObject {
	scene: ResultScene;
	stateManager: StateManager;
}

export class ResultBehavior extends Behavior {
	scene: ResultScene;
	constructor(param: ResultBehaviorParameterObject){
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
		case MessageEventType.initResult:
			g.game.focusingCamera = new g.Camera2D({});
			this.scene.init(
				(data as MessageEventDataInitResult).messageData.lengthRankingPlayerIdList,
				(data as MessageEventDataInitResult).messageData.killRankingPlayerIdList,
				(data as MessageEventDataInitResult).messageData.jewelOwnerId
			);
			break;
		case MessageEventType.nextRankingType:
			this.scene.changeShownRankingType(
				(data as MessageEventDataNextRankingType).messageData.nextRankingType
			);
			break;
		case MessageEventType.changeScrollSpeed:
			this.scene.changeScrollSpeed(
				(data as MessageEventDataScrollSpeed).messageData.rankingType,
				(data as MessageEventDataScrollSpeed).messageData.speedType
			);
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
		default:
			// do nothing
		}
	}
}
