const Web3 = require("web3");
const db = require('./dbconfig');
console.log(Web3.version);
//var Tx = require('@ethereumjs/tx').Transaction;
const { ETH_DATA_FORMAT, DEFAULT_RETURN_FORMAT } = require("web3");
//const { Transaction: Tx, Transaction } = require("./node_modules/ethereumjs-tx");
var fs = require('fs'); // fs模块读取.sol合约文件
const { clear } = require("console");
require("dotenv").config();




//-------Ropsten测试网配置----------------                             本地
var ropsten_wssurl = "ws://127.0.0.1:8545";
// 如果报错Error: Transaction has been reverted by the EVM 可能是vpn出问题了，检查网络
// chainid=3  如果报错Error: connection not open on send()  换个infura节点即可
// const ropsten_web3 = new Web3(
//     new Web3.providers.WebsocketProvider(
//         `ws://127.0.0.1:8545`,
//     ),
// );
var fromAddress = "0xE70ba76A7fA459E5C846EBFF2DE397335a4Fd539";
var privateKey = Buffer.from("cc6f44d4a16afc359d1c259cb2e3a7c6ab05ab9c546f0ea01d4cb7b5f37119cf", 'hex'); // 私钥
var ropsten_web3 = new Web3(new Web3.providers.WebsocketProvider(ropsten_wssurl));

ropsten_web3.eth.net.getId().then((chainId) => {
    console.log("chainId==> ", chainId);

});

var ropsten_ABI = JSON.parse(fs.readFileSync("ropsten_bridge.abi").toString());
var ropsten_contract_address = '0xd0Ce030ee3331A5e80f5AA89cF1e12b20eac4f86'; //ropsten的跨链桥地址***
//               NATIVE_RETH = 0x4a03c24614a251a1b75c4ccCC5b3bE7b542f716f
//                ERC20_BETH = 0x0392Ae4b926ABf4abDDE26e9E02103d9ac4E6275
var ropsten_contract = new ropsten_web3.eth.Contract(ropsten_ABI, ropsten_contract_address);




var NotaryGroupManager_ABI = JSON.parse(fs.readFileSync("NotaryGroupManager.abi").toString());
var NotaryGroupManager_address = '0xDAAC5dC0A6Ca03832dF6627edfcde86c467CbCB2'; //ropsten的跨链桥地址***
//               NATIVE_RETH = 0x4a03c24614a251a1b75c4ccCC5b3bE7b542f716f
//                ERC20_BETH = 0x0392Ae4b926ABf4abDDE26e9E02103d9ac4E6275
var NotaryGroupManager = new ropsten_web3.eth.Contract(NotaryGroupManager_ABI, NotaryGroupManager_address);

//---------------------------------------
//-------Rinkeby测试网配置----------------                                      sepolia测试网
var rinkeby_wssurl = "wss://sepolia.infura.io/ws/v3/09ee1a2b4bab428eafd67ed3e49ae195";
var rinkeby_web3 = new Web3(new Web3.providers.WebsocketProvider(rinkeby_wssurl));

// const network = process.env.ETHEREUM_NETWORK;
// const rinkeby_web3 = new Web3(
//     new Web3.providers.HttpProvider(
//         `https://${network}.infura.io/v3/${process.env.INFURA_API_KEY}`,
//     ),
// );
var VALUE;
var rinkeby_ABI = JSON.parse(fs.readFileSync("rinkeby_bridge.abi").toString());
var rinkeby_contract_address = '0x5fBb4A5e3dD829eb4E2F506a3D88Fb2f5e9486fb'; //rinkeby的跨链桥地址***
//               NATIVE_BETH = 0x988b22b8502eC4443dC2a0D5DbbbdB85aBcE3b47
//                ERC20_RETH = 0x94F8fF14EE6D4fbB90750fF4E6630080Cbc29b5d
var rinkeby_contract = new rinkeby_web3.eth.Contract(rinkeby_ABI, rinkeby_contract_address);

console.log('ropsten_bridge subscription start');


