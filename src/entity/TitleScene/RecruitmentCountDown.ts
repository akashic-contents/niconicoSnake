export interface RecruitmentCountDownParameterObject extends g.EParameterObject {
	font: g.Font;
}

/**
 * タイトルシーンで募集の残り秒数を表示エンティティ
 */
export class RecruitmentCountDown extends g.E {
	digits: g.Label[];

	constructor(params: RecruitmentCountDownParameterObject) {
		const width = 486;
		const height = 64;
		super({
			...params,
			width: width,
			height: height,
			x: g.game.width / 2,
			anchorX: 0.5,
			anchorY: 0
		});

		const leftLabel = new g.Label({
			scene: params.scene,
			text: "参加者受付中 残り",
			font: params.font,
			textColor: "white",
			fontSize: 36,
			x: 0,
			y: height / 2,
			anchorX: 0,
			anchorY: 0.5
		});
		this.append(leftLabel);
		const rightLabel = new g.Label({
			scene: params.scene,
			text: "秒",
			font: params.font,
			textColor: "white",
			fontSize: 36,
			x: 450,
			y: height / 2,
			anchorX: 0,
			anchorY: 0.5
		});
		this.append(rightLabel);

		this._createDigits(params.font);
	}

	_createDigits(font: g.Font): void {
		const digit1 = new g.Label({
			scene: this.scene,
			text: "1",
			font: font,
			textColor: "white",
			fontSize: 66,
			x: 331, // レイアウト指示書
			y: -8
		});

		this.append(digit1);
		const digit2 = new g.Label({
			scene: this.scene,
			text: "0",
			font: font,
			textColor: "white",
			fontSize: 66,
			x: 381, // レイアウト指示書
			y: -8
		});
		this.append(digit2);
		this.digits = [digit1, digit2];
	}

	setTime(value: number): void {
		value = Math.floor(value % 100);
		const strValue = String(value);
		if (value < 10) {
			this.digits[0].text = "0";
			this.digits[1].text = strValue[0];

		} else {
			this.digits[0].text = strValue[0];
			this.digits[1].text = strValue[1];
		}
		this.digits.forEach(e => e.invalidate());
	}
}
