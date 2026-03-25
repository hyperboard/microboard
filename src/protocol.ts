/**
 * Public protocol entrypoint for shared websocket and handshake contracts.
 *
 * Downstream packages should import runtime schemas, parse helpers, and inferred
 * transport types from `microboard/protocol` rather than from internal
 * `Events/MessageRouter/*` modules.
 */
export * from "./Events/MessageRouter/socketContract";