async function main() {
    ropsten_web3.eth.subscribe('logs', {
        address: ropsten_contract_address,
        topics: ['0x4db14528ca520835e36decc6d6140e6cefbd849bedda8745497406a62317c80d'] //********这里记得换成监听事件的十六进制
    }, async function(error, result) {
        if (!error)
            console.log('this is ropsten_subcription');
        info = ropsten_web3.eth.abi.decodeLog([{ // 解析日志内容
            type: 'address',
            name: 'token'
        }, {
            type: 'string',
            name: 'symbol'
        }, {
            type: 'uint',
            name: 'fromChainID'
        }, {
            type: 'address',
            name: 'from'
        }, {
            type: 'uint',
            name: 'toChainID'
        }, {
            type: 'address',
            name: 'toAddress'
        }, {
            type: 'uint',
            name: 'amount'
        }], result.data, result.topics); { // 获取log的信息
            SYMBOL = info[1];
            TO_CHAINID = info[4];
            TO = info[5];
            VALUE = info[6];
            console.log(SYMBOL)
            console.log(TO)
            console.log(VALUE)
            console.log(TO_CHAINID)
        }
        if (TO_CHAINID == 4) { //跨到rinkeby,使用rinkeby_web3往rinkeby发交易
            const NotaryGroup = await NotaryGroupManager.methods.getNotaryAddresses().call();

            // 将获取到的公证人组地址数组存储在变量中
            console.log(NotaryGroup);

            console.log("转移金额为" + VALUE);


            // 调用该函数获取结果并打印
            db.getAndUpdateAddressWithMinRandomValue().then(result => {
                console.log(`最小出价: ${result.randomValue*VALUE}, 对应的地址: ${result.address}`);
            }).catch(error => {
                console.error('Error:', error);
            });

            //向sepolia发交易

            var DATA = rinkeby_contract.methods.receipt(SYMBOL, TO, VALUE).encodeABI();
            const signer = rinkeby_web3.eth.accounts.privateKeyToAccount(
                process.env.SIGNER_PRIVATE_KEY,
            );
            console.log(DATA)

            rinkeby_web3.eth.accounts.wallet.add(signer);
            console.log(signer)


            console.log("--------------")

            const tx = {
                from: signer.address,
                to: rinkeby_contract_address,
                //value: rinkeby_web3.utils.toWei("0.1", "ether"),
                //gas: limit,
                gas: 300000,
                nonce: await rinkeby_web3.eth.getTransactionCount(signer.address),
                maxPriorityFeePerGas: rinkeby_web3.utils.toWei("100", "gwei"),
                maxFeePerGas: rinkeby_web3.utils.toWei("200", "gwei"),
                chainId: 11155111,
                data: DATA,
            };
            console.log('will send transaction');

            signedTx = await rinkeby_web3.eth.accounts.signTransaction(tx, signer.privateKey);
            console.log("Raw transaction data: " + signedTx.rawTransaction);
            // Sending the transaction to the network
            const receipt = await rinkeby_web3.eth
                .sendSignedTransaction(signedTx.rawTransaction)
                .once("transactionHash", (txhash) => {
                    console.log(`Mining transaction ...`);
                    console.log(`wss://sepolia.etherscan.io/tx/${txhash}`);
                }).on('receipt', console.log);
            // The transaction is now on chain!
            console.log(`Mined in block ${receipt.blockNumber}`);

            setTimeout(() => {
                // 这部分代码将在10秒后执行
                console.log('10 seconds have passed.');
                // 在这里放置您要延迟执行的代码

                let latestId = 1; // 初始值，将在异步调用后被更新

                db.getLatestRecord()
                    .then(record => {
                        console.log('Latest record:', record);
                        latestId = record[0].id; // 更新latestId为最新记录的ID
                        console.log(latestId);

                        // 准备更新数据
                        const newData = {
                            status: '交易已完成',
                        };
                        const condition = `id = ${latestId}`;

                        // 确保更新操作在获取最新记录之后执行
                        return db.updateData('ft_transaction', newData, condition);
                    })
                    .then(result => {
                        // 更新操作的结果
                        if (result.affectedRows > 0) {
                            console.log(`ft_transaction record with ID ${latestId} has been updated.`);
                        } else {
                            console.log(`No record found with ID ${latestId}.`);
                        }
                    })
                    .catch(err => {
                        console.error('Error:', err);
                    });
            }, 10000); // 10000毫秒 = 10秒


        }
    })
}
main();



