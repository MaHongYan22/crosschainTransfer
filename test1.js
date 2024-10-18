const db = require('./dbconfig');

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