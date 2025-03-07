import * as path from "path";
import * as should from "should";
import { spy } from "sinon";
import { nodesets } from "node-opcua-nodesets";
import { getExtensionObjectConstructor } from "node-opcua-client-dynamic-extension-object";
import { resolveNodeId } from "node-opcua-nodeid";
import { BinaryStream } from "node-opcua-binary-stream";
import { DataType, Variant } from "node-opcua-variant";
//
import { AddressSpace, adjustNamespaceArray } from "..";
import { PseudoSession } from "..";
import { generateAddressSpace } from "../distNodeJS";

const describe = require("node-opcua-leak-detector").describeWithLeakDetector;
describe("Test Extension Object in pure 1.04 version (only DataTypeDefinition available)", () => {
    let addressSpace: AddressSpace;
    before(async () => {
        addressSpace = AddressSpace.create();
        await generateAddressSpace(addressSpace, [
            nodesets.standard,
            path.join(__dirname, "../test_helpers/test_fixtures/datatype_as_per_1.04.xml")
        ]);
        adjustNamespaceArray(addressSpace);
    });
    after(() => {
        addressSpace.dispose();
    });

    it("WY1- should exposed a custom DataType structure and be able to create an instance in addressSpace context", async () => {
        const nsA = addressSpace.getNamespaceIndex("http://A");
        const dataTypeNodeId = addressSpace.findDataType("MyStructure", nsA);
        should.exist(dataTypeNodeId);
        const o = addressSpace.constructExtensionObject(dataTypeNodeId!, {});
    });

    it("WY2- PseudoSession & getExtensionObjectConstructor ", async () => {
        const session = new PseudoSession(addressSpace);
        const browseSpy = spy(session, "browse");
        const browseNextSpy = spy(session, "browseNext");

        const dataTypeNodeId = resolveNodeId("ns=1;i=3001");
        const F = await getExtensionObjectConstructor(session, dataTypeNodeId);
        should.exist(F);
        F.should.be.a.Function;
        const o = new F({});
        console.log(o.toJSON());
        console.log("browseSpy =  ", browseSpy.callCount, "browseNextSpy =  ", browseNextSpy.callCount);
    });

    it("WY3- PseudoSession & getExtensionObjectConstructor with requestedMaxReferencesPerNode", async () => {
        const session = new PseudoSession(addressSpace);
        const browseSpy = spy(session, "browse");
        const browseNextSpy = spy(session, "browseNext");

        session.requestedMaxReferencesPerNode = 2;

        // console.log("§§§§§§§§§§§§§§§§§§§§§§§§§§§§§");

        const dataTypeNodeId = resolveNodeId("ns=1;i=3001");
        const F = await getExtensionObjectConstructor(session, dataTypeNodeId);
        should.exist(F);
        F.should.be.a.Function;
        const o = new F({});
        console.log(o.toJSON());
        console.log("browseSpy =  ", browseSpy.callCount, "browseNextSpy =  ", browseNextSpy.callCount);
    });

    it("WY4 - Extension Object with Matrix", () => {
        const nsA = addressSpace.getNamespaceIndex("http://A");
        const dataTypeNodeId = addressSpace.findDataType("MyStructureWithMatrix", nsA);
        should.exist(dataTypeNodeId);
        const o = addressSpace.constructExtensionObject(dataTypeNodeId!, {
            matrix: [
                [
                    [0, 0, 0, 0],
                    [0, 0, 0, 0],
                    [0, 0, 0, 0]
                ],
                [
                    [0, 0, 0, 0],
                    [0, 0, 0, 0],
                    [0, 0, 0, 0]
                ]
            ]
        });
        console.log(o.toString());

        const va = new Variant({ dataType: DataType.ExtensionObject, value: o });
        const stream = new BinaryStream(va.binaryStoreSize());
        o.encode(stream);

        const vb = new Variant();
        stream.rewind();
        vb.decode(stream);
    });
});

describe("Test Extension Object in pure 1.04 version - DataType deriving from DataType in namespace 0", () => {
    let addressSpace: AddressSpace;
    before(async () => {
        addressSpace = AddressSpace.create();
        await generateAddressSpace(addressSpace, [
            nodesets.standard,
            path.join(__dirname, "../test_helpers/test_fixtures/dataType_issue.xml")
        ]);
    });
    after(() => {
        addressSpace.dispose();
    });

    it("WZ1- should exposed a custom DataType structure and be able to create an instance in addressSpace context", async () => {
        const nsA = addressSpace.getNamespaceIndex("http://A");
        const dataTypeNodeId = addressSpace.findDataType("MyCustomDataType", nsA);
        should.exist(dataTypeNodeId);
        dataTypeNodeId!.nodeId.toString().should.eql("ns=1;i=3011");
        const o = addressSpace.constructExtensionObject(dataTypeNodeId!, {});
    });

    it("WZ2- PseudoSession & getExtensionObjectConstructor ", async () => {
        const session = new PseudoSession(addressSpace);
        const browseSpy = spy(session, "browse");
        const browseNextSpy = spy(session, "browseNext");

        const d = addressSpace.findDataType("MyCustomDataType");

        const dataTypeNodeId = resolveNodeId("ns=1;i=3011");
        const F = await getExtensionObjectConstructor(session, dataTypeNodeId);
        should.exist(F);
        F.should.be.a.Function;
        const o = new F({});
        console.log(o.toJSON());
        console.log("browseSpy =  ", browseSpy.callCount, "browseNextSpy =  ", browseNextSpy.callCount);
    });
});
