import { Tile } from "@akashic-extension/akashic-tile";

export class Field extends g.Pane {
	base: g.Sprite;
	constructor(param: g.PaneParameterObject){
		super(param);
		this._createBase();
		this._createTiles();
	}

	_createBase(): void {
		const baseAsset = (this.scene.assets.field_base as g.ImageAsset);
		const scale = this.width / baseAsset.width;
		this.base = new g.Sprite({
			scene: this.scene,
			src: baseAsset,
			x: this.width / 2,
			y: this.height / 2,
			scaleX: scale,
			scaleY: scale,
			anchorX: 0.5,
			anchorY: 0.5
		});
		this.append(this.base);
	}

	_createTiles(): void{
		const tileAsset = (this.scene.assets.field_tiles as g.ImageAsset);
		const tileLineCount = Math.ceil(this.width / tileAsset.height);
		const tileArray: number[][] = [];
		for (let i = 0; i < tileLineCount; ++i) {
			tileArray[i] = [];
			for (let j = 0; j < tileLineCount; ++j) {
				tileArray[i].push(g.game.random.get(0, 4));
			}
		}
		const tile = new Tile({
			scene: this.scene,
			src: tileAsset,
			tileWidth: tileAsset.height,
			tileHeight: tileAsset.height,
			tileData: tileArray
		});
		tile.compositeOperation = g.CompositeOperation.ExperimentalSourceIn;
		this.append(tile);
	}

	narrowArea(newWidth: number): void{
		if (newWidth <= 0) return;
		const baseAsset = (this.scene.assets.field_base as g.ImageAsset);
		const scale = newWidth / baseAsset.width;
		this.base.scaleX = scale;
		this.base.scaleY = scale;

		// baseがappendされている親Paneの再描画を間引く
		if (scale === Math.round(scale) || g.game.age % 15 !== 0) return;
		this.base.modified();
	}

	/**
	 * フィールドの形状を真円と暗黙に仮定して扱うときのサイズ
	 */
	getNowRadius(): number {
		if (this.nowWidth === this.nowHeight) return this.nowWidth;
		return (this.nowWidth + this.nowHeight) / 2;
	}

	get nowWidth(): number{
		return this.base.width * this.base.scaleX;
	}

	get nowHeight(): number{
		return this.base.height * this.base.scaleY;
	}
}
