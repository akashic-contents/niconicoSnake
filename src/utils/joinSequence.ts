import { resolvePlayerInfo } from "@akashic-extension/resolve-player-info";
import {
	MessageEventType,
	AccountData,
	MessageEventDataJoinRequest,
	MessageEventDataStartRecruitment
} from "../types/MessageEventType";

/**
 * 放送者が参加募集を開始するシーケンス
 */
export function startRecruitmentSequence(): void {
	resolvePlayerInfo({ raises: false }, (error: any, playerInfo) => {
		let joinUser: AccountData;
		if (error || !playerInfo?.userData?.accepted) {
			joinUser = {
				name: "broadcaster",
				id: "000000000",
				isPremium: false
			};
		} else {
			joinUser = {
				name: playerInfo.name,
				id: "000000000",
				isPremium: !!playerInfo.userData.premium
			};
		}
		const message: MessageEventDataStartRecruitment = {
			messageType: MessageEventType.startRecruitment,
			messageData: {
				broadcasterUser: joinUser
			}
		};
		g.game.raiseEvent(new g.MessageEvent(message));
	});
}

/**
 * プレイヤーがゲームに参加リクエストを送るシーケンス
 */
export function joinRequestSequence(player: g.Player): void {
	resolvePlayerInfo({ raises: false }, (error: any, playerInfo) => {
		let joinUser: AccountData;
		if (error || !playerInfo?.userData?.accepted) {
			joinUser = {
				name: (!!player.name) ? player.name : "niconico",
				id: player.id,
				isPremium: false
			};
		} else {
			joinUser = {
				name: playerInfo.name!, // acceptedが真ならnameが渡される
				id: player.id,
				isPremium: !!playerInfo.userData.premium
			};
		}
		const message: MessageEventDataJoinRequest = {
			messageType: MessageEventType.joinRequest,
			messageData: {
				joinPlayer: player,
				joinUser: joinUser
			}
		};
		g.game.raiseEvent(new g.MessageEvent(message));
	});
}
