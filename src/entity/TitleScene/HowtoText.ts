import { Label } from "@akashic-extension/akashic-label";

export interface HowtoTextParameterObject extends g.EParameterObject {
	/**
	 * あそびかたに表示するテキスト
	 */
	text: string;
}

// ニコニコ生放送フォント定義
const FontFamily = {
	// ゴシック: Avenir Next DemiBold + ヒラギノ角ゴ Pro W6
	Gothic: [
		// Avenir Next DemiBold
		"Avenir Next DemiBold",
		"AvenirNext-DemiBold",
		"Avenir Next",

		// for Windows
		"Verdana",

		// ヒラギノ角ゴ Pro W6
		"ヒラギノ角ゴ Pro W6",
		"HiraKakuPro-W6",

		// for Windows
		"meiryo",

		"sans-serif"
	],

	Number: [
		// Avenir Next DemiBold
		"Avenir Next DemiBold",
		"AvenirNext-DemiBold",
		"Avenir Next",

		// for Windows
		"Verdana",

		"sans-serif"
	]
};

const HOWTO_FONT_SIZE = 34;
const howtoFont = new g.DynamicFont({
	game: g.game,
	fontFamily: FontFamily.Gothic,
	size: HOWTO_FONT_SIZE,
	fontWeight: g.FontWeight.Bold
});

/**
 * あそびかた説明
 */
export class HowtoText extends g.Pane {
	constructor(params: HowtoTextParameterObject) {
		const width = 1030; // 手調整 (レイアウト指示+30)
		const height = 340; // 手調整 (レイアウト指示+60)
		super({
			...params,
			width: width,
			height: height,
			anchorX: 0.5,
			anchorY: 0,
			x: g.game.width / 2,
			backgroundEffector: new g.NinePatchSurfaceEffector(g.game, 20),
			backgroundImage: params.scene.assets.frame_howto as g.ImageAsset
		});
		const title = new g.Label({
			scene: this.scene,
			x: 64,
			y: 32,
			text: "あそびかた",
			font: howtoFont,
			textColor: "yellow",
			fontSize: 34,
		});
		this.append(title);
		const howtoText = new Label({
			scene: this.scene,
			text: params.text,
			font: howtoFont,
			fontSize: HOWTO_FONT_SIZE,
			textColor: "#FFFFFF",
			lineGap: 10,
			x: 64,
			y: 80,
			width: 1000,
			height: 170
		});
		this.append(howtoText);
	}
}
