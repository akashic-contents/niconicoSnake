import GraphemeSplitter = require("grapheme-splitter");
const splitter = new GraphemeSplitter();

/**
 * サロゲートペア・合成絵文字を考慮して文字列を切り取る
 * powered by grapheme-splitter
 * @param str 文字列
 * @param length 長さ
 */
export function slice(str: string, length: number): string {
	const array = splitter.splitGraphemes(str);
	const ret = array.slice(0, length);
	return ret.join("");
}

/**
 * サロゲートペア・合成絵文字を考慮して、指定文字数が超えていたら末尾に指定の文字列を追加して返す
 */
export function clampString(str: string, length: number, endLetter: string = ""): string {
	const array = splitter.splitGraphemes(str);
	if (length < array.length) {
		return slice(str, length) + endLetter;
	}
	return str;
}

/**
 * 文字列をサロゲートペア・合成絵文字を考慮して配列化する
 * powered by grapheme-splitter
 * @param str 文字列
 */
export function stringToArray(str: string): string[] {
	return splitter.splitGraphemes(str);
}
