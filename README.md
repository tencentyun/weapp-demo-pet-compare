# weapp-demo-pet-compare
小程序官方课程配套demo -- 《萌宠撞脸大比拼》

## 前置准备流程

1. 申请小程序，[小程序官网地址](https://mp.weixin.qq.com/)。
1. 注册腾讯云账号，[腾讯云官网地址](https://cloud.tencent.com/login)。
2. 登录腾讯云控制台，[申请云 API 密钥](https://console.cloud.tencent.com/cam/capi)。
3. 访问控制台 - COS，[创建 Bucket](https://console.cloud.tencent.com/cos/bucket)。
4. 将相应配置填写到 `/server/config.js` 中。
5. 找几张人脸图片，放到 `/server/static/resources/faces/` 目录下，并将图片命名为 `{宠物名}-{人名}.jpg|png`，如：`比熊犬-亚瑟.jpg`(注意宠物名需要跟 `/server/static/resources/pets/` 中的一致)。

## 搭建服务端开发环境

1. DEMO中服务端基于 NodeJS ，首先需要安装 NodeJS，[官网链接](https://nodejs.org/en/download/)（请选择 NodeJs 8.0+ 以上的版本安装），详细的 NodeJs 环境搭建可参照 [《腾讯云开发者实验室 - 搭建 Node.js 环境》](https://cloud.tencent.com/developer/labs/lab/10040) 中的指引。
2. 命令行访问到 `/server/` 目录下，执行命令 `npm install` 安装依赖。
3. 全局安装 NodeJS 工具 Nodemon，可帮助在开发阶段保存自动重启， `npm install nodemon -g`。
3. 执行命令 `npm run local`，如果命令行看到输出 `Express server listening on port: 8888` 则代表服务启动成功。
4. 在浏览器中访问 `http://127.0.0.1:8888/` 来验证服务可否正常访问，若看到响应JSON `{"code":404,"msg":"Not Found"}`，说明服务访问正常。
5. 若人脸图片已准备好，调用一个初始化接口初始化图片库，`http://127.0.0.1:8888/api/init`。若出现错误，请检查您的配置是否正确。

初始化正常后，萌宠对比小程序的服务端一切就绪。