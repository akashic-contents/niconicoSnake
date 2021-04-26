export interface DashingGaugeParameterObject extends g.SpriteParameterObject {
	maxGaugeAmount: number;
}

export class DashingGauge extends g.Sprite {
	_maxGaugeAmount: number;
	_maxGaugeBaseWidth: number;

	_gaugeAsset: g.ImageAsset;
	_gaugeBar: g.Pane;

	constructor(param: DashingGaugeParameterObject){
		super(param);
		this._maxGaugeAmount = param.maxGaugeAmount;
		this._maxGaugeBaseWidth = 126 - 8;
		this._gaugeAsset = (this.scene.assets.main_dash_gauge1 as g.ImageAsset);

		this._gaugeBar = new g.Pane({
			scene: this.scene,
			width: this._maxGaugeBaseWidth,
			height: this._gaugeAsset.height,
			x: 4,
			y: 4,
			backgroundImage: this._gaugeAsset,
			backgroundEffector: new g.NinePatchSurfaceEffector(this.scene.game, 5)
		});
		this.append(this._gaugeBar);
	}

	updateGauge(gaugeAmount: number): void {
		// ブラウザによって9patchの幅が整数でないと表示がおかしくなるので、整数に丸める
		const gaugeBarWidth = Math.floor((gaugeAmount / this._maxGaugeAmount) * this._maxGaugeBaseWidth);
		this._gaugeBar.x = this._maxGaugeBaseWidth - gaugeBarWidth + 4;
		if (gaugeBarWidth < this._gaugeAsset.width) {
			this._gaugeBar.x += (this._gaugeAsset.width - gaugeBarWidth) / 2;
			if (gaugeBarWidth < 3 * this._gaugeAsset.width / 4) this._gaugeBar.hide();
			else this._gaugeBar.show();
		}
		this._gaugeBar.width = gaugeBarWidth;
		if (this.opacity !== 0) this._gaugeBar.invalidate();
	}
}
