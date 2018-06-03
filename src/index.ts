import {Wallet} from "./types/Wallet";
import {KeyPair} from "./types/KeyPair";
import {TezosAccount} from "./types/TezosAccount";
import {TezosTransaction} from "./types/TezosTransaction";
import * as fs from 'fs';

export function createWallet(filename: string, password: string): Promise<Wallet> {
    return new Promise<Wallet>((resolve, reject) => {
        if(fs.existsSync(filename)) reject("A wallet already exists at this path!")
        const wallet: Wallet = {
            identities: []
        }
        fs.writeFile(filename, JSON.stringify(wallet), (err) => {
            if (err) reject(err);
            resolve(wallet)
        });
    })
}

export function saveWallet(filename: string, wallet: Wallet): Promise<Wallet> {
    return new Promise<Wallet>((resolve, reject) => {
        fs.writeFile(filename, JSON.stringify(wallet), (err) => {
            if (err) reject(err);
            resolve(wallet)
        });
    })
}

export function loadWallet(filename: string, password: string): Promise<Wallet> {
    return new Promise<Wallet>((resolve, reject) => {
        fs.readFile(filename,(err, data) => {
            if (err) reject(err);
            const wallet = <Wallet> JSON.parse(data.toString())
            resolve(wallet)
        });
    })
}

export function unlockFundraiserIdentity(passphrase: string, username: string, password: string): KeyPair {
    return {
        publicKey: 'edpkv3azzeq9vL869TujYhdQY5FKiQH4CGwJEzqG7m6PoX7VEpdPc9',
        privateKey: 'edskS5owtVaAtWifnCNo8tUpAw2535AXEDY4RXBRV1NHbQ58RDdpaWz2KyrvFXE4SuCTbHU8exUecW33GRqkAfLeNLBS5sPyoi',
        publicKeyHash: 'tz1hcXqtiMYFhvuirD4guE7ts4yDuCAmtD95'
    }
}

export function unlockIdentityWithSeed(seed: string, password: string): KeyPair {
    return {
        publicKey: 'edpkv3azzeq9vL869TujYhdQY5FKiQH4CGwJEzqG7m6PoX7VEpdPc9',
        privateKey: 'edskS5owtVaAtWifnCNo8tUpAw2535AXEDY4RXBRV1NHbQ58RDdpaWz2KyrvFXE4SuCTbHU8exUecW33GRqkAfLeNLBS5sPyoi',
        publicKeyHash: 'tz1hcXqtiMYFhvuirD4guE7ts4yDuCAmtD95'
    }
}

export function generateSeed(): string {
    return 'mule brick hint build carbon file useful history diesel resource deny duck mystery sister stomach'
}

export function getAccountsForIdentity(id: string, network: string): Promise<TezosAccount[]> {
    return new Promise<TezosAccount[]>((resolve, reject) => {
        resolve([
            {
                address: 'TZ1tmv69RYRXaney2zX6QA5J8ZwM1SPnZaM4',
                isContract: false,
                balance: 100
            }
        ])
    })
}

export function getBalance(id: string, network: string): Promise<number> {
    return new Promise<number>((resolve, reject) => {
        resolve(50)
    })
}

export function getTransactionsForAddress(id: string, network: string): Promise<TezosTransaction[]> {
    return new Promise<TezosTransaction[]>((resolve, reject) => {
        resolve(
        [
            {
                id: 'oo3g2w3h9pK56GafXEHuu3FWZGKy6ctMjViw46aTT41qUK3FWEW',
                sender: id,
                recipient: id,
                amount: 10
            },
            {
                id: 'oo3g2w3h9pK56GafXEHuu3FWZGKy6ctMjViw46aTT41qUK3FWEW',
                sender: id,
                recipient: id,
                amount: -20
            }
        ]
    )})
}

export function sendTransaction(network: string, from: string, to: string, amount: number, fee: number): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        resolve(
            'op4prKdhMfcGraxqe45KYEs8W3Yyf7BXiDxn5LNssRs54XLdmBo'
        )
    })
}

export function createAccount(network: string, from: string, to: string, amount: number, fee: number): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        resolve(
            'op4prKdhMfcGraxqe45KYEs8W3Yyf7BXiDxn5LNssRs54XLdmBo'
        )
    })
}

export function delegateAccount(network: string, id: string, delegate: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        resolve(
            'op4prKdhMfcGraxqe45KYEs8W3Yyf7BXiDxn5LNssRs54XLdmBo'
        )
    })
}