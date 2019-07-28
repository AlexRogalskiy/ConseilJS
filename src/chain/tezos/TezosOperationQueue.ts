import { Operation, StackableOperation } from '../../types/tezos/TezosP2PMessageTypes';
import { TezosConstants } from '../../types/tezos/TezosConstants';
import { KeyStore } from '../../types/wallet/KeyStore';
import { TezosNodeReader } from './TezosNodeReader';
import { TezosNodeWriter } from './TezosNodeWriter';

/**
 * Note, this is a stateful object
 */
export class TezosOperationQueue {
    readonly server: string;
    readonly derivationPath: string;
    readonly operations: Operation[];
    readonly keyStore: KeyStore;
    readonly delay: number;

    triggerTimestamp: number = 0;

    private constructor(server: string, derivationPath: string, keyStore: KeyStore, delay: number) {
        this.server = server;
        this.keyStore = keyStore;
        this.derivationPath = derivationPath;
        this.delay = delay;

        this.operations = [];
    }

    /**
     * 
     * @param server 
     * @param derivationPath 
     * @param keyStore 
     * @param delay 
     */
    public static createQueue(server: string, derivationPath: string, keyStore: KeyStore, delay: number = TezosConstants.DefaultBatchDelay) {
        return new TezosOperationQueue(server, derivationPath, keyStore, delay);
    }

    public addOperations(...operations: Operation[]) {
        if (operations.length === 0) {
            this.triggerTimestamp = Date.now();
            setTimeout(this.sendOperations, this.delay * 1000);
        }

        operations.forEach(o => this.operations.push(o)); // TODO: consider resetting the timer for each addition up to 2x delay
    }

    private async sendOperations() {
        let counter = await TezosNodeReader.getCounterForAccount(this.server, this.keyStore.publicKeyHash) + 1;

        let ops: Operation[] = [];
        for (let i = 0; i < this.operations.length; i++) {
            let o = this.operations[i];
            if ((o as StackableOperation).counter) { (o as StackableOperation).counter = `${counter++}`; }
            ops.push(o);
        }
        this.operations.slice(ops.length);

        if (this.operations.length > 0) {
            this.triggerTimestamp = Date.now();
            setTimeout(this.sendOperations, this.delay * 1000);
        }

        const result = await TezosNodeWriter.sendOperation(this.server, ops, this.keyStore, this.derivationPath);
        // TODO: error reporting
    }
}
