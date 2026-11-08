"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encryptionExtension = void 0;
const client_1 = require("@prisma/client");
const encryption_1 = require("./encryption");
exports.encryptionExtension = client_1.Prisma.defineExtension({
    name: 'encryption',
    query: {
        $allModels: {
            async $allOperations({ model, operation, args, query }) {
                // ON WRITE (create, update, createMany, updateMany, upsert)
                if (model && encryption_1.ENCRYPTED_FIELDS[model]) {
                    const fieldsToEncrypt = encryption_1.ENCRYPTED_FIELDS[model];
                    if (operation === "create" || operation === "update" || operation === "upsert") {
                        const data = operation === "upsert"
                            ? args.create
                            : args.data;
                        if (data) {
                            fieldsToEncrypt.forEach(field => {
                                if (data[field] !== undefined && data[field] !== null) {
                                    data[field] = (0, encryption_1.encrypt)(data[field]);
                                }
                            });
                        }
                        if (operation === "upsert" && args.update) {
                            fieldsToEncrypt.forEach(field => {
                                if (args.update[field] !== undefined && args.update[field] !== null) {
                                    args.update[field] = (0, encryption_1.encrypt)(args.update[field]);
                                }
                            });
                        }
                    }
                    if (operation === "createMany" || operation === "updateMany") {
                        const data = args.data;
                        if (Array.isArray(data)) {
                            data.forEach(item => {
                                fieldsToEncrypt.forEach(field => {
                                    if (item[field] !== undefined && item[field] !== null) {
                                        item[field] = (0, encryption_1.encrypt)(item[field]);
                                    }
                                });
                            });
                        }
                        else if (data) {
                            fieldsToEncrypt.forEach(field => {
                                if (data[field] !== undefined && data[field] !== null) {
                                    data[field] = (0, encryption_1.encrypt)(data[field]);
                                }
                            });
                        }
                    }
                }
                // Execute the query
                const result = await query(args);
                // ON READ (findUnique, findFirst, findMany, findUniqueOrThrow, findFirstOrThrow)
                if (model && encryption_1.ENCRYPTED_FIELDS[model]) {
                    const fieldsToDecrypt = encryption_1.ENCRYPTED_FIELDS[model];
                    if (operation === "findUnique" ||
                        operation === "findFirst" ||
                        operation === "findUniqueOrThrow" ||
                        operation === "findFirstOrThrow") {
                        if (result) {
                            fieldsToDecrypt.forEach(field => {
                                const record = result;
                                if (record[field] !== undefined && record[field] !== null) {
                                    record[field] = (0, encryption_1.decrypt)(record[field]);
                                }
                            });
                        }
                    }
                    if (operation === "findMany") {
                        if (Array.isArray(result)) {
                            result.forEach(item => {
                                fieldsToDecrypt.forEach(field => {
                                    const record = item;
                                    if (record[field] !== undefined && record[field] !== null) {
                                        record[field] = (0, encryption_1.decrypt)(record[field]);
                                    }
                                });
                            });
                        }
                    }
                }
                return result;
            }
        }
    }
});
