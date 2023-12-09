//eoslime
const eoslime = require("eoslime").init("local");
const { faker } = require('@faker-js/faker')
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
    let temporaryAdmin
    let arbitrationContract
    let admin

    //base tester
    before(async () => {
        //create blockchain accounts
        arbitrationAccount = await eoslime.Account.createFromName("arbitration")
        testAccount1 = await eoslime.Account.createFromName("testaccount1");
        adminAccount = await eoslime.Account.createFromName('admin')
        temporaryAdmin = await eoslime.Account.createRandom();


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
        const res = await arbitrationContract.actions.init([arbitrationAccount.name], {from: arbitrationAccount});
        assert(res.processed.receipt.status == 'executed', "init() action not executed");

        //assert config table created
        const conf = await arbitrationContract.provider.select('config').from('arbitration').find();
        assert(conf[0].admin == arbitrationAccount.name, "Incorrect Admin");        
    })

    it("Sets admin", async () => {
        //call setadmin() on arbitration contract
        const tempRes = await arbitrationContract.actions.setadmin([temporaryAdmin.name], {from: arbitrationAccount});
        assert(tempRes.processed.receipt.status == 'executed', "setadmin() action not executed");

        //assert config table created
        const tempConfig = await arbitrationContract.provider.select('config').from('arbitration').find();
        assert(tempConfig[0].admin == temporaryAdmin.name, "Incorrect Admin");        

        const res = await arbitrationContract.actions.setadmin([adminAccount.name], {from: temporaryAdmin});
        assert(res.processed.receipt.status == 'executed', "setadmin() action not executed");

        //assert config table created
        const conf = await arbitrationContract.provider.select('config').from('arbitration').find();
        assert(conf[0].admin == adminAccount.name, "Incorrect Admin");

        // assert non-admin cannot set new admin
        try {
            await arbitrationContract.actions.setadmin([temporaryAdmin.name], {from: temporaryAdmin});
        } catch (err) {
            assert(JSON.parse(err).error.name == 'missing_auth_exception', "setadmin() action not failed with invalid authority");
        }
    })    

    it("Sets version", async () => {
        const newVersion = faker.lorem.word({ min: 1, max: 10 })
        const res = await arbitrationContract.actions.setversion([newVersion], { from: adminAccount })
        assert(res.processed.receipt.status == 'executed', "setversion() action not executed");

        //assert table values
        const conf = await arbitrationContract.provider.select('config').from('arbitration').find();
        assert(conf[0].contract_version == newVersion, "Incorrect Contract Version");

        // assert non-admin cannot set new version
        try {
            await arbitrationContract.actions.setversion([newVersion], {from: temporaryAdmin});
        } catch (err) {
            assert(JSON.parse(err).error.name == 'eosio_assert_message_exception', "setversion() action not failed with invalid authority");
        }
    })

    it("Set config", async () => {
        //initialize
        const randNum = Math.floor(Math.random() * 999) / 100
        const newFee = randNum.toFixed(4) + " USD"
        const newNumClaims = Math.floor(Math.random() * 100)

        //call setversion() on arbitration contract
        const res = await arbitrationContract.actions.setconfig([newNumClaims, newFee], {from: adminAccount});
        assert(res.processed.receipt.status == 'executed', "setconfig() action not executed");

        //assert table values
        const conf = await arbitrationContract.provider.select('config').from('arbitration').find();
        assert(conf[0].fee_usd == newFee, "Incorrect fee amount");
        assert(conf[0].max_claims_per_case == newNumClaims, "Incorrect max_claims_per_case");

        // assert non-admin cannot set config
        try {
            await arbitrationContract.actions.setconfig([newNumClaims, newFee], {from: temporaryAdmin});
        } catch (err) {
            assert(JSON.parse(err).error.name == 'missing_auth_exception', "setconfig() action not failed with invalid authority");
        }        
    });

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