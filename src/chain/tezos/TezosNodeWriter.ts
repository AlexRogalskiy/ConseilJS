import { KeyStore, StoreType } from '../../types/wallet/KeyStore';
import * as TezosTypes from '../../types/tezos/TezosChainTypes';
import { TezosNodeReader } from './TezosNodeReader';
import { TezosMessageCodec } from './TezosMessageCodec';
import { TezosMessageUtils } from './TezosMessageUtil';
import { TezosLanguageUtil } from './TezosLanguageUtil';
import { CryptoUtils } from '../../utils/CryptoUtils';

import FetchSelector from '../../utils/FetchSelector'
const fetch = FetchSelector.getFetch();

import DeviceSelector from '../../utils/DeviceSelector';
let LedgerUtils = DeviceSelector.getLedgerUtils();

import LogSelector from '../../utils/LoggerSelector';
const log = LogSelector.getLogger();

/**
 *  Functions for sending operations on the Tezos network.
 */
export namespace TezosNodeWriter {
    /**
     * Send a POST request to a Tezos node.
     * 
     * @param {string} server Which Tezos node to go against
     * @param {string} command RPC route to invoke
     * @param {object} payload Payload to submit
     * @returns {Promise<object>} JSON-encoded response
     */
    function performPostRequest(server: string, command: string, payload = {}): Promise<Response> {
        const url = `${server}/${command}`;
        const payloadStr = JSON.stringify(payload);

        log.debug(`TezosNodeWriter.performPostRequest sending ${payloadStr}\n->\n${url}`);

        return fetch(url, { method: 'post', body: payloadStr, headers: { 'content-type': 'application/json' } });
    }

    /**
     * Signs a forged operation
     * @param {string} forgedOperation Forged operation group returned by the Tezos client (as a hex string)
     * @param {KeyStore} keyStore Key pair along with public key hash
     * @param {string} derivationPath BIP44 Derivation Path if signed with hardware, empty if signed with software
     * @returns {SignedOperationGroup} Bytes of the signed operation along with the actual signature
     */
    // TODO: move this function to wallet files
    export async function signOperationGroup(forgedOperation: string, keyStore: KeyStore, derivationPath: string): Promise<TezosTypes.SignedOperationGroup> {
        const watermark = '03';
        const watermarkedForgedOperationBytesHex = watermark + forgedOperation;

        let opSignature: Buffer;
        switch (keyStore.storeType) {
            case StoreType.Hardware:
                opSignature = await LedgerUtils.signTezosOperation(derivationPath, watermarkedForgedOperationBytesHex);
                break;
            default:
                const hashedWatermarkedOpBytes = CryptoUtils.simpleHash(Buffer.from(watermarkedForgedOperationBytesHex, 'hex'), 32);
                const privateKeyBytes = TezosMessageUtils.writeKeyWithHint(keyStore.privateKey, 'edsk');

                opSignature = await CryptoUtils.signDetached(hashedWatermarkedOpBytes, privateKeyBytes);
        }

        const hexSignature: string = TezosMessageUtils.readSignatureWithHint(opSignature, 'edsig').toString();
        const signedOpBytes = Buffer.concat([Buffer.from(forgedOperation, 'hex'), Buffer.from(opSignature)]);

        return { bytes: signedOpBytes, signature: hexSignature.toString() };
    }

    /**
     * Forge an operation group.
     *
     * @param {BlockMetadata} blockHead The block head
     * @param {object[]} operations The operations being forged as part of this operation group
     *
     * @returns {string} Forged operation bytes (as a hex string)
     */
    export function forgeOperations(blockHead: TezosTypes.BlockMetadata, operations: object[]): string {
        let encoded = TezosMessageUtils.writeBranch(blockHead.hash);
        operations.forEach(m => encoded += TezosMessageCodec.encodeOperation(m));

        return encoded;
    }

