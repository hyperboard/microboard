import { isMacos } from 'isMacos';
import { SelectionContext } from 'Selection';
import type { Hotkey, HotkeyCb, HotkeyConfig, HotkeyName } from './types';

type HotkeyStatus =
	| 'triggered'
	| 'canceledBySingleItemOnly'
	| 'canceledBySelectionContext'
	| 'canceledByAllItemsType';

export function logHotkey(
	hotkeyConfig: HotkeyCb | HotkeyConfig,
	hotkeyName: HotkeyName,
	status: HotkeyStatus,
	context: SelectionContext
): void {
	// @ts-expect-error import.meta object didn't exists in common-js modules
	if (!import.meta.env.LOG_HOTKEYS) {
		return;
	}
	const isFunction = typeof hotkeyConfig === 'function';
	const hotkeyData = hotkeys[hotkeyName] as Hotkey;
	switch (status) {
		case 'triggered':
			console.groupCollapsed(
				`%cDebug%c Triggered hotkey%c ${hotkeyName}`,
				'color: #00f; font-size: 16px; display: inline-block; padding: 2px 5px; border-radius: 5px; background-color: #f0f0f0; margin-left: 8px',
				'font-size: 14px; display: inline-block; color: #808080; font-weight: 500;',
				'font-size: 14px; display: inline-block; color: #ffd800; font-weight: 700;'
			);
			break;
		case 'canceledBySingleItemOnly':
			console.groupCollapsed(
				`%cDebug%c Canceled hotkey%c ${hotkeyName}%c (more than one item selected)`,
				'color: #00f; font-size: 16px; display: inline-block; padding: 2px 5px; border-radius: 5px; background-color: #f0f0f0; margin-left: 8px',
				'font-size: 14px; display: inline-block; color: #808080; font-weight: 500;',
				'font-size: 14px; display: inline-block; color: #ffd800; font-weight: 700;',
				'color: #dc143c; font-size: 16px;'
			);
			break;
		case 'canceledBySelectionContext':
			if (!isFunction) {
				console.groupCollapsed(
					`%cDebug%c Canceled hotkey%c ${hotkeyName}%c (Needed context: ${hotkeyConfig.selectionContext?.join(
						', '
					)}, Current: ${context})`,
					'color: #00f; font-size: 16px; display: inline-block; padding: 2px 5px; border-radius: 5px; background-color: #f0f0f0; margin-left: 8px',
					'font-size: 14px; display: inline-block; color: #808080; font-weight: 500;',
					'font-size: 14px; display: inline-block; color: #ffd800; font-weight: 700;',
					'color: #dc143c; font-size: 16px;'
				);
			}
			break;
		case 'canceledByAllItemsType':
			if (!isFunction) {
				console.groupCollapsed(
					`%cDebug%c Canceled hotkey%c ${hotkeyName}%c (All items in selection should be: ${hotkeyConfig.allItemsType?.join(
						', '
					)})`,
					'color: #00f; font-size: 16px; display: inline-block; padding: 2px 5px; border-radius: 5px; background-color: #f0f0f0; margin-left: 8px',
					'font-size: 14px; display: inline-block; color: #808080; font-weight: 500;',
					'font-size: 14px; display: inline-block; color: #ffd800; font-weight: 700;',
					'color: #dc143c; font-size: 16px;'
				);
			}
	}
	console.group('%cHotkey data', 'color: #808080; font-size: 16px; font-weight: 400;');
	console.log(
		`%cKey:%c ${hotkeyData.key.button}\n%cNeeded modifier keys:\n%c  Ctrl:%c ${
			hotkeyData.key.ctrl ? 'true' : 'false'
		}\n%c  Alt:%c ${hotkeyData.key.alt ? 'true' : 'false'}\n%c  Shift:%c ${
			hotkeyData.key.shift ? 'true' : 'false'
		}
	`,
		'color: #808080; font-size: 16px;',
		'color: #ffd800; font-size: 16px; font-weight: 600;',
		'color: #808080; font-size: 16px;',
		'color: #ffd800; font-size: 16px;',
		`color: ${hotkeyData.key.ctrl ? '#4cbb17' : '#c80815'}; font-size: 16px; font-weight: 600;`,
		'color: #ffd800; font-size: 16px;',
		`color: ${hotkeyData.key.alt ? '#4cbb17' : '#c80815'}; font-size: 16px; font-weight: 600;`,
		'color: #ffd800; font-size: 16px;',
		`color: ${hotkeyData.key.shift ? '#4cbb17' : '#c80815'}; font-size: 16px; font-weight: 600;`
	);
	console.log(
		`%cLabels:\n%c  Windows:%c ${hotkeyData.label.windows} ${
			!isMacos() ? '(Current)' : ''
		}\n%c  MacOS:%c ${hotkeyData.label.mac} ${isMacos() ? '(Current)' : ''}
	`,
		'color: #808080; font-size: 16px;',
		'color: #3ec1f7; font-size: 16px;',
		'color: #ffd800; font-size: 16px; font-weight: 600;',
		'color: #e5e5e5; font-size: 16px;',
		'color: #ffd800; font-size: 16px; font-weight: 600;'
	);
	console.groupEnd();
	if (isFunction) {
		console.log(
			'%cConfig is not provided, no additional data to show',
			'color: #dc143c; font-size: 14px;'
		);
	} else {
		console.group('%cHotkey config', 'color: #808080; font-size: 16px; font-weight: 400;');
		console.log(
			`%cSelection context:%c ${
				hotkeyConfig.selectionContext?.join(', ') ?? 'Not provided'
			}\n%cPrevent default:%c ${
				hotkeyConfig.preventDefault ?? true ? 'true' : 'false'
			}\n%cSingle item only:%c ${
				hotkeyConfig.singleItemOnly ? 'true' : 'false'
			}\n%cSelected items of the type:%c ${
				hotkeyConfig.allItemsType?.join(', ') ?? 'Not provided'
			}`,
			'color: #808080; font-size: 16px;',
			'color: #ffd800; font-size: 16px; font-weight: 600;',
			'color: #808080; font-size: 16px;',
			`color: ${
				hotkeyConfig.preventDefault ?? true ? '#4cbb17' : '#c80815'
			}; font-size: 16px; font-weight: 600;`,
			'color: #808080; font-size: 16px;',
			`color: ${
				hotkeyConfig.singleItemOnly ? '#4cbb17' : '#c80815'
			}; font-size: 16px; font-weight: 600;`,
			'color: #808080; font-size: 16px;',
			'color: #ffd800; font-size: 16px; font-weight: 600;'
		);
		console.groupEnd();
	}
	console.groupEnd();
}
