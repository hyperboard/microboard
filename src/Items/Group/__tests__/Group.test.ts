import { Board } from "../../../Board";
import { Group } from "../Group";
import { Point, Mbr } from "../../index";
import { BaseItem } from "../../BaseItem/BaseItem";
import { GroupCommand } from "../GroupCommand";
import { GroupOperation } from "../GroupOperation";

describe("Group", () => {
	let board: Board;
	let group: Group;
	let child1: BaseItem;
	let child2: BaseItem;

	beforeEach(() => {
		board = {
			events: {
				emit: jest.fn(),
			},
			items: {
				getById: jest.fn(),
				index: {
					remove: jest.fn(),
					insert: jest.fn(),
				},
			},
			camera: {},
			pointer: {},
		} as any;

		child1 = new BaseItem(board, "child1");
		child1.left = 10; child1.top = 10; child1.right = 20; child1.bottom = 20;
		child2 = new BaseItem(board, "child2");
		child2.left = 30; child2.top = 30; child2.right = 40; child2.bottom = 40;

		(board.items.getById as jest.Mock).mockImplementation((id) => {
			if (id === "child1") return child1;
			if (id === "child2") return child2;
			return null;
		});

		group = new Group(board, board.events as any, [], "group1");
	});

	it("should correctly calculate MBR from children", () => {
		group.applyAddChildren(["child1", "child2"]);
		const mbr = group.getMbr();
		expect(mbr.left).toBe(10);
		expect(mbr.top).toBe(10);
		expect(mbr.right).toBe(40);
		expect(mbr.bottom).toBe(40);
	});

	it("should update children IDs when items are added", () => {
		group.applyAddChildren(["child1"]);
		expect(group.getChildrenIds()).toContain("child1");
		expect(child1.parent).toBe(group.getId());
	});

	it("should update children IDs when items are removed", () => {
		group.applyAddChildren(["child1", "child2"]);
		group.applyRemoveChildren(["child1"]);
		expect(group.getChildrenIds()).not.toContain("child1");
		expect(group.getChildrenIds()).toContain("child2");
		expect(child1.parent).toBe("Board");
	});

	describe("GroupCommand", () => {
		it("should reverse addChildren operation correctly", () => {
			const op: GroupOperation = {
				class: "Group",
				method: "addChildren",
				item: ["group1"],
				newData: { childIds: ["child1"] },
			};
			const command = new GroupCommand([group], op);
			
			const reverse = command.getReverse();
			expect(reverse[0].operation.method).toBe("removeChildren");
			expect(reverse[0].item).toBe(group);
		});

		it("should reverse removeChildren operation correctly", () => {
			const op: GroupOperation = {
				class: "Group",
				method: "removeChildren",
				item: ["group1"],
				newData: { childIds: ["child1"] },
			};
			const command = new GroupCommand([group], op);
			
			const reverse = command.getReverse();
			expect(reverse[0].operation.method).toBe("addChildren");
			expect(reverse[0].item).toBe(group);
		});

		it("should reverse singular addChild correctly (Fixing original bug)", () => {
			const op: GroupOperation = {
				class: "Group",
				method: "addChild",
				item: ["group1"],
				childId: "child1",
			};
			const command = new GroupCommand([group], op);
			
			const reverse = command.getReverse();
			expect(reverse[0].operation.method).toBe("removeChild");
			// @ts-ignore
			expect(reverse[0].operation.childId).toBe("child1");
		});
	});
});
