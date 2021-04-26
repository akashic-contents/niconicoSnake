module.exports = {
	showMenu: true,
	events: {
		"default": [
			[
				32,
				0,
				":akashic",
				{
					"type":"start",
					"parameters":{}
				}
			]
		],
		"デバッグ：抽選スキップ": [
			[
				32,
				0,
				":akashic",
				{
					"type":"start",
					"parameters":{
						config: {
							debug: {
								skipLottery: true,
								audioVolume: 0.5
							}
						}
					}
				}
			]
		],
		"デバッグ：マルチ（デフォルト）": [
			[
				32,
				0,
				":akashic",
				{
					"type":"start",
					"parameters":{
						config: {
							debug: {
								audioVolume: 0.5
							}
						}
					}
				}
			]
		],
		"デバッグ：マルチ（リスポーン回数100）": [
			[
				32,
				0,
				":akashic",
				{
					"type":"start",
					"parameters":{
						config: {
							snake: {
								respawnTimes: 100,
								premiumRespawnTimes: 100
							},
							debug: {
								audioVolume: 0.5
							}
						}
					}
				}
			]
		],
		"抽選人数2人": [
			[
				32,
				0,
				":akashic",
				{
					"type":"start",
					"parameters":{
						"numPlayers": 2
					}
				}
			]
		],
        "コーナーケース（フィールドが極端に狭い場合）": [
            [
                32,
                0,
                ":akashic",
                {
                    "type":"start",
                    "parameters":{
                        config: {
                            field: {
                                radius: [50, 50, 50, 50, 50]
                            },
                            snake: {
                                respawnTimes: 100,
                                premiumRespawnTimes: 100
                            },
                            debug: {
                                audioVolume: 0.5,
                                banEndingGameByNumberOfPlayers: true
                            }
                        }
                    }
                }
            ]
        ]
	}
};
