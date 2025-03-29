import { DocumentType } from "@h2c/common";
import { AppErrorV2, AppLogger, RequestMetaData } from "@uxp/bff-common";
import { FastifyRequest } from "fastify";
import { QueryRunner } from "typeorm";
import { WebSocket } from "ws";
import * as Y from "yjs";
import { DocumentEntity } from "../db/entities/DocumentEntity";
import { SnapshotEntity } from "../db/entities/DSnapshotEntity";
import { H2CAppServerWebSocketManager } from "../ws/H2CAppServerWebSocketManager";

export class DocumentService {
    private queryRunner: QueryRunner;
    private requestMeta: RequestMetaData;
    private wsManager = H2CAppServerWebSocketManager.getInstance();
    constructor(requestMeta: FastifyRequest | RequestMetaData, queryRunner: QueryRunner) {
        this.queryRunner = queryRunner;
        this.requestMeta = AppLogger.extractMetadata(requestMeta, true)!;
    }


    /**
     * Creates a new document with a generated documentId.
     * @param documentType The type of document being created.
     * @returns The created document entity.
     */
    async createDocument(documentType: DocumentType, name?: string): Promise<DocumentEntity> {
        const docRepo = this.queryRunner.manager.getRepository(DocumentEntity);
        return docRepo.save(new DocumentEntity({
            documentType, name
        }));
    }

    async subscribeToDocument(socket: WebSocket, documentId: string, asyncId: string | undefined) {
        this.wsManager.subscribeToDocument(socket, documentId);

        const getFullDocument = await this.getFullDocument(documentId)
        AppLogger.debug(this.requestMeta, { message: getFullDocument.document.get("content").toString() });
        this.wsManager.sendBinaryData(socket, {
            action: "document:full", success: true, id: asyncId,
            payload: {
                documentId,
                type: getFullDocument.documentType,
            }
        }, Y.encodeStateAsUpdate(getFullDocument.document), this.requestMeta);
    }

    async unsubscribeFromDocument(socket: WebSocket, documentId: string, asyncId: string | undefined) {
        this.wsManager.unsubscribeFromDocument(socket, documentId);
        if (asyncId) {
            this.wsManager.sendMessage(socket, {
                action: "document:unsubscribed", success: true, id: asyncId,
                payload: { documentId }
            }, this.requestMeta);
        }

    }

    async updateDocument(socket: WebSocket, documentId: string, update: Uint8Array) {

        const snapshotRepo = this.queryRunner.manager.getRepository(SnapshotEntity);

        await snapshotRepo.save(snapshotRepo.create({ documentId, update: Buffer.from(update) }));

        this.wsManager.broadcastDocumentUpdate({ updater: socket, documentId, update, requestMeta: this.requestMeta });

    }
    async saveDocument(documentId: string, asyncId: string | undefined) {

        const documentRepo = this.queryRunner.manager.getRepository(DocumentEntity);
        const snapshotRepo = this.queryRunner.manager.getRepository(SnapshotEntity);
        const fullDocument = await this.getFullDocument(documentId);

        //const yXmlFragment = fullDocument.document.getXmlFragment("default");
        //const xmlContent = yXmlFragment.toArray().map(node => node.toString()).join("");
        //const xmlContent =yXmlFragment.toDOM()
        const newDocument = documentRepo.create({
            documentId,
            content: Buffer.from(Y.encodeStateAsUpdate(fullDocument.document)),
            documentType: fullDocument.documentType
        });
        await documentRepo.save(newDocument);
        await snapshotRepo.delete({ documentId });

        this.wsManager.broadcastDocumentSave({ documentId, requestMeta: this.requestMeta, id: asyncId });

    }

