// eslint-disable-next-line unicorn/filename-case
declare module "rbush-knn" {
	import RBush from "rbush";
	function knn<Item>(
		rbush: RBush<Item>,
		x: number,
		y: number,
		maxItems: number,
		filter: (item: Item) => boolean,
		maxDistance: number,
	): Item[];
	export = knn;
}
