export interface BigButtonParameterObject extends g.EParameterObject {

	/**
	 * 中に表示するテキスト
	 */
	text: string;

	/**
	 * テキスト用のフォント
	 */
	font: g.Font;

	/**
	 * テキストカラー
	 */
	textColor: string;
}

/**
 * 準備画面仕様の大ボタンq
 */
export class BigButton extends g.Pane {
	_textLabel: g.Label;

	constructor(params: BigButtonParameterObject) {
		const width = 720; // レイアウト指示書で定義
		const height = 120; // レイアウト指示書で定義
		super({
			...params,
			width: width,
			height: height,
			backgroundEffector: new g.NinePatchSurfaceEffector(
				g.game,
				{
					top: 55,
					bottom: 55,
					left: 64,
					right: 64
				}
			),
			backgroundImage: params.scene.assets.btn_frame_join as g.ImageAsset
		});

		this._textLabel = new g.Label({
			scene: this.scene,
			anchorX: 0.5,
			anchorY: 0.5,
			x: width / 2,
			y: height / 2 - 5,
			font: params.font,
			text: params.text,
			fontSize: 70,
			textColor: params.textColor,
			local: params.local
		});
		this.append(this._textLabel);
	}

	/**
	 * 無効状態の表示に切り替える
	 * @param text テキストを変更する場合は指定する
	 */
	toDisable(text?: string): void {
		this.backgroundImage = g.SurfaceUtil.asSurface(this.scene.assets.btn_frame_join_disable as g.ImageAsset);
		this.invalidate();
		if (text) {
			this._textLabel.text = text;
			this._textLabel.invalidate();
		}
	}
}
