import { OffsetGroup, OffsetGroupParameterObject } from "./OffsetGroup";

export interface JewelParameterObject extends OffsetGroupParameterObject {
	x: number;
	y: number;
}

export class Jewel extends OffsetGroup {
	jewel: g.Sprite;

	constructor(param: JewelParameterObject) {
		super(param);
		this._init(param);
	}

	respawn(position: g.CommonOffset): void {
		this.jewel.x = position.x;
		this.jewel.y = position.y;
		this.jewel.modified();
	}

	_init(param: JewelParameterObject): void {
		const jewelAsset = (this.parent.scene.assets.main_jewel_body as g.ImageAsset);
		this.jewel = new g.Sprite({
			scene: this.parent.scene,
			x: param.x,
			y: param.y,
			anchorX: 0.5,
			anchorY: 0.5,
			src: jewelAsset,
			width: jewelAsset.width,
			height: jewelAsset.height,
		});
		this.root.append(this.jewel);
	}
}

export interface JewelData {
	/**
	 * お宝
	 */
	jewel: Jewel;

	/**
	 * お宝の所有者のId
	 */
	ownerId: string;
}
