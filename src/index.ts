import fetch from 'node-fetch';
import FetchSelector from './utils/FetchSelector';
import DeviceSelector from './utils/DeviceSelector';
import { TezosLedgerWallet } from './identity/tezos/TezosLedgerWallet';

FetchSelector.setFetch(fetch);
DeviceSelector.setLedgerUtils(TezosLedgerWallet);

export * from "./chain/tezos/TezosNodeQuery";
export * from "./chain/tezos/TezosOperations";

export * from "./identity/tezos/TezosFileWallet";
export * from "./identity/tezos/TezosLedgerWallet";
export * from "./identity/tezos/TezosWalletUtil";

export * from "./reporting/tezos/TezosConseilClient";
export * from "./reporting/tezos/TezosConseilQuery";

export * from './reporting/ConseilDataClient';
export * from './reporting/ConseilMetadataClient';
export * from './reporting/ConseilQueryBuilder';

export * from './types/conseil/QueryTypes';
