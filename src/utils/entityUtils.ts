export function localToGlobal(offset: g.CommonOffset): g.CommonOffset {
	let point = offset;
	for (let entity: g.E | g.Scene | undefined = this; entity instanceof g.E; entity = entity.parent) {
		point = entity.getMatrix().multiplyPoint(point);
	}
	return point;
}
