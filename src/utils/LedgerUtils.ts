import {base58CheckEncode} from "./CryptoUtils";
import * as sodium from 'libsodium-wrappers-sumo';

let Transport = require("@ledgerhq/hw-transport-node-hid").default;
let App = require("@ledgerhq/hw-app-xtz").default;

class LedgerStuff {
    static transport = null;
    static async getInstance() {
        if (this.transport === null) {
            this.transport = await Transport.create();
        }
        return this.transport
    }
}

export async function getTezosPublicKey(derivationPath: string): Promise<string> {
    const dict = await LedgerStuff.getInstance();
    console.log("some string, ");
    console.log(dict);
    const transport = dict//await Transport.create();
    const xtz = new App(transport);
    const result = await xtz.getAddress(derivationPath, true);
    const hexEncodedPublicKey = result.publicKey;
    return hexEncodedPublicKey;
}

export async function signTezosOperation(derivationPath: string, watermarkedOpInHex: string): Promise<Buffer> {
    console.log('Signing using Ledger..')
    const transport = await LedgerStuff.getInstance();
    //const transport = await Transport.create();
    const xtz = new App(transport);
    const result = await xtz.signOperation(derivationPath, watermarkedOpInHex);//opBytesInHex);
    console.log(result);
    const hexEncodedSignature = result.signature;
    const signatureBytes = sodium.from_hex(hexEncodedSignature)//.slice(1);
    console.log("length:" + signatureBytes.length);
    return signatureBytes;
}