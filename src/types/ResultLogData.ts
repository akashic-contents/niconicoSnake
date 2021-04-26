export interface ResultLogData {
	/** 集計内容の lengthRank を格納する */
	rank: number;

	/** 集計内容の userId を格納する */
	userId: string;

	/** 集計内容の lengthCount を格納する */
	score: number;

	/** 集計内容のキーと値を JSON にしたものを渡す */
	params: {
		userId: string;
		userName: string;
		isPremium: boolean;
		lengthCount: number;
		lengthRank: number;
		words: string;
		killCount: number;
		killRank: number;
		haveJewel: boolean;
	};
}
