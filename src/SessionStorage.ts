import { ShapeData } from 'Items';
import { ConnectorLineStyle } from 'Items/Connector';
import { ConnectionLineWidth } from 'Items/Connector/Connector';
import { ConnectorEdge } from 'Items/Connector/Pointers';
import { ConnectorPointerStyle } from 'Items/Connector/Pointers/Pointers';
import { BorderStyle } from 'Items/Path';
import { TextStyle } from 'Items/RichText';
import { StickerData } from 'Items/Sticker/StickerOperation';

// Create a node-safe storage: use sessionStorage if available, otherwise a polyfill.
let _sessionStorage: Storage;

if (typeof window !== 'undefined' && window.sessionStorage) {
	_sessionStorage = window.sessionStorage;
} else {
	class NodeStoragePolyfill implements Storage {
		private _store: Record<string, string> = {};

		clear(): void {
			this._store = {};
		}

		getItem(key: string): string | null {
			return Object.prototype.hasOwnProperty.call(this._store, key) ? this._store[key] : null;
		}

		key(index: number): string | null {
			const keys = Object.keys(this._store);
			return keys[index] ?? null;
		}

		removeItem(key: string): void {
			delete this._store[key];
		}

		setItem(key: string, value: string): void {
			this._store[key] = value;
		}

		get length(): number {
			return Object.keys(this._store).length;
		}
	}

	_sessionStorage = new NodeStoragePolyfill();
}

export class SessionStorage {
	private set<T>(key: string, value: T): void {
		const boardId = this.getBoardId() || '';
		_sessionStorage.setItem(boardId + '_' + key, JSON.stringify(value));
	}

	private get<T>(key: string): T | undefined {
		const boardId = this.getBoardId() || '';
		const item = _sessionStorage.getItem(boardId + '_' + key);
		if (!item) {
			return;
		}
		return JSON.parse(item) as T;
	}

	remove(key: string): void {
		const boardId = this.getBoardId() || '';
		_sessionStorage.removeItem(boardId + '_' + key);
	}

	setConnectorStrokeStyle(color: BorderStyle): void {
		this.set(`connectorStrokeStyle`, color);
	}

	getConnectorStrokeStyle(): BorderStyle | undefined {
		return this.get('connectorStrokeStyle');
	}

	setConnectorLineWidth(width: number): void {
		this.set(`connectorLineWidth`, width);
	}

	getConnectorLineWidth(): ConnectionLineWidth | undefined {
		return this.get('connectorLineWidth');
	}

	setConnectorFillColor(color: string): void {
		this.set(`connectorFillColor`, color);
	}

	getConnectorFillColor(): string | undefined {
		return this.get('connectorFillColor');
	}

	setConnectorPointer(type: ConnectorPointerStyle, edge: ConnectorEdge): void {
		this.set(`connector${edge.charAt(0).toUpperCase() + edge.slice(1)}Pointer`, type);
	}

	getConnectorPointer(edge: ConnectorEdge): ConnectorPointerStyle | undefined {
		return this.get<ConnectorPointerStyle>(
			`connector${edge.charAt(0).toUpperCase() + edge.slice(1)}Pointer`
		);
	}

	setConnectorLineStyle(type: ConnectorLineStyle): void {
		this.set('connectorLineStyle', type);
	}

	getConnectorLineStyle(): ConnectorLineStyle | undefined {
		return this.get<ConnectorLineStyle>('connectorLineStyle');
	}

	setShapeData(data: Partial<ShapeData>): void {
		this.set('lastShapeData', data);
	}

	getShapeData(): ShapeData | undefined {
		return this.get<ShapeData>('lastShapeData');
	}

	setStickerData(data: Partial<StickerData>): void {
		this.set('lastSticker', data);
	}

	getStickerData(): StickerData | undefined {
		return this.get<StickerData>('lastSticker');
	}

	setShapeWidth(width: number): void {
		this.set('shapeWidth', width);
	}

	getShapeWidth(): number | undefined {
		return this.get<number>('shapeWidth');
	}

	setShapeHeight(height: number): void {
		this.set('shapeHeight', height);
	}

	getShapeHeight(): number | undefined {
		return this.get<number>('shapeHeight');
	}

	setImageDimensions(dimension: { width: number; height: number }): void {
		this.set('imageDimensions', dimension);
	}

	getImageDimensions(): { width: number; height: number } | undefined {
		return this.get<{ width: number; height: number }>('imageDimensions');
	}

	setFontSize(itemType: string, size: number | 'auto'): void {
		this.set(`fontSize_${itemType}`, size);
	}

	getFontSize(itemType: string): number | 'auto' | undefined {
		return this.get<number | 'auto'>(`fontSize_${itemType}`);
	}

	setFontStyles(itemType: string, styles: TextStyle[]): void {
		this.set(`fontStyles_${itemType}`, styles);
	}

	getFontStyles(itemType: string): TextStyle[] | undefined {
		return this.get<TextStyle[]>(`fontStyles_${itemType}`);
	}

	setFontColor(itemType: string, color: string): void {
		this.set(`fontColor_${itemType}`, color);
	}

	getFontColor(itemType: string): string | undefined {
		return this.get<string>(`fontColor_${itemType}`);
	}

	setFontHighlight(itemType: string, highlightColor: string): void {
		this.set(`fontHighlightColor_${itemType}`, highlightColor);
	}

	getFontHighlight(itemType: string): string | undefined {
		return this.get<string>(`fontHighlightColor_${itemType}`);
	}

	setHorizontalAlignment(
		itemType: string,
		horizontalAlignment: 'left' | 'center' | 'right'
	): void {
		this.set(`fontHorizontalAlignment_${itemType}`, horizontalAlignment);
	}

	getHorizontalAlignment(itemType: string): 'left' | 'center' | 'right' | undefined {
		return this.get<'left' | 'center' | 'right'>(`fontHorizontalAlignment_${itemType}`);
	}

	setVerticalAlignment(itemType: string, verticalAlignment: 'top' | 'center' | 'bottom'): void {
		this.set(`fontVerticalAlignment_${itemType}`, verticalAlignment);
	}

	getVerticalAlignment(itemType: string): 'top' | 'center' | 'bottom' | undefined {
		return this.get<'top' | 'center' | 'bottom'>(`fontVerticalAlignment_${itemType}`);
	}

	setLastAIRequest(request: string): void {
		_sessionStorage.setItem('lastAIRequest', request);
	}

	getLastAIRequest(): string | null {
		return _sessionStorage.getItem('lastAIRequest');
	}

	removeLastAIRequest(): void {
		_sessionStorage.removeItem('lastAIRequest');
	}

	clear(): void {
		_sessionStorage.clear();
	}

	private getBoardId(): string | undefined {
		// In a Node environment, window is undefined so we return undefined.
		if (typeof window === 'undefined') {
			return undefined;
		}
		return window.location.href.split('/').pop()?.split('?')[0];
	}
}

export const tempStorage = new SessionStorage();
