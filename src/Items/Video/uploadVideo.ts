import { Board } from 'Board';
import { conf } from 'Settings';
import { VideoItem } from './Video';
import { getVideoMetadata, prepareVideo, createVideoItem } from './VideoHelpers';

export function uploadVideo(
	file: File,
	board: Board,
	notify: NotifyFunction,
	extension: 'mp4' | 'webm',
	accessToken: string | null
) {
	getVideoMetadata(file)
		.then(dimension => {
			const onLoadCb = (videoItem: VideoItem) => {
				const notificationId = notify({
					variant: 'info',
					header: conf.i18n.t('toolsPanel.addMedia.loading'),
					body: '',
					duration: 100_000,
					loader: 'MediaLoader',
				});
				prepareVideo(file, accessToken, board.getBoardId())
					.then(urls => {
						videoItem.setVideoData(urls);
					})
					.catch(er => {
						board.remove(videoItem);
						console.error('Could not create video:', er);
					})
					.finally(() => conf.disMissNotification(notificationId));
			};
			createVideoItem(board, extension, { videoDimension: dimension }, onLoadCb);
		})
		.catch(er => {
			console.error('Could not create video:', er);
		});
}