    /**
     * Applies an operation using the Tezos RPC client.
     *
     * @param {string} server Tezos node to connect to
     * @param {BlockMetadata} blockHead Block head
     * @param {object[]} operations The operations to create and send
     * @param {SignedOperationGroup} signedOpGroup Signed operation group
     * @returns {Promise<AppliedOperation>} Array of contract handles
     */
    export async function applyOperation(server: string, blockHead: TezosTypes.BlockMetadata, operations: object[], signedOpGroup: TezosTypes.SignedOperationGroup): Promise<TezosTypes.AlphaOperationsWithMetadata[]> {
        const payload = [{
            protocol: blockHead.protocol,
            branch: blockHead.hash,
            contents: operations,
            signature: signedOpGroup.signature
        }];

        const response = await performPostRequest(server, 'chains/main/blocks/head/helpers/preapply/operations', payload);
        const text = await response.text();
        try {
            log.debug(`TezosNodeWriter.applyOperation received ${text}`);

            const json = JSON.parse(text);
            return json as TezosTypes.AlphaOperationsWithMetadata[];
        } catch (err) {
            log.error(`TezosNodeWriter.applyOperation failed to parse response`);
            throw new Error(`Could not parse JSON response from chains/main/blocks/head/helpers/preapply/operation: '${text}' for ${payload}`);
        }
    }

    /**
     * Ensures the results of operation application do not contain errors. Throws if there are errors.
     *
     * @param appliedOp Results of operation application.
     */
    function checkAppliedOperationResults(appliedOp: TezosTypes.AlphaOperationsWithMetadata[]): void {
        const validAppliedKinds = new Set(['activate_account', 'reveal', 'transaction', 'origination', 'delegation']);
        const firstAppliedOp = appliedOp[0]; // All our op groups are singletons so we deliberately check the zeroth result.

        if (firstAppliedOp.kind != null && !validAppliedKinds.has(firstAppliedOp.kind)) {
            log.error(`TezosNodeWriter.checkAppliedOperationResults failed with ${firstAppliedOp.id}`);
            throw new Error(`Could not apply operation because ${firstAppliedOp.id}`);
        }

        for (const op of firstAppliedOp.contents) {
            if (!validAppliedKinds.has(op.kind)) {
                log.error(`TezosNodeWriter.checkAppliedOperationResults failed with ${op.metadata}`);
                throw new Error(`Could not apply operation because: ${op.metadata}`);
            }
        }
    }

    /**
     * Injects an operation using the Tezos RPC client.
     *
     * @param {string} server Tezos node to connect to
     * @param {SignedOperationGroup} signedOpGroup Signed operation group
     * @returns {Promise<InjectedOperation>} ID of injected operation
     */
    export async function injectOperation(server: string, signedOpGroup: TezosTypes.SignedOperationGroup): Promise<string> {
        const response = await performPostRequest(server, 'injection/operation?chain=main', signedOpGroup.bytes.toString('hex'));
        const injectedOperation = await response.text();

        return injectedOperation;
    }

    /**
     * Master function for creating and sending all supported types of operations.
     * 
     * @param {string} server Tezos node to connect to
     * @param {object[]} operations The operations to create and send
     * @param {KeyStore} keyStore Key pair along with public key hash
     * @param {string} derivationPath BIP44 Derivation Path if signed with hardware, empty if signed with software
     * @returns {Promise<OperationResult>}  The ID of the created operation group
     */
    export async function sendOperation(server: string, operations: object[], keyStore: KeyStore, derivationPath): Promise<TezosTypes.OperationResult> {
        const blockHead = await TezosNodeReader.getBlockHead(server);
        const forgedOperationGroup = forgeOperations(blockHead, operations);
        const signedOpGroup = await signOperationGroup(forgedOperationGroup, keyStore, derivationPath);
        const appliedOp = await applyOperation(server, blockHead, operations, signedOpGroup);
        checkAppliedOperationResults(appliedOp);
        const injectedOperation = await injectOperation(server, signedOpGroup);

        return { results: appliedOp[0], operationGroupID: injectedOperation };
    }

