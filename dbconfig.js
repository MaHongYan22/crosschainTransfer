// database.js
const mysql = require('mysql');
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '123456',
    database: 'crosschain'
});

const query = (sql, params) => {
    return new Promise((resolve, reject) => {
        pool.query(sql, params, (error, results) => {
            if (error) {
                reject(error);
            } else {
                resolve(results);
            }
        });
    });
};

const insertData = (tableName, data) => {
    const fields = Object.keys(data).join(', ');
    const placeholders = Object.keys(data).map(() => '?').join(', ');
    const sql = `INSERT INTO ${tableName} (${fields}) VALUES (${placeholders})`;
    return query(sql, Object.values(data));
};

const updateData = (tableName, data, condition) => {
    const updates = Object.keys(data).map(key => `${key} = ?`).join(', ');
    const sql = `UPDATE ${tableName} SET ${updates} WHERE ${condition}`;
    return query(sql, Object.values(data));
};

const deleteData = (tableName, condition) => {
    const sql = `DELETE FROM ${tableName} WHERE ${condition}`;
    return query(sql);
};

const selectData = (tableName, conditions = '1=1') => {
    const sql = `SELECT * FROM ${tableName} WHERE ${conditions}`;
    return query(sql);
};


// 假设这个函数在 database.js 中
const getLatestRecord = () => {
    const sql = 'SELECT * FROM ft_transaction ORDER BY create_time DESC LIMIT 1';
    return query(sql);
};

// 假设这个函数在 database.js 中
const getLatestNFTRecord = () => {
    const sql = 'SELECT * FROM nft_transaction ORDER BY create_time DESC LIMIT 1';
    return query(sql);
};
// 记录上次选中的地址
let lastSelectedAddress = null;

// 更新数据库中对应地址的信用值
const updateCreditScore = async(address) => {
    const sql = `UPDATE notary_reputation SET reputation_score = reputation_score + 1 WHERE notary_address = ?`;
    await query(sql, [address]);
};

// 获取具有最小随机数的地址并更新信用值
const getAndUpdateAddressWithMinRandomValue = async() => {
    // 获取所有地址和信用值
    const sql = 'SELECT notary_address, reputation_score FROM notary_reputation';
    const records = await query(sql);

    const totalCredit = records.reduce((sum, record) => sum + record.reputation_score, 0);
    const averageCredit = totalCredit / records.length;

    const greaterOrEqualAverage = [];
    const lessThanAverage = [];

    records.forEach(record => {
        if (record.reputation_score >= averageCredit) {
            greaterOrEqualAverage.push(record);
        } else {
            lessThanAverage.push(record);
        }
    });

    const greaterCount = greaterOrEqualAverage.length;
    const lessCount = lessThanAverage.length;

    const largerArray = greaterCount >= lessCount ? greaterOrEqualAverage : lessThanAverage;

    // 使用随机数映射数组，确保选中的地址不同于上次
    let selectedAddress = null;
    let minRandomValue = null;

    while (true) {
        const randomMapping = largerArray.map(record => ({
            address: record.notary_address,
            randomValue: Math.random()
        }));

        // 找出最小随机数和对应的地址
        const minRandom = randomMapping.reduce((min, current) => current.randomValue < min.randomValue ? current : min);

        // 检查是否与上次选中的地址不同
        if (minRandom.address !== lastSelectedAddress) {
            selectedAddress = minRandom.address;
            minRandomValue = minRandom.randomValue;
            break;
        }
    }

    // 更新数据库中对应地址的信用值
    await updateCreditScore(selectedAddress);

    // 记录这次选中的地址作为下次的参考
    lastSelectedAddress = selectedAddress;

    return {
        address: selectedAddress,
        randomValue: minRandomValue
    };
};


// 获取并随机挑选NFT转发公证人地址
const selectAndUpdateNotaryAddress = async() => {
    // 获取所有地址和信用值
    const sql = 'SELECT notary_address, reputation_score FROM notary_reputation';
    const records = await query(sql);

    const totalCredit = records.reduce((sum, record) => sum + record.reputation_score, 0);
    const averageCredit = totalCredit / records.length;

    const greaterOrEqualAverage = [];
    const lessThanAverage = [];

    records.forEach(record => {
        if (record.reputation_score >= averageCredit) {
            greaterOrEqualAverage.push(record);
        } else {
            lessThanAverage.push(record);
        }
    });

    const greaterCount = greaterOrEqualAverage.length;
    const lessCount = lessThanAverage.length;

    // 选择较大组的数组
    const largerArray = greaterCount >= lessCount ? greaterOrEqualAverage : lessThanAverage;

    let selectedAddress = null;

    while (true) {
        // 在较大组数组中随机挑选一个地址
        const randomIndex = Math.floor(Math.random() * largerArray.length);
        const candidateAddress = largerArray[randomIndex].notary_address;

        // 检查是否与上次选中的地址不同
        if (candidateAddress !== lastSelectedAddress) {
            selectedAddress = candidateAddress;
            break;
        }
    }

    // 更新数据库中对应地址的信用值
    await updateCreditScore(selectedAddress);

    // 记录这次选中的地址作为下次的参考
    lastSelectedAddress = selectedAddress;

    return {
        address: selectedAddress
    };
};


module.exports = {
    insertData,
    updateData,
    deleteData,
    selectData,
    getLatestRecord,
    getLatestNFTRecord,
    getAndUpdateAddressWithMinRandomValue,
    selectAndUpdateNotaryAddress

};