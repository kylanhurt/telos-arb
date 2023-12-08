//eoslime
const eoslime = require("eoslime").init("local");
const assert = require('assert');
const { CLIENT_RENEG_LIMIT } = require("tls");

//contracts
const ARBITRATION_WASM = "./build/arbitration/arbitration.wasm";
const ARBITRATION_ABI = "./build/arbitration/arbitration.abi";

describe("Arbitration Tests", function () {
    //increase mocha testing timeframe
    this.timeout(15000);
    let arbitrationAccount
    let testAccount1
    let admin

    //base tester
    before(async () => {
        //create blockchain accounts
        arbitrationAccount = await eoslime.Account.createFromName("arbitration")
        testAccount1 = await eoslime.Account.createFromName("testaccount1");
        admin = await eoslime.Account.createFromName('admin')


        //deploy arbitration contract
        arbitrationContract = await eoslime.Contract.deployOnAccount(
            ARBITRATION_WASM,
            ARBITRATION_ABI,
            arbitrationAccount
        );

        //add eosio.code permission to arbitration@active
        await arbitrationAccount.addPermission('eosio.code');
    });

    it("Initializes", async () => {
        //call init() on arbitration contract
        const res = await arbitrationContract.actions.init(["arbitration", "v0.1.0", arbitrationAccount.name], {from: arbitrationAccount});
        assert(res.processed.receipt.status == 'executed', "init() action not executed");

        //assert config table created
        const conf = await arbitrationContract.provider.select('config').from('arbitration').find();
        assert(conf[0].admin == arbitrationAccount.name, "Incorrect Admin");        
    })

    it("Change Version", async () => {
        //initialize
        const newVersion = "0.2.0";

        //call setversion() on arbitration contract
        const res = await arbitrationContract.actions.setversion([newVersion], {from: arbitrationAccount});
        assert(res.processed.receipt.status == 'executed', "setversion() action not executed");

        //assert table values
        const conf = await arbitrationContract.provider.select('config').from('arbitration').find();
        assert(conf[0].contract_version == newVersion, "Incorrect Contract Version");
    });

    // it("Change Admin", async () => {
    //     //initialize
    //     const newAdmin = await eoslime.Account.createRandom();

    //     //call setversion() on arbitration contract
    //     const res = await arbitrationContract.actions.setadmin([newAdmin.name], {from: arbitrationAccount});
    //     assert(res.processed.receipt.status == 'executed', "setadmin() action not executed");

    //     //assert table values
    //     const conf = await arbitrationContract.provider.select('config').from('arbitration').find();
    //     assert(conf[0].admin == newAdmin.name, "Incorrect Admin Account");
    // });

    // it("Create Task", async () => {
    //     //initialize
    //     const taskMessage = "Test Message";

    //     //call createtask() on arbitration contract
    //     const res = await arbitrationContract.actions.createtask([testAccount1.name, taskMessage], {from: testAccount1});
    //     assert(res.processed.receipt.status == 'executed', "createtask() action not executed");

    //     //assert table values
    //     const tasksTable = await arbitrationContract.provider.select('tasks').from('arbitration').scope(testAccount1.name).find();
    //     assert(tasksTable[0].task_id == 0, "Incorrect Task ID");
    //     assert(tasksTable[0].completed == false, "Incorrect Completed State");
    //     assert(tasksTable[0].message == taskMessage, "Incorrect Task Message");
    // });

    // it("Update Task Message", async () => {
    //     //initialize
    //     const newTaskMessage = "Get Milk";
    //     const taskID = 0;

    //     //call updatemsg() on arbitration contract
    //     const res = await arbitrationContract.actions.updatemsg([testAccount1.name, taskID, newTaskMessage], {from: testAccount1});
    //     assert(res.processed.receipt.status == 'executed', "updatemsg() action not executed");

    //     //assert table values
    //     const tasksTable = await arbitrationContract.provider.select('tasks').from('arbitration').scope(testAccount1.name).find();
    //     assert(tasksTable[0].task_id == 0, "Incorrect Task ID");
    //     assert(tasksTable[0].message == newTaskMessage, "Incorrect Task Message");
    // });

    // it("Complete Task", async () => {
    //     //initialize
    //     const taskID = 0;

    //     //call completetask() on arbitration contract
    //     const res = await arbitrationContract.actions.completetask([testAccount1.name, taskID], {from: testAccount1});
    //     assert(res.processed.receipt.status == 'executed', "completetask() action not executed");

    //     //assert table values
    //     const tasksTable = await arbitrationContract.provider.select('tasks').from('arbitration').scope(testAccount1.name).find();
    //     assert(tasksTable[0].task_id == 0, "Incorrect Task ID");
    //     assert(tasksTable[0].completed == true, "Incorrect Completed State");
    // });

    // it("Delete Task", async () => {
    //     //initialize
    //     const taskID = 0;

    //     //call deletetask() on arbitration contract
    //     const res = await arbitrationContract.actions.deletetask([testAccount1.name, taskID], {from: testAccount1});
    //     assert(res.processed.receipt.status == 'executed', "deletetask() action not executed");

    //     //assert table values
    //     const tasksTable = await arbitrationContract.provider.select('tasks').from('arbitration').scope(testAccount1.name).find();
    //     assert(tasksTable.length == 0, "Task Not Deleted");
    // });
    
});