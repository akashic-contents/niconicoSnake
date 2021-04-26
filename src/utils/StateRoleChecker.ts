import { PlayerState } from "../StateManager";

export enum StateRoleType {
	/**
	 * 衝突判定がある PlayerState群
	 */
	CanCollideType = "CanCollideType",

	/**
	 * 音を鳴らしてよい PlayerState群
	 */
	CanSoundType = "CanSoundType",

	/**
	 * フィールド上に生存しているスネークとしてカウントする PlayerState群
	 */
	CanCountType = "CanCountType",

	/**
	 * 操作ハンドラを呼んで良い PlayerState群
	 */
	CanOperateType = "CanOperateType",

	/**
	 * 移動可能な PlayerState群
	 */
	CanMoveType = "CanMoveType",

	/**
	 * 節、お宝を落とすことが可能な PlayerState群
	 */
	CanDropType = "CanDropType",

	/**
	 * ゲーム観戦者になっている時の PlayerState群
	 */
	IsAudienceType = "IsAudienceType"
}

/**
 * PlayerStateの役割を判定する
 */
export function checkStateRole(playerState: PlayerState, roleType: StateRoleType): boolean {
	switch (roleType){
	case StateRoleType.CanCollideType:
		return (
			playerState !== PlayerState.ghost &&
			playerState !== PlayerState.invincible &&
			playerState !== PlayerState.staging
		);
	case StateRoleType.CanSoundType:
		return (
			playerState === PlayerState.playing ||
			playerState === PlayerState.invincible
		);
	case StateRoleType.CanCountType:
		return (
			playerState === PlayerState.playing ||
			playerState === PlayerState.invincible ||
			playerState=== PlayerState.staging
		);
	case StateRoleType.CanOperateType:
		return (
			playerState !== PlayerState.staging &&
			playerState !== PlayerState.dead
		);
	case StateRoleType.CanMoveType:
		return (
			playerState !== PlayerState.staging &&
			playerState !== PlayerState.dead
		);
	case StateRoleType.CanDropType:
		return (
			playerState === PlayerState.playing
		);
	case StateRoleType.IsAudienceType:
		return (
			playerState === PlayerState.dead ||
			playerState === PlayerState.staging
		);
	default:
		// never
		return false;
	}
}
