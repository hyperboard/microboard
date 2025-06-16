import { DocumentFactory } from "./DocumentFactory";

export class MockDocumentFactory implements DocumentFactory {
  private logPreInitializationCall(methodName: string) {
    console.warn(
      `WARNING: DocumentFactory.${methodName} was called before initialization.`,
      `\nPlease make sure to initialize DocumentFactory properly before using it.`,
      `\nThe application will continue but may not work as expected.`
    );
    console.trace(`Stack trace for DocumentFactory.${methodName} call:`);
  }

  createElement(tagName: string): HTMLElement {
    this.logPreInitializationCall("createElement");
    return {} as HTMLElement;
  }

  createElementNS(namespace: string, tagName: string): Element {
    this.logPreInitializationCall("createElementNS");
    return {} as Element;
  }

  caretPositionFromPoint(
    x: number,
    y: number,
    options?: CaretPositionFromPointOptions
  ): CaretPosition | null {
    this.logPreInitializationCall("caretPositionFromPoint");
    return null;
  }

  caretRangeFromPoint(x: number, y: number): Range | null {
    this.logPreInitializationCall("caretRangeFromPoint");
    return null;
  }
}
