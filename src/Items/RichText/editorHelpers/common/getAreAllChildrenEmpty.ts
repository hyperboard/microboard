import { BlockNode } from '../../Editor/BlockNode.js';
import {TextNode} from "../../Editor/TextNode";

export function getAreAllChildrenEmpty(node: BlockNode | TextNode): boolean {
  if ('text' in node) {
    return !(node as any).text;
  }
  if ('children' in node) {
    return (node as any).children.every(child => getAreAllChildrenEmpty(child));
  }
  return false;
}
