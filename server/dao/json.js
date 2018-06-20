/**
 * 本地 DB 模块
 *
 * 基于lowdb模块，是基于本地json文件的数据库
 * 文档: https://github.com/typicode/lowdb
 */

const low = require('lowdb');
const FileAsync = require('lowdb/adapters/FileAsync');
const path = require('path');

const jsonPath = path.resolve(__dirname, '../data/db.json');

const adapter = new FileAsync(jsonPath, {
	// 初始化 db
	defaultValue: {
		// 人脸数据，数据结构 personId, personName, url
		persons: [],
		// 用户游戏结果，数据结构: openid, nickName, avatarUrl, rate, animalName
		result: [],
		// 用户与微信群id关联关系，数据结构: openid, openGid
		groupRelation: [],
	},
});

// export factory
const factory = () => low(adapter);

module.exports = factory;