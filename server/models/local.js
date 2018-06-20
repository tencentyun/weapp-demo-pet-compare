/**
 * 与本地 DB 通信的模块
 */

const dao = require('../dao/json');
const md5 = require('md5');

module.exports = {
	/**
	 * 将人脸id，宠物名，宠物图片关联关系保存
	 * @param personId
	 * @param personName
	 * @param url
	 * @return {Promise.<{personId, personName, url}>}
	 */
	async savePerson({ personId, personName, url } = {}) {
		const db = await dao();

		const person = { personId, personName, url };

		const hasExist = db.get('persons').find({ personId }).value();

		if (!hasExist) {
			await db.get('persons')
				.push(person)
				.write();
		} else {
			return hasExist;
		}

		return person;
	},

	/**
	 * 根据personId查询关联关系数据
	 * @param personId
	 * @return {Promise.<void>}
	 */
	async getPerson({ personId } = {}) {
		const db = await dao();

		return db.get('persons').find({ personId }).value();
	},

	/**
	 * 更新人脸-宠物关联关系中的宠物图片
	 * @param personId
	 * @param url
	 * @return {Promise.<void>}
	 */
	async updatePersonUrl({ personId, url }) {
		const db = await dao();

		return db.get('persons')
			.find({ personId })
			.assign({ url })
			.write();
	},

	/**
	 * 保存游戏结果
	 * @param openid
	 * @param nickName
	 * @param avatarUrl
	 * @param rate
	 * @param animalName
	 * @return {Promise.<{openid: *, nickName: *, avatarUrl: *, rate: *, animalName: *}>}
	 */
	async saveResult({ openid, nickName, avatarUrl, rate, animalName }) {
		const db = await dao();

		const result = { openid, nickName, avatarUrl, rate, animalName };

		const existResult = db.get('result').find({ openid }).value();

		if (!existResult) {
			await db.get('result')
				.push(result)
				.write();
		} else {
			// 保留最高的一次结果
			if (+existResult.rate < +result.rate) {
				// 万一报错，不阻塞用户游戏流程，直接返回结果不 await
				db.get('result')
					.find({ openid })
					.assign(result)
					.write();
			}
		}

		return result;
	},

	/**
	 * 保存用户与微信群id关联关系
	 * @param openid
	 * @param openGid
	 * @return {Promise.<void>}
	 */
	async addUser2Group({ openid, openGid }) {
		const db = await dao();

		const relation = { openid, openGid };

		const hasExist = db.get('groupRelation').find(relation).value();

		if (!hasExist) {
			await db.get('groupRelation')
				.push(relation)
				.write();
		}
	},

	/**
	 * 查询该群的用户的游戏结果
	 * @param openGid
	 * @return {Promise.<Array.<T>>}
	 */
	async getGroupResultList({ openGid }) {
		const db = await dao();

		const relations = db.get('groupRelation').filter({ openGid }).value();

		return relations
			.map(({ openid }) => {
				const result = db.get('result').find({ openid }).value();
				if (result) {
					const { nickName, avatarUrl, rate, animalName, openid } = result;
					// openid为用户在微信的重要隐私数据，md5转一次，不直接暴露
					return { nickName, avatarUrl, rate, animalName, id: md5(openid) };
				}

				return null;
			})
			.filter(item => !!item)
			.sort((x, y) => y.rate - x.rate);
	},
};