console.log('rinkeby_bridge subscription start');
async function subscribe2() {
    rinkeby_web3.eth.subscribe('logs', {
        address: rinkeby_contract_address, //监听rinkeby链上的合约地址的事件
        topics: ['0x4db14528ca520835e36decc6d6140e6cefbd849bedda8745497406a62317c80d'] //********这里记得换
    }, async function(error, result) {
        if (!error)
            console.log('this is rinkeby_subcription');

        info = rinkeby_web3.eth.abi.decodeLog([{ // 解析日志内容
            type: 'address',
            name: 'token'
        }, {
            type: 'string',
            name: 'symbol'
        }, {
            type: 'uint',
            name: 'fromChainID'
        }, {
            type: 'address',
            name: 'from'
        }, {
            type: 'uint',
            name: 'toChainID'
        }, {
            type: 'address',
            name: 'toAddress'
        }, {
            type: 'uint',
            name: 'amount'
        }], result.data, result.topics); { // 获取log的信息
            SYMBOL = info[1];
            TO_CHAINID = info[4];
            TO = info[5];
            VALUE = info[6];
            console.log(SYMBOL)
            console.log(TO)
            console.log(TO_CHAINID)
            console.log(VALUE)
        }
        if (TO_CHAINID == 3) { //跨到ropsten,使用ropsten_web3往ropsten发交易
            var DATA = ropsten_contract.methods.receipt(SYMBOL, TO, VALUE).encodeABI();
            // ropsten_web3.eth.getTransactionCount(fromAddress, ropsten_web3.eth.defaultBlock.pending).then(function(nonce) {
            //     var rawTx = {
            //         chainId: 4224,
            //         nonce: ropsten_web3.utils.toHex(nonce++),
            //         gasLimit: ropsten_web3.utils.toHex(99000),
            //         gasPrice: ropsten_web3.utils.toHex(10e9), // 10 Gwei
            //         to: ropsten_contract_address, //目标合约地址
            //         from: fromAddress, //privateChain_
            //         data: DATA // thanks @abel30567
            //     }
            //     var tx = new Tx(rawTx); // 如果说invalid account ，在tx后面加连的名称 
            //     tx.sign(privateKey);
            //     var serializedTx = tx.serialize();
            //     console.log('will send transaction');
            //     ropsten_web3.eth.sendSignedTransaction('0x' + serializedTx.toString('hex'))
            //         .on('receipt', console.log);
            //     console.log('had been sent transaction');
            // })
            const signer = ropsten_web3.eth.accounts.privateKeyToAccount(
                process.env.SIGNER_PRIVATE_KEY,
            );
            console.log(DATA)

            ropsten_web3.eth.accounts.wallet.add(signer);
            console.log(signer)


            console.log("--------------")

            const tx = {
                from: signer.address,
                to: ropsten_contract_address,
                //value: rinkeby_web3.utils.toWei("0.1", "ether"),
                //gas: limit,
                gas: 300000,
                nonce: await ropsten_web3.eth.getTransactionCount(signer.address),
                maxPriorityFeePerGas: ropsten_web3.utils.toWei("100", "gwei"),
                maxFeePerGas: ropsten_web3.utils.toWei("200", "gwei"),
                chainId: ropsten_web3.eth.net.getId(),
                data: DATA,
            };
            console.log('will send transaction');

            signedTx = await ropsten_web3.eth.accounts.signTransaction(tx, signer.privateKey);
            console.log("Raw transaction data: " + signedTx.rawTransaction);
            // Sending the transaction to the network
            const receipt = await ropsten_web3.eth
                .sendSignedTransaction(signedTx.rawTransaction)
                .once("transactionHash", (txhash) => {
                    console.log(`Mining transaction ...`);

                }).on('receipt', console.log);
            // The transaction is now on chain!
            console.log(`Mined in block ${receipt.blockNumber}`);
        }
    })
}
subscribe2()