    async getFullDocument(documentId: string) {
        const documentRepo = this.queryRunner.manager.getRepository(DocumentEntity);
        const snapshotRepo = this.queryRunner.manager.getRepository(SnapshotEntity);

        const latestDoc = await documentRepo.findOne({
            where: { documentId },
            order: { id: "DESC" },
        });


        if (!latestDoc) {
            throw new AppErrorV2({ statusCode: 404, code: "NOT_FOUND", message: `Document not found by id ${documentId}` });

        }

        const baseDoc = new Y.Doc();
        const yXmlFragment = baseDoc.getXmlFragment("default");
        // if (yXmlFragment.length === 0) {
        //   yXmlFragment.insert(0, [new Y.XmlElement("root")]);
        //}
        //yXmlFragment.delete(0, yXmlFragment.length);
        //const parser = new DOMParser();
        //const xmlDoc = parser.parseFromString(`<root>${latestDoc.content}</root>`, "text/xml");

        //for (let i = 0; i < xmlDoc.documentElement.childNodes.length; i++) {
        // console.log(xmlDoc.documentElement.childNodes[i].nodeType,(xmlDoc.documentElement.childNodes[i] as any).tagName)
        //  this.travelHtmlToYjs(yXmlFragment, xmlDoc.documentElement.childNodes[i]);
        //}

        //const stateV=Y.encodeStateVector(baseDoc)
        //const yDoc = new Y.Doc();
        //Y.applyUpdate(yDoc, Y.encodeStateAsUpdate(baseDoc));
        if (latestDoc.content) {
            Y.applyUpdate(baseDoc, new Uint8Array(latestDoc.content));
        }

        //const baseState=Y.encodeStateAsUpdate(yDoc, stateV)
        //Y.applyUpdate(yDoc, baseState);
        //const baseState = Y.encodeStateAsUpdate(baseDoc);

        //console.log(`🔹 baseState:`,JSON.stringify( Y.decodeUpdate(new Uint8Array(baseState))));
        const snapshots = await snapshotRepo.find({ where: { documentId }, order: { id: "ASC" } });

        //snapshots.forEach(snapshot => Y.applyUpdate(baseDoc,new Uint8Array(snapshot.update)))
        //const mergedUpdate = Y.mergeUpdates([baseState,...snapshots.map(snapshot => new Uint8Array(snapshot.update))]);
        //const yDoc = new Y.Doc();
        //Y.applyUpdate(yDoc, mergedUpdate);
        //const updates = new Y.Doc();
        //Y.applyUpdate(yDoc, mergedUpdate);
        //Y.applyUpdate(yDoc, mergedUpdate);
        //const stateVector2=Y.encodeStateVector(updates);
        //const diff1 = Y.encodeStateAsUpdate(baseDoc, stateVector2)
        for (const snapshot of snapshots) {
            console.log(`🔹 Snapshot:`, JSON.stringify(Y.decodeUpdate(new Uint8Array(snapshot.update))));

            Y.applyUpdate(baseDoc, new Uint8Array(snapshot.update));
        }
        //const baseState = Y.encodeStateAsUpdate(baseDoc);

        //console.log(`🔹 mergedUpdate:`,JSON.stringify( Y.decodeUpdate(new Uint8Array(mergedUpdate))));
        //Y.applyUpdate(yDoc, baseState); 
        //Y.applyUpdate(yDoc, diff1); 
        //Y.applyUpdate(yDoc, mergedUpdate); 
        //Y.applyUpdate(yDoc, baseState); 
        //Y.applyUpdate(baseDoc, stateVector2); 
        console.log("📜 Final document content:", baseDoc.getXmlFragment("default").toArray().map(node => node.toString()).join(""));

        return {
            documentType: latestDoc.documentType,
            document: baseDoc
        }

    }

    async updateAwareness(socket: WebSocket, documentId: string, update: Uint8Array) {
        this.wsManager.broadcastDocumentAwareness({ sender: socket, documentId, update, requestMeta: this.requestMeta });
    }

    private travelHtmlToYjs(yXmlFragment: Y.XmlFragment, node: Node) {
        if (node.nodeType === 1) {
            const element = node as Element;
            const yElement = new Y.XmlElement(element.tagName)
            for (let i = 0; i < element.attributes.length; i++) {
                const attr = element.attributes[i];
                yElement.setAttribute(attr.name, attr.value);
            }
            yXmlFragment.insert(yXmlFragment.length, [yElement]);

            for (let i = 0; i < element.childNodes.length; i++) {
                this.travelHtmlToYjs(yElement, element.childNodes[i]);
            }
        } else if (node.nodeType === 3) { // ✅ TEXT_NODE (3)
            const textContent = node.nodeValue?.trim();
            if (textContent) {
                yXmlFragment.insert(yXmlFragment.length, [new Y.XmlText(node.textContent || "")]);
            }
        }

    }

}
