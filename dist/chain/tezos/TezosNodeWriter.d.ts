import { KeyStore } from '../../types/wallet/KeyStore';
import * as TezosTypes from '../../types/tezos/TezosChainTypes';
export declare namespace TezosNodeWriter {
    function signOperationGroup(forgedOperation: string, keyStore: KeyStore, derivationPath: string): Promise<TezosTypes.SignedOperationGroup>;
    function forgeOperations(blockHead: TezosTypes.BlockMetadata, operations: object[]): string;
    function applyOperation(server: string, blockHead: TezosTypes.BlockMetadata, operations: object[], signedOpGroup: TezosTypes.SignedOperationGroup): Promise<TezosTypes.AlphaOperationsWithMetadata[]>;
    function injectOperation(server: string, signedOpGroup: TezosTypes.SignedOperationGroup): Promise<string>;
    function sendOperation(server: string, operations: object[], keyStore: KeyStore, derivationPath: any): Promise<TezosTypes.OperationResult>;
    function appendRevealOperation(server: string, keyStore: KeyStore, account: TezosTypes.Account, operations: TezosTypes.Operation[]): Promise<TezosTypes.Operation[]>;
    function sendTransactionOperation(server: string, keyStore: KeyStore, to: string, amount: number, fee: number, derivationPath: string): Promise<TezosTypes.OperationResult>;
    function sendDelegationOperation(server: string, keyStore: KeyStore, delegate: string, fee: number, derivationPath: string): Promise<TezosTypes.OperationResult>;
    function sendAccountOriginationOperation(server: string, keyStore: KeyStore, amount: number, delegate: string, spendable: boolean, delegatable: boolean, fee: number, derivationPath: string): Promise<TezosTypes.OperationResult>;
    function sendContractOriginationOperation(server: string, keyStore: KeyStore, amount: number, delegate: string, spendable: boolean, delegatable: boolean, fee: number, derivationPath: string, storage_limit: string, gas_limit: string, code: Array<object>, storage: object): Promise<TezosTypes.OperationResult>;
    function sendContractInvocationOperation(server: string, keyStore: KeyStore, to: string, amount: number, fee: number, derivationPath: string, storageLimit: number, gasLimit: number, parameters: object): Promise<TezosTypes.OperationResult>;
    function sendKeyRevealOperation(server: string, keyStore: KeyStore, fee: number, derivationPath: string): Promise<TezosTypes.OperationResult>;
    function sendIdentityActivationOperation(server: string, keyStore: KeyStore, activationCode: string, derivationPath: string): Promise<TezosTypes.OperationResult>;
}
