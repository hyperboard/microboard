export default function createDebounceUpdater() {
	let shouldUpdate = false;

	function shouldUpd() {
		return shouldUpdate;
	}

	function setTimeoutUpdate(ms: number) {
		setTimeout(() => {
			shouldUpdate = true;
		}, ms);
	}

	function setFalse() {
		shouldUpdate = false;
	}

	return {
		shouldUpd,
		setTimeoutUpdate,
		setFalse,
	};
}
