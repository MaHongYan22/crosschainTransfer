const Web3 = require("web3");
const fs = require('fs');
const { clear } = require("console");
const db = require('./dbconfig');
require("dotenv").config();

// 创建 Web3 实例
const ganache_wssurl = "ws://127.0.0.1:8545";
const ganache_web3 = new Web3(new Web3.providers.WebsocketProvider(ganache_wssurl));

const sepolia_wssurl = "wss://sepolia.infura.io/ws/v3/09ee1a2b4bab428eafd67ed3e49ae195";
const sepolia_web3 = new Web3(new Web3.providers.WebsocketProvider(sepolia_wssurl));

// 读取 ABI 和合约地址
const ganache_ABI = JSON.parse(fs.readFileSync("ganacheCrosschainBridge.abi").toString());
const ganache_contract_address = '0x53Ed6649cE42Ff75D2034dd1464A70f3912C7683';
const ganache_contract = new ganache_web3.eth.Contract(ganache_ABI, ganache_contract_address);

const sepolia_ABI = JSON.parse(fs.readFileSync("sepoliaCrosschainBridge.abi").toString());
const sepolia_contract_address = '0x1F3f34F8e75e87Fb2311ae7Ab6C085fbd1539e76';
const sepolia_contract = new sepolia_web3.eth.Contract(sepolia_ABI, sepolia_contract_address);

var NotaryGroupManager_ABI = JSON.parse(fs.readFileSync("NotaryGroupManager.abi").toString());
var NotaryGroupManager_address = '0xDAAC5dC0A6Ca03832dF6627edfcde86c467CbCB2'; //ropsten的跨链桥地址***
//               NATIVE_RETH = 0x4a03c24614a251a1b75c4ccCC5b3bE7b542f716f
//                ERC20_BETH = 0x0392Ae4b926ABf4abDDE26e9E02103d9ac4E6275
var NotaryGroupManager = new ganache_web3.eth.Contract(NotaryGroupManager_ABI, NotaryGroupManager_address);
// 订阅 ganache_bridge 事件
console.log('ganache_bridge subscription start');
ganache_contract.events.CrossChainTransfer()
    .on('data', async(event) => {
        console.log('this is ganache_subcription');
        // 处理事件数据
        try {
            const { tokenId, tokenUri, targetChainRecipient } = event.returnValues;
            console.log(tokenId, tokenUri, targetChainRecipient);
            const NotaryGroup = await NotaryGroupManager.methods.getNotaryAddresses().call();
            // 将获取到的公证人组地址数组存储在变量中
            console.log(NotaryGroup);

            // 调用该函数获取结果并打印
            db.selectAndUpdateNotaryAddress().then(result => {
                console.log(`所选公证人对应的地址: ${result.address}`);
            }).catch(error => {
                console.error('Error:', error);
            });

            // 构造交易数据
            const DATA = sepolia_contract.methods.reMintOnTargetChain(tokenId, tokenUri, targetChainRecipient).encodeABI();
            const signer = sepolia_web3.eth.accounts.privateKeyToAccount(process.env.SIGNER_PRIVATE_KEY);
            sepolia_web3.eth.accounts.wallet.add(signer);

            // 构造交易对象
            const tx = {
                from: signer.address,
                to: sepolia_contract_address,
                gas: 300000,
                nonce: await sepolia_web3.eth.getTransactionCount(signer.address),
                maxPriorityFeePerGas: sepolia_web3.utils.toWei("100", "gwei"),
                maxFeePerGas: sepolia_web3.utils.toWei("200", "gwei"),
                chainId: await sepolia_web3.eth.net.getId(),
                data: DATA,
            };

            // 签名并发送交易
            const signedTx = await sepolia_web3.eth.accounts.signTransaction(tx, signer.privateKey);
            const receipt = await sepolia_web3.eth.sendSignedTransaction(signedTx.rawTransaction);
            console.log(`Mined in block ${receipt.blockNumber}`);
            console.log(receipt)




        } catch (error) {
            console.error("Error occurred:", error);
        }
    })
    .on('error', console.error);



console.log('Sepolia CrossChainNFTMinted event subscription start');

sepolia_contract.events.CrossChainNFTMinted()
    .on('data', async(event) => {
        console.log('this is sepolia_subscription');
        // 处理事件数据
        try {
            const { tokenId } = event.returnValues;
            console.log(`TokenID to burn on Ganache: ${tokenId}`);

            // 构造交易数据
            const DATA = ganache_contract.methods.burnNFT(tokenId).encodeABI();
            const signer = ganache_web3.eth.accounts.privateKeyToAccount(process.env.SIGNER_PRIVATE_KEY);
            ganache_web3.eth.accounts.wallet.add(signer);

            // 构造交易对象
            const tx = {
                from: signer.address,
                to: ganache_contract_address,
                gas: 300000,
                nonce: await ganache_web3.eth.getTransactionCount(signer.address),
                maxPriorityFeePerGas: ganache_web3.utils.toWei("100", "gwei"),
                maxFeePerGas: ganache_web3.utils.toWei("200", "gwei"),
                chainId: await ganache_web3.eth.net.getId(),
                data: DATA,
            };

            // 签名并发送交易
            const signedTx = await ganache_web3.eth.accounts.signTransaction(tx, signer.privateKey);
            const receipt = await ganache_web3.eth.sendSignedTransaction(signedTx.rawTransaction);
            console.log(`Mined in block ${receipt.blockNumber}`);
            console.log(receipt);



            setTimeout(() => {
                // 这部分代码将在10秒后执行
                console.log('10 seconds have passed.');
                // 在这里放置您要延迟执行的代码

                let latestId = 1; // 初始值，将在异步调用后被更新

                db.getLatestNFTRecord()
                    .then(record => {
                        console.log('Latest record:', record);
                        latestId = record[0].transaction_id; // 更新latestId为最新记录的ID
                        console.log(latestId);

                        // 准备更新数据
                        const newData = {
                            status: '交易已完成',
                        };
                        const condition = `transaction_id = ${latestId}`;

                        // 确保更新操作在获取最新记录之后执行
                        return db.updateData('nft_transaction', newData, condition);
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
        } catch (error) {
            console.error("Error occurred:", error);
        }
    })
    .on('error', console.error);