    /**
     * Helper function for sending Delegations, Transactions, and Originations. Checks if manager's public key has been revealed for operation. If yes, do nothing, else, bundle a reveal operation before the input operation.
     *
     * @param {string} server Tezos node to connect to
     * @param keyStore Key pair along with public key hash
     * @param {string} accountHash Account address to reveal.
     * @param {number} accountOperationIndex
     * @param operations Delegation, Transaction, or Origination to possibly bundle with a reveal
     */
    export async function appendRevealOperation(server: string, keyStore: KeyStore, accountHash: string, accountOperationIndex: number, operations: TezosTypes.Operation[]) {
        const isKeyRevealed = await TezosNodeReader.isManagerKeyRevealedForAccount(server, accountHash);

        if (!isKeyRevealed) {
            const revealOp: TezosTypes.Operation = {
                kind: 'reveal',
                source: accountHash,
                fee: '0', // Reveal Fee will be covered by the appended operation
                counter: (accountOperationIndex + 1).toString(),
                gas_limit: '10600',
                storage_limit: '0',
                public_key: keyStore.publicKey
            };

            let c = accountOperationIndex;
            c += 1;
            operations.forEach((operation) => { c++; operation.counter = c.toString(); });

            return [revealOp, ...operations];
        }

        return operations;
    }

    /**
     * Creates and sends a transaction operation.
     * 
     * @param {string} server Tezos node to connect to
     * @param {KeyStore} keyStore Key pair along with public key hash
     * @param {String} to Destination public key hash
     * @param {number} amount Amount to send
     * @param {number} fee Fee to use
     * @param {string} derivationPath BIP44 Derivation Path if signed with hardware, empty if signed with software
     * @returns {Promise<OperationResult>} Result of the operation
     */
    export async function sendTransactionOperation(server: string, keyStore: KeyStore, to: string, amount: number, fee: number, derivationPath: string) {
        const blockHead = await TezosNodeReader.getBlockHead(server);
        const sourceAccount = await TezosNodeReader.getAccountForBlock(server, blockHead.hash, keyStore.publicKeyHash);

        const transaction: TezosTypes.Operation = {
            destination: to,
            amount: amount.toString(),
            storage_limit: '300',
            gas_limit: '10600',
            counter: (Number(sourceAccount.counter) + 1).toString(),
            fee: fee.toString(),
            source: keyStore.publicKeyHash,
            kind: 'transaction'
        };

        const operations = await appendRevealOperation(server, keyStore, keyStore.publicKeyHash, sourceAccount.counter, [transaction])

        return sendOperation(server, operations, keyStore, derivationPath);
    }

    /**
     * Creates and sends a delegation operation.
     * 
     * @param {string} server Tezos node to connect to
     * @param {KeyStore} keyStore Key pair along with public key hash
     * @param {string} delegator Account address to delegate from
     * @param {string} delegate Account address to delegate to
     * @param {number} fee Operation fee
     * @param {string} derivationPath BIP44 Derivation Path if signed with hardware, empty if signed with software
     * @returns {Promise<OperationResult>} Result of the operation
     */
    export async function sendDelegationOperation(server: string, keyStore: KeyStore, delegator: string, delegate: string, fee: number = 1258, derivationPath: string = '') {
        const blockHead = await TezosNodeReader.getBlockHead(server);
        const account = await TezosNodeReader.getAccountForBlock(server, blockHead.hash, delegator);
        const delegation: TezosTypes.Operation = {
            kind: 'delegation',
            source: delegator,
            fee: fee.toString(),
            counter: (Number(account.counter) + 1).toString(),
            storage_limit: '0',
            gas_limit: '10000',
            delegate: delegate
        }
        const operations = await appendRevealOperation(server, keyStore, delegator, account.counter, [delegation]);

        return sendOperation(server, operations, keyStore, derivationPath);
    }

    /**
     * Sends an account origination operation.
     *
     * @param {string} server Tezos node to connect to
     * @param {KeyStore} keyStore Key pair along with public key hash
     * @param {number} amount Initial funding amount for the new account in uXTZ
     * @param {string} delegate Account address to delegate to, blank if none
     * @param {boolean} spendable Is the new account allowed to transact?
     * @param {boolean} delegatable Can the account be delegated?
     * @param {number} fee Operation fee
     * @param {string} derivationPath BIP44 Derivation Path if signed with hardware, empty if signed with software
     * @returns {Promise<OperationResult>} Result of the operation
     */
    export async function sendAccountOriginationOperation(server: string, keyStore: KeyStore, amount: number, delegate: string | undefined, spendable: boolean, delegatable: boolean, fee: number = 1266, derivationPath: string = '') {
        return sendOriginationOperation(server, keyStore, amount, delegate, spendable, delegatable, fee, derivationPath, '277', '10600');
    }

    /**
     * Sends a contract origination operation.
     *
     * @param {string} server Tezos node to connect to
     * @param {KeyStore} keyStore Key pair along with public key hash
     * @param {number} amount Initial funding amount of new account
     * @param {string} delegate Account ID to delegate to, blank if none
     * @param {boolean} spendable Is account spendable?
     * @param {boolean} delegatable Is account delegatable?
     * @param {number} fee Operation fee
     * @param {string} derivationPath BIP44 Derivation Path if signed with hardware, empty if signed with software
     * @param {string} storage_limit Storage fee.
     * @param {string} gas_limit Gas limit.
     * @param {string} code Contract code in Michelson.
     * @param {string} storage Initial storage value.
     */
    export async function sendContractOriginationOperation(
        server: string,
        keyStore: KeyStore,
        amount: number,
        delegate: string | undefined,
        spendable: boolean,
        delegatable: boolean,
        fee: number,
        derivationPath: string,
        storage_limit: string,
        gas_limit: string,
        code: string,
        storage: string
    ) {
        if (spendable) { log.warn('As of protocol 004-Pt24m4xi, contracts with code cannot be "spendable"'); }
        return sendOriginationOperation(server, keyStore, amount, delegate, spendable, delegatable, fee, derivationPath, storage_limit, gas_limit, code, storage);
    }

    /**
     * General purpose function for origination.
     *
     * @param {string} server Tezos node to connect to
     * @param {KeyStore} keyStore Key pair along with public key hash
     * @param {number} amount Initial funding amount of new account
     * @param {string} delegate Account ID to delegate to or 'undefined'
     * @param {boolean} spendable Is account spendable?
     * @param {boolean} delegatable Is account delegatable?
     * @param {number} fee Operation fee
     * @param {string} derivationPath BIP44 Derivation Path if signed with hardware, empty if signed with software
     * @param {string} storage_limit Storage fee.
     * @param {string} gas_limit Gas limit.
     * @param {string} code Contract code in Michelson format.
     * @param {string} storage Initial storage value in Michelson format.
     *
     * @returns {Promise<OperationResult>} Result of the operation
     */
    async function sendOriginationOperation(
        server: string,
        keyStore: KeyStore,
        amount: number,
        delegate: string | undefined,
        spendable: boolean,
        delegatable: boolean,
        fee: number,
        derivationPath: string,
        storage_limit: string,
        gas_limit: string,
        code?: string,
        storage?: string
    ) {
        const blockHead = await TezosNodeReader.getBlockHead(server);
        const account = await TezosNodeReader.getAccountForBlock(server, blockHead.hash, keyStore.publicKeyHash);

        let parsedCode: any = undefined;
        if (!!code) {
            parsedCode = JSON.parse(TezosLanguageUtil.translateMichelsonToMicheline(code));
            log.debug(`TezosNodeWriter.sendOriginationOperation code translation:\n${code}\n->\n${JSON.stringify(parsedCode)}`);
        }

        let parsedStorage: any = undefined;
        if (!!storage) {
            parsedStorage = JSON.parse(TezosLanguageUtil.translateMichelsonToMicheline(storage));
            log.debug(`TezosNodeWriter.sendOriginationOperation storage translation:\n${storage}\n->\n${JSON.stringify(parsedStorage)}`);
        }

        const origination: TezosTypes.Operation = {
            kind: 'origination',
            source: keyStore.publicKeyHash,
            fee: fee.toString(),
            counter: (Number(account.counter) + 1).toString(),
            gas_limit: gas_limit,
            storage_limit: storage_limit,
            manager_pubkey: keyStore.publicKeyHash,
            balance: amount.toString(),
            spendable: spendable,
            delegatable: delegatable && !!delegate,
            delegate: delegate,
            script: code ? { code: parsedCode, storage: parsedStorage } : undefined
        };
        const operations = await appendRevealOperation(server, keyStore, keyStore.publicKeyHash, account.counter, [origination]);

        return sendOperation(server, operations, keyStore, derivationPath);
    }

    /**
     * Invokes a contract with desired parameters
     *
     * @param {string} server Tezos node to connect to
     * @param {KeyStore} keyStore Key pair along with public key hash
     * @param {string} to Contract address
     * @param {number} amount Initial funding amount of new account
     * @param {number} fee Operation fee
     * @param {string} derivationPath BIP44 Derivation Path if signed with hardware, empty if signed with software
     * @param {string} storage_limit Storage fee.
     * @param {string} gas_limit Gas limit.
     * @param {string} parameters Contract arguments expressed as Michelson
     */
    export async function sendContractInvocationOperation(
        server: string,
        keyStore: KeyStore,
        to: string,
        amount: number,
        fee: number,
        derivationPath: string,
        storageLimit: number,
        gasLimit: number,
        parameters?: string
    ) {
        const blockHead = await TezosNodeReader.getBlockHead(server);
        const sourceAccount = await TezosNodeReader.getAccountForBlock(server, blockHead.hash, keyStore.publicKeyHash);

        let transaction: TezosTypes.Operation = {
            destination: to,
            amount: amount.toString(),
            storage_limit: storageLimit.toString(),
            gas_limit: gasLimit.toString(),
            counter: (Number(sourceAccount.counter) + 1).toString(),
            fee: fee.toString(),
            source: keyStore.publicKeyHash,
            kind: 'transaction'
        };

        if (!!parameters) {
            const michelineParams = TezosLanguageUtil.translateMichelsonToMicheline(parameters);
            (<TezosTypes.ContractInvocationOperation>transaction).parameters = JSON.parse(michelineParams);
        }

        const operations = await appendRevealOperation(server, keyStore, keyStore.publicKeyHash, sourceAccount.counter, [transaction]);
        return sendOperation(server, operations, keyStore, derivationPath);
    }

    /**
     * Creates and sends a reveal operation.
     *
     * @param {string} server Tezos node to connect to
     * @param {KeyStore} keyStore Key pair along with public key hash
     * @param {number} fee Fee to pay
     * @param {string} derivationPath BIP44 Derivation Path if signed with hardware, empty if signed with software
     * @returns {Promise<OperationResult>} Result of the operation
     */
    export async function sendKeyRevealOperation(server: string, keyStore: KeyStore, fee: number = 1270, derivationPath: string = '') {
        const blockHead = await TezosNodeReader.getBlockHead(server);
        const account = await TezosNodeReader.getAccountForBlock(server, blockHead.hash, keyStore.publicKeyHash);
        const revealOp: TezosTypes.Operation = {
            kind: 'reveal',
            source: keyStore.publicKeyHash,
            fee: fee + '',
            counter: (Number(account.counter) + 1).toString(),
            gas_limit: '10000',
            storage_limit: '0',
            public_key: keyStore.publicKey
        };
        const operations = [revealOp];

        return sendOperation(server, operations, keyStore, derivationPath)
    }

    /**
     * Creates and sends an activation operation.
     *
     * @param {string} server Tezos node to connect to
     * @param {KeyStore} keyStore Key pair along with public key hash
     * @param {string} activationCode Activation code provided by fundraiser process
     * @param {string} derivationPath BIP44 Derivation Path if signed with hardware, empty if signed with software
     * @returns {Promise<OperationResult>} Result of the operation
     */
    export function sendIdentityActivationOperation(server: string, keyStore: KeyStore, activationCode: string, derivationPath: string) {
        const activation = { kind: 'activate_account', pkh: keyStore.publicKeyHash, secret: activationCode };

        return sendOperation(server, [activation], keyStore, derivationPath);
    }
}
