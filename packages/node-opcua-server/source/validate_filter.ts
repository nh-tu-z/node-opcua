/**
 * @module node-opcua-server
 */
import { assert } from "node-opcua-assert";

import { BaseNode, UAVariable } from "node-opcua-address-space";
import { AttributeIds } from "node-opcua-data-model";
import { NodeClass } from "node-opcua-data-model";
import { ExtensionObject } from "node-opcua-extension-object";
import { NodeId, NodeIdType } from "node-opcua-nodeid";
import { DataChangeFilter, EventFilter } from "node-opcua-service-filter";
import { DeadbandType } from "node-opcua-service-subscription";
import { StatusCode, StatusCodes } from "node-opcua-status-code";
import { ReadValueIdOptions } from "node-opcua-types";
import { DataType } from "node-opcua-basic-types";

function isNumberDataType(node: UAVariable): boolean {
    if (node.dataType.namespace === 0 && node.dataType.identifierType === NodeIdType.NUMERIC && node.dataType.value < 22) {
        switch (node.dataType.identifierType === NodeIdType.NUMERIC && node.dataType.value) {
            case DataType.Float:
            case DataType.Double:
            case DataType.Byte:
            case DataType.SByte:
            case DataType.Int16:
            case DataType.Int32:
            case DataType.Int64:
            case DataType.UInt16:
            case DataType.UInt32:
            case DataType.UInt64:
                return true;
            default:
                return false;
        }
    }
    const dataType = node.addressSpace.findDataType(node.dataType)!;
    const dataTypeNumber = node.addressSpace.findDataType("Number")!;
    return dataType.isSupertypeOf(dataTypeNumber);
}

function __validateDataChangeFilter(filter: DataChangeFilter, itemToMonitor: ReadValueIdOptions, node: UAVariable): StatusCode {
    assert(itemToMonitor.attributeId === AttributeIds.Value);
    if (node.nodeClass !== NodeClass.Variable) {
        return StatusCodes.BadNodeIdInvalid;
    }

    if (filter.deadbandType !== DeadbandType.None) {
        // if node is not Numerical=> DataChangeFilter
        assert(node.dataType instanceof NodeId);
        if (!isNumberDataType(node)) {
            return StatusCodes.BadFilterNotAllowed;
        }
    }

    if (filter.deadbandType === DeadbandType.Percent) {
        if (filter.deadbandValue < 0 || filter.deadbandValue > 100) {
            return StatusCodes.BadDeadbandFilterInvalid;
        }

        // node must also have a valid euRange
        if (!(node as any).euRange) {
            // tslint:disable:no-console
            console.log(" node has no euRange ! Dead band Percent cannot be used on node " + node.nodeId.toString());
            return StatusCodes.BadMonitoredItemFilterUnsupported;
        }
    }
    return StatusCodes.Good;
}

export function validateFilter(filter: ExtensionObject | null, itemToMonitor: ReadValueIdOptions, node: BaseNode): StatusCode {
    // handle filter information
    if (filter && filter instanceof EventFilter && itemToMonitor.attributeId !== AttributeIds.EventNotifier) {
        // invalid filter on Event
        return StatusCodes.BadFilterNotAllowed;
    }

    if (filter && filter instanceof DataChangeFilter && itemToMonitor.attributeId !== AttributeIds.Value) {
        // invalid DataChange filter on non Value Attribute
        return StatusCodes.BadFilterNotAllowed;
    }

    if (filter && itemToMonitor.attributeId !== AttributeIds.EventNotifier && itemToMonitor.attributeId !== AttributeIds.Value) {
        return StatusCodes.BadFilterNotAllowed;
    }

    if (filter instanceof DataChangeFilter) {
        return __validateDataChangeFilter(filter, itemToMonitor, node as UAVariable);
    }

    return StatusCodes.Good;
}
