export enum UserTouchState {
	/**
	 * そのインスタンスのユーザが移動操作を開始した状態を表す
	 */
	onPoint = "onPoint",

	/**
     * 操作していない状態を表す
     * 主にpointUp後の状態
     */
	noPoint = "noPoint",

	/**
     * ダブルタップしている状態
	 * ダッシュ可能時間内
     */
	onDoubleTap = "onDoubleTap",

	/**
	 * ダッシュ終了後もタップし続けている状態
	 */
	onHold = "onHold"
}
