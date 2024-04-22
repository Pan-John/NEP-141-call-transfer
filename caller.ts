import { KeyPair, keyStores, Near, Contract, connect } from "near-api-js";
import dotenv from 'dotenv';

interface NEP141_Contract extends Contract {
    ft_balance_of: (args: { account_id: string }) => Promise<string>;
    ft_transfer: (args: { receiver_id: string; amount: string; memo?: string }, gas: string, attachedDeposit: string) => Promise<void>;
}

export interface Payload {
    userId: string;
    receiverId: string;
    amount: string;
    symbol: string;
}

export const TOKEN_LIST: { [key: string]: string } = {
    NEAR: 'NEAR',
    PTC: 'ft3.0xpj.testnet',
}

async function getBalance(contract: NEP141_Contract, payload: Payload): Promise<void> {
    try {
        const balance = await contract.ft_balance_of({ account_id: payload.userId });
        console.log(`Balance of ${payload.symbol} in ${payload.userId}: ${balance}`);
    } catch (error) {
        console.error(`Failed to fetch balance of ${payload.symbol} for ${payload.userId}:`, error);
    }
}

async function transferToken(contract: NEP141_Contract, payload: Payload): Promise<void> {
    try {
        await contract.ft_transfer({
            receiver_id: payload.receiverId,
            amount: payload.amount.toString(),
        },
        "300000000000000", // gas
        "1", // attached deposit in yoctoNEAR (optional)
        );
        console.log(`Successfully transferred ${payload.amount.toString()} ${payload.symbol} to ${payload.receiverId}`);
    } catch (error) {
        console.error(`Failed to transfer ${payload.amount.toString()} ${payload.symbol} to ${payload.receiverId}:`, error);
    }
}

async function init(contractId: string): Promise<NEP141_Contract> {

    // TODO: When frontend is implemented, should be able to use wallet-selector not local private key
    dotenv.config();
    const PRIVATE_KEY: string | undefined = process.env.PRIVATE_KEY;
    if (!PRIVATE_KEY) {
        throw new Error("Private key is undefined. Please set your environment variable.");
    }

    const keyStore = new keyStores.InMemoryKeyStore();
    const keyPair: KeyPair = KeyPair.fromString(PRIVATE_KEY);
    await keyStore.setKey("testnet", "0xpj.testnet", keyPair);

    // Here's the contract init part
    const config = {
        keyStore: keyStore,
        networkId: 'testnet',
        nodeUrl: 'https://rpc.testnet.near.org',
        walletUrl: 'https://wallet.testnet.near.org',
        helperUrl: 'https://helper.testnet.near.org',
        explorerUrl: 'https://explorer.testnet.near.org',
    };

    const near: Near = await connect(config);
    return new Contract(
        await near.account("0xpj.testnet"),
        contractId, // token contract id
        {
            viewMethods: ["ft_balance_of"],
            changeMethods: ["mint", "storage_deposit", "ft_transfer"],
            useLocalViewExecution: false,
        }
    ) as NEP141_Contract;
}

async function TransferNear(payload: Payload): Promise<void> {
    // TODO: wallet selector
    dotenv.config();
    const PRIVATE_KEY: string | undefined = process.env.PRIVATE_KEY;
    if (!PRIVATE_KEY) {
        throw new Error("Private key is undefined. Please set your environment variable.");
    }

    const keyStore = new keyStores.InMemoryKeyStore();
    const keyPair: KeyPair = KeyPair.fromString(PRIVATE_KEY);
    await keyStore.setKey("testnet", "0xpj.testnet", keyPair);

    const connectionConfig = {
        networkId: "testnet",
        keyStore: keyStore,
        nodeUrl: "https://rpc.testnet.near.org",
        walletUrl: "https://wallet.testnet.near.org",
        helperUrl: "https://helper.testnet.near.org",
        explorerUrl: "https://explorer.testnet.near.org",
    };

    const nearConnection = await connect(connectionConfig);
    const user_account = await nearConnection.account(payload.userId);
    const receiver_account = await nearConnection.account(payload.receiverId);

    console.log(`Balance of NEAR in ${payload.userId}: ${(await user_account.getAccountBalance()).available}`);
    console.log(`Balance of NEAR in ${payload.receiverId}: ${(await receiver_account.getAccountBalance()).available}`);
    try{
        await user_account.sendMoney(
            payload.receiverId,
            BigInt(payload.amount)* BigInt('1000000000000000000000000')// Convert to yoctoNEAR
        );
        console.log(`Successfully transferred ${payload.amount.toString()} ${payload.symbol} to ${payload.receiverId}`);
    } catch (error) {
        console.error(`Failed to transfer ${payload.amount.toString()} ${payload.symbol} to ${payload.receiverId}:`, error);
    }
    console.log(`Balance of NEAR in ${payload.userId}: ${(await user_account.getAccountBalance()).available}`);
    console.log(`Balance of NEAR in ${payload.receiverId}: ${(await receiver_account.getAccountBalance()).available}`);
}

async function main() {

    const mockPayload: Payload = {
        userId: '0xpj.testnet',
        receiverId: '0xpjunior.testnet',
        amount: "1",
        symbol: 'NEAR',// fungible token symbol or NEAR
    }

    if (!Object.keys(TOKEN_LIST).includes(mockPayload.symbol)) {
        throw new Error('Token not supported');
    }

    if (TOKEN_LIST[mockPayload.symbol] == "NEAR"){
        await TransferNear(mockPayload);
    } else {const contract = await init(TOKEN_LIST[mockPayload.symbol]);
        // init the contract with the token symbol first then do the reaction
        await getBalance(contract, mockPayload);
        await transferToken(contract, mockPayload);
    }
}

main().catch(console.error);