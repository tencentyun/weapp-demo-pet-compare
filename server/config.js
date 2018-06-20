const argv = require('minimist')(process.argv.slice(2));

// `local`, `dev`, `test` or `production`
const ENV = argv.env || 'production';

module.exports = {
	// 本地配置，一般无需更改（除非机器上8888端口号已被占用）
	server: {
		host: '127.0.0.1',
		port: '8888',
		socketTimeout: 20 * 1000,
		env: ENV,
	},
	session: {
		name: 'demosid',
		secret: 'helloworld',
	},
	// 腾讯云账户配置
	qcloud: {
		// 注册后腾讯云账户后，可在 https://console.cloud.tencent.com/developer 找到对应账号 appid
		appId: '腾讯云账户appId，如: 123456789',

		// 需要去腾讯云控制台添加云api密钥，https://console.cloud.tencent.com/cam/capi
		// 申请后可看到对应密钥的 secretId 与 secretKey
		secretId: '云api密钥secretId',
		secretKey: '云api密钥secretKey',

		// 需要先去腾讯云控制台开通cos服务，https://console.cloud.tencent.com/cos/bucket
		// 创建一个bucket，填入bucket名称与地域英文（可在控制台bucket下，基础配置选项栏的访问域名中看到地域名称，如：https://wxapp-demo-1256646872.cos.{ap-guangzhou}.myqcloud.com 中的 ap-guangzhou）
		cos: {
			bucket: '你的bucket名称，如：wxapp-demo-123456789',
			region: 'bucket对应的地域英文，如：ap-guangzhou',
		}
	},
	// 小程序的配置
	// 申请小程序后，可在小程序后台 - 设置 - 开发设置 中找到您小程序对应的 appId 与 appSecret
	weapp: {
		appId: '小程序appId',
		appSecret: '小程序appSecret',
	},
};