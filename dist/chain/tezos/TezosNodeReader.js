"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ErrorTypes_1 = require("../../types/conseil/ErrorTypes");
const FetchSelector_1 = __importDefault(require("../../utils/FetchSelector"));
const fetch = FetchSelector_1.default.getFetch();
var TezosNodeReader;
(function (TezosNodeReader) {
    function performGetRequest(server, command) {
        const url = `${server}/${command}`;
        return fetch(url, { method: 'get' })
            .then(response => {
            if (!response.ok) {
                throw new ErrorTypes_1.ServiceRequestError(response.status, response.statusText, url, null);
            }
            return response;
        })
            .then(response => {
            try {
                return response.json();
            }
            catch (_a) {
                throw new ErrorTypes_1.ServiceResponseError(response.status, response.statusText, url, null, response);
            }
        });
    }
    function getBlock(server, hash) {
        return performGetRequest(server, `chains/main/blocks/${hash}`)
            .then(json => { return json; });
    }
    TezosNodeReader.getBlock = getBlock;
    function getBlockHead(server) {
        return getBlock(server, "head");
    }
    TezosNodeReader.getBlockHead = getBlockHead;
    function getAccountForBlock(server, blockHash, accountID) {
        return performGetRequest(server, `chains/main/blocks/${blockHash}/context/contracts/${accountID}`)
            .then(json => json);
    }
    TezosNodeReader.getAccountForBlock = getAccountForBlock;
    function getAccountManagerForBlock(server, blockHash, accountID) {
        return performGetRequest(server, `chains/main/blocks/${blockHash}/context/contracts/${accountID}/manager_key`)
            .then(json => json);
    }
    TezosNodeReader.getAccountManagerForBlock = getAccountManagerForBlock;
})(TezosNodeReader = exports.TezosNodeReader || (exports.TezosNodeReader = {}));
//# sourceMappingURL=TezosNodeReader.js.map