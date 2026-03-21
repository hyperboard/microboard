import { BlockNode } from '../../Editor/BlockNode';
import {TextNode} from "../../Editor/TextNode";

export function getAreAllChildrenEmpty(node: BlockNode | TextNode): boolean {
  if ('text' in node) {
    return (node as any).text === "";
  }
  if ('children' in node) {
    return (node as any).children.every((child: any) => getAreAllChildrenEmpty(child));
  }
  return false;
}
