import { BPMN_Gateway } from "./BPMN_Gateway";
import { BPMN_DataStore } from "./BPMN_DataStore";
import { BPMN_GatewayParallel } from "./BPMN_GatewayParallel";
import { BPMN_GatewayXOR } from "./BPMN_GatewayXOR";
import { BPMN_EndEvent } from "./BPMN_EndEvent";
import { BPMN_StartEvent } from "./BPMN_StartEvent";
import { BPMN_StartEventNoneInterrupting } from "./BPMN_StartEventNoneInterrupting";
import { BPMN_IntermediateEvent } from "./BPMN_IntermediateEvent";
import { BPMN_IntermediateEventNoneInterrupting } from "./BPMN_IntermediateEventNoneInterrupting";
import { BPMN_Group } from "./BPMN_Group";
import { BPMN_Participant } from "./BPMN_Participant";
import { BPMN_Task } from "./BPMN_Task";
import { BPMN_Transaction } from "./BPMN_Transaction";
import { BPMN_EventSubprocess } from "./BPMN_EventSubprocess";
import { BPMN_Annotation } from "./BPMN_Annotation";
import { BPMN_DataObject } from "./BPMN_DataObject";

export const BPMN = {
	BPMN_Gateway,
	BPMN_DataStore,
	BPMN_GatewayParallel,
	BPMN_GatewayXOR,
	BPMN_EndEvent,
	BPMN_StartEvent,
	BPMN_StartEventNoneInterrupting,
	BPMN_IntermediateEvent,
	BPMN_IntermediateEventNoneInterrupting,
	BPMN_Group,
	BPMN_Participant,
	BPMN_Task,
	BPMN_Transaction,
	BPMN_EventSubprocess,
	BPMN_Annotation,
	BPMN_DataObject,
} as const;

export type BPMN = keyof typeof BPMN;
