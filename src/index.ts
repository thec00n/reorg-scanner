const Web3 = require("web3");
const sleep = require("sleep");

const args = process.argv.slice(2);
const web3 = new Web3(args[0]);


const { configure, getLogger } = require("log4js");
const logger = getLogger();

configure({
    appenders: {
        everything: { type: "file", filename: "./logs/main.log" },
    },
    categories: {
        default: { appenders: ["everything"], level: "debug" },
    },
});


interface Blocks {
    [number: number]: Block
}

interface Block {
    hash: string,
    parentHash: string
};

let currentBlockNumber: number;
let blocks: Blocks = {};
let futureBlockNumber: number;

async function run() {
    currentBlockNumber = await getCurrentBlockNumber();
    futureBlockNumber = currentBlockNumber + 1;

    while (true) {
        const currentBlock = await getBlock(futureBlockNumber);
        if (currentBlock) {
            currentBlockNumber = futureBlockNumber;
            futureBlockNumber = currentBlockNumber + 1;
            const blockEntry: Block = {
                hash: currentBlock.hash,
                parentHash: currentBlock.parentHash
            }
            blocks[currentBlockNumber] = blockEntry
            logger.info(`Found new block at ${currentBlockNumber} -> ${objectToString(blockEntry)}`)

            const reorgs = await checkReorg();
            if (reorgs > 0) {
                console.log(`Found reorg with ${reorgs} blocks at block number ${currentBlockNumber}`)
                logger.info(`Found reorg with ${reorgs} blocks at block number ${currentBlockNumber}`)
            }
        }
        sleep.sleep(5);
    }
}

async function checkReorg(): Promise<number> {
    let currentBlock;
    let lastBlock;
    let counter = 0;

    const blockNumbers = Object.keys(blocks);

    while (blockNumbers.length - 1 > counter) {

        logger.info(`Current blocks ${blockNumbers}`)

        currentBlock = blocks[currentBlockNumber];
        lastBlock = blocks[currentBlockNumber - 1];

        if (currentBlock.parentHash === lastBlock.hash) {
            return counter;
        }

        counter = counter + 1;
        currentBlockNumber = currentBlockNumber - 1;
        logger.info(`Counter increased to ${counter})`)
        logger.info(`Decreasing current block number to ${currentBlockNumber})`)

    }

    return counter
}

async function getCurrentBlockNumber(): Promise<number> {
    return Number(await web3.eth.getBlockNumber());
}

async function getBlock(number: number): Promise<any> {
    return await web3.eth.getBlock(number);
}

function printObject(o: Object) {
    console.log(JSON.stringify(o, undefined, 2));
}

function objectToString(o: Object) {
    return JSON.stringify(o, undefined, 2);
}


run();