const wxapi = require('./wxapi');

// 把 [x, y, width, height] 转为 { x, y, width, height }
const normalizeImageInfo = any => {
	if (any && any.splice) {
		const [x, y, width, height] = any;
		return { x, y, width, height };
	}

	return any;
};

module.exports = {
	/**
	 * 将图片居中绘制到画布指定区域（目前仅支持方形）
	 *
	 * @param ctx
	 * @param imgUrl
	 * @param srcInfo 原始图片信息，包含x,y,width,height
	 * @param targetInfo 需要绘制到画布位置信息, x,y,width,height
	 * @param autoDraw 是否最后调用 ctx.draw()，默认为 false
	 * @param isRemote 是否远程图片，如果是，会先downloadFile
	 * @return {Promise.<void>}
	 */
	drawImage({
		ctx,
		imgUrl,
		srcInfo,
		targetInfo,
		autoDraw = true,
		isRemote = false,
	}) {
		let { x: dx = 0, y: dy = 0, width: dWidth, height: dHeight } = normalizeImageInfo(targetInfo);

		if (dWidth !== dHeight) {
			throw new Error('仅支持方形绘制区');
		}

		return (isRemote ? wxapi.downloadFile(imgUrl) : Promise.resolve(imgUrl))
			.then(imgUrl => wxapi.getImageInfo(imgUrl))
			.then(({ height, width, orientation }) => {
				let specificSrcInfo = false;
				let needScale = false;

				// 没特殊指定，则取全图
				if (!srcInfo) {
					srcInfo = {
						x: 0,
						y: 0,
						height,
						width,
					};
				} else {
					specificSrcInfo = true;
				}

				let { x: sx, y: sy, width: sWidth, height: sHeight } = normalizeImageInfo(srcInfo);

				let centerOffset = 0;
				let rotate = 0;

				// 非朝上的图片，需要旋转
				if (orientation !== 'up' && orientation !== 'up-mirrored') {
					centerOffset = dWidth / 2;

					// 坐标原点从左上角移到图片中心
					ctx.translate(centerOffset, centerOffset);

					// up	默认
					// down	180度旋转
					// left	逆时针旋转90度
					// right	顺时针旋转90度
					// up-mirrored	同up，但水平翻转
					// down-mirrored	同down，但水平翻转
					// left-mirrored	同left，但垂直翻转
					// right-mirrored 同right，但垂直翻转
					switch (orientation) {
						case 'left':
						case 'left-mirrored':
							rotate = 90 * Math.PI / 180;
							break;
						case 'down':
						case 'down-mirrored':
							rotate = 90 * 2 * Math.PI / 180;
							break;
						case 'right':
						case 'right-mirrored':
							rotate = 90 * 3 * Math.PI / 180;
							break;
					}

					if (rotate) {
						ctx.rotate(rotate);
					}
				}

				if (specificSrcInfo && (sWidth * sHeight) / (width * height) >= .1) {
					needScale = false;
					specificSrcInfo = false;
					sx = 0;
					sy = 0;
					sWidth = width;
					sHeight = height;
				} else {
					needScale = true;
				}

				const drawParams = this.calculateImgPosition(imgUrl, -centerOffset, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);

				{
					let [src, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight] = drawParams;

					if (!needScale) {
						ctx.drawImage(imgUrl, dx, dy, dWidth, dHeight);
					} else {
						const scaleRate = 2;

						// 扩大脸部区域
						if (specificSrcInfo) {
							sx = Math.round(sx - sWidth * (scaleRate - 1) / 2);
							sy = Math.round(sy - sHeight * (scaleRate - 1) / 2);
							sWidth = Math.round(sWidth * scaleRate);
							sHeight = Math.round(sHeight * scaleRate);
						}

						// 注意，该方法目前在安卓客户端下有bug
						ctx.drawImage(src, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
					}

					if (autoDraw) {
						ctx.draw();
					}

					if (rotate) {
						ctx.rotate(-rotate);
					}

					if (centerOffset) {
						ctx.translate(-centerOffset, -centerOffset);
					}
				}
			});
	},

	/**
	 * 对非正方形图片做处理，使其始终居中展示
	 * @param src
	 * @param offset
	 * @param sx
	 * @param sy
	 * @param sWidth
	 * @param sHeight
	 * @param dx
	 * @param dy
	 * @param dWidth
	 * @param dHeight
	 */
	calculateImgPosition(src, offset, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight) {
		if (sWidth > sHeight) {
			const relativeHeight = sHeight * dWidth / sWidth;

			const offsetY = (dHeight - relativeHeight) / 2;

			return [src, sx, sy, sWidth, sHeight, dx + offset, dy + offsetY + offset, dWidth, relativeHeight];
		} else if (sHeight > sWidth) {
			const relativeWidth = sWidth * dHeight / sHeight;

			const offsetX = (dWidth - relativeWidth) / 2;

			return [src, sx, sy, sWidth, sHeight, dx + offset + offsetX, dy + offset, relativeWidth, dHeight];
		} else {
			return [src, sx, sy, sWidth, sHeight, dx + offset, dy + offset, dWidth, dHeight];
		}
	}
};