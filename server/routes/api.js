const imageModel = require('../models/image');
const FormParser = require('../libs/multi-form-data-parser');
const cos = require('../libs/cos');
const fs = require('fs');
const path = require('path');
const { qcloud: qcloudConfig, weapp: weappConfig } = require('../config');
const pify = require('pify');
const readDir = pify(fs.readdir);
const localModel = require('../models/local');
const md5 = require('md5');
const wxModel = require('../models/wx');
const WXBizDataCrypt = require('../libs/WXBizDataCrypt');
const config = require('../config');
const readChunk = require('read-chunk');
const fileType = require('file-type');

/**
 * 检验登陆，通过判断session中是否有wx_userInfo，如果没有则销毁session并清除cookie
 * @param req
 * @param res
 */
function checkLogin(req, res) {
	if (!req.session.wx_userInfo) {
		logout(req, res);
		throw { code: 'NOT-LOGIN' };
	}
}

function logout(req, res) {
	req.session.destroy();
	res.clearCookie(config.session.name);
}

/**
 * 解密微信的加密数据，返回openGid
 * @param req
 * @param res
 */
function decryptWxData(req, res) {
	const { encryptedData, iv } = req.body;

	try {
		checkLogin(req, res);

		const { session_key } = req.session.wx_userInfo;

		const { openGId } = new WXBizDataCrypt(weappConfig.appId, session_key).decryptData(encryptedData, iv);

		return openGId;
	} catch (err) {
		const { message, stack } = err;
		// 解密失败，说明该session_key可能已经过期，需要重新登陆
		console.error(`Decrypt data fail, maybe session expired, crypt info => ${JSON.stringify({
			encryptedData,
			iv,
			session_key: req.session.wx_userInfo.session_key,
		})}, STACK => ${JSON.stringify({ message, stack })}`);
		logout(req, res);
		throw { code: 'NOT-LOGIN' };
	}
}

/**
 * 进行人脸比较
 * @param req
 * @param res
 * @return {Promise.<void>}
 */
async function compare(req, res) {
	try {
		checkLogin(req, res);

		// 解析 multipart 请求实体
		const { files, fields } = await FormParser(req);

		let { userInfo } = fields;

		try {
			userInfo = JSON.parse(userInfo);
		} catch (err) {
			userInfo = null;
		}

		if (!userInfo) {
			throw { code: 400, msg: '参数错误，缺少UserInfo' };
		}

		console.log(`Receive userInfo => ${JSON.stringify(userInfo)}`);

		if (!files.image) {
			throw { code: 400, msg: '参数错误，缺少图片image' };
		}

		const imageFile = files.image[0];

		// 解析真实文件类型
		const buffer = await readChunk(imageFile.path, 0, 262);
		const resultType = fileType(buffer);

		if (!resultType || !['image/jpeg', 'image/jpg', 'image/png'].includes(resultType.mime)) {
			fs.unlink(imageFile.path);
			return this.send(-1, '仅支持 jpg/png 格式');
		}

		const extName = path.extname(imageFile.originalFilename);
		const timestamp = Date.now();
		const nonce = Math.floor(Math.random() * 99999);
		const fileName = `${timestamp}_${nonce}${extName}`;

		// 上传到cos
		let imgUrl = await cos.upload(fs.createReadStream(imageFile.path), fileName);

		let imgValid = true;

		try {
			const nonePornImg = await imageModel.pornDetect(imgUrl);

			if (!nonePornImg) {
				imgValid = false;
			}
		} catch (err) {
			console.error(err);
		}

		if (imgValid) {
			const data = {};

			try {
				const [compareResult, detectResult] = await Promise.all([
					imageModel.compare(imgUrl),
					imageModel.faceDetect(imgUrl),
				]);

				const { x, y, height, width } = detectResult.face[0];

				Object.assign(data, {
					url: imgUrl,
					faceInfo: { x, y, height, width },
				}, compareResult);
			} catch (err) {
				if (err && err.code) {
					throw { code: err.code, msg: '人脸检测失败，请上传本人照片' };
				}

				throw err;
			}

			const { openid } = req.session.wx_userInfo;
			const { nickName, avatarUrl } = userInfo;
			await localModel.saveResult({
				openid,
				nickName,
				avatarUrl,
				rate: data.confidence,
				animalName: data.personName,
			});

			res.$jsonp({
				code: 0,
				data,
			});
		} else {
			cos.delete(fileName);
			throw { code: -1, msg: '图⽚包含敏感信息，请上传本人照片' };
		}
	} catch (err) {
		res.$jsonp(err);
	}
}

/**
 * 测试session有效性
 * @param req
 * @param res
 * @return {Promise.<void>}
 */
async function testSession(req, res) {
	try {
		checkLogin(req, res);
	} catch (err) {}
	res.$jsonp({ code: 0, data: req.session });
}

/**
 * 登陆
 *
 * 通过小程序code去微信接口换session_key与openid，然后存入session
 * @param req
 * @param res
 * @return {Promise.<void>}
 */
async function login(req, res) {
	try {
		const { code } = req.body;

		const { session_key, openid } = await wxModel.jscode2session(code);

		req.session.wx_userInfo = {
			session_key,
			openid,
		};

		res.$jsonp({ code: 0 });
	} catch (err) {
		res.$jsonp(err);
	}
}

/**
 * 将用户添加到某个群
 * @param req
 * @param res
 * @return {Promise.<*>}
 */
async function addUser2Group(req, res) {
	try {
		checkLogin(req, res);
		const { openid } = req.session.wx_userInfo;

		const openGid = decryptWxData(req, res);

		if (openGid) {
			await localModel.addUser2Group({ openid, openGid });
		}

		return res.$jsonp({ code: 0 });
	} catch (err) {
		res.$jsonp(err);
	}
}

/**
 * 获取某个群的玩过的用户的数据
 * @param req
 * @param res
 * @return {Promise.<void>}
 */
async function getGroupRanking(req, res) {
	try {
		checkLogin(req, res);

		const { openid } = req.session.wx_userInfo;

		const openGid = decryptWxData(req, res);

		// 刚从群分享中点开小程序，第一次查询时用户可能还没玩过，此时先添加用户到该微信群中
		if (openGid) {
			try {
				await localModel.addUser2Group({ openid, openGid });
			} catch (err) {
				// 非关键路径，报错不阻塞
				console.warn(`addUser2Group error`, err);
			}
		}

		const list = await localModel.getGroupResultList({ openGid });

		// 保护openid，进行一次md5处理
		res.$jsonp({ code: 0, data: { list, currentId: md5(openid) } });
	} catch (err) {
		res.$jsonp(err);
	}
}

/**
 * 初始化图片库
 *
 * 我们先要去智能图像为每个宠物添加个体与人脸，
 * 由于智能图像无法直接用宠物头像添加人脸，所以我们需要通过真实的人脸做中转，关联关系：
 * 用户人脸 -> 匹配宠物关联的人脸 -> 对应宠物
 *
 * 具体步骤如下：
 *
 * 1. 宠物图片已经统一放置在 /server/static/resources/pets/ 目录下；
 * 2. 将收集的人脸放置于 /server/static/resources/faces/ 目录下，并命名为 `{宠物名}-{人名}.jpg|png` 的格式，如: `比熊犬-亚瑟.jpg`，注意宠物名必须与宠物图片名称一致；
 * 3.  将对应的人脸 - 宠物 图片都上传到cos
 * 4. 那人脸的 COS 地址去智能图像添加个人与人脸
 * 5. db 存入该人脸与宠物的对应关系
 *
 * @param req
 * @param res
 * @return {Promise.<void>}
 */
async function init(req, res) {
	const result = [];
	try {
		const faceDirPath = path.resolve(__dirname, `../static/resources/faces`);
		const animalDirPath = path.resolve(__dirname, `../static/resources/pets`);

		const [faceDir, animalDir] = await Promise.all([
			readDir(faceDirPath),
			readDir(animalDirPath),
		]);

		for (let i = 0, l = faceDir.length; i < l; i++) {
			const fileName = faceDir[i];

			const [animalName] = fileName.split('.')[0].split('-');

			const animalFileName = animalDir.find(imgName => imgName === `${animalName}.jpg`);

			const faceFilePath = path.resolve(faceDirPath, fileName);
			const animalFilePath = path.resolve(animalDirPath, animalFileName);

			const [faceImgUrl, animalImgUrl] = await Promise.all([
				cos.upload(fs.createReadStream(faceFilePath), fileName),
				cos.upload(fs.createReadStream(animalFilePath), animalFileName),
			]);

			const personId = md5(fileName);

			try {
				const resp = await imageModel.addPerson({
					personId,
					personName: animalName,
					groupId: 'resources',
					url: faceImgUrl,
					animalImgUrl,
				});
				result.push(resp);
			} catch (err) {
				console.error('add fail', err);
				result.push(err);
			}
		}

		res.$jsonp({ result });
	} catch (err) {
		res.$jsonp(err);
	}
}

module.exports = router => {
	router.all('/testSession', testSession);
	router.post('/compare', compare);
	router.get('/init', init);
	router.post('/login', login);
	router.post('/addUser2Group', addUser2Group);
	router.post('/getGroupRanking', getGroupRanking);
};