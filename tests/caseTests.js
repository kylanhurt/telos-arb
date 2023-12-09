//eoslime
const eoslime = require("eoslime").init("local");
const { faker } = require('@faker-js/faker')
const assert = require('assert');

//contracts
const ARBITRATION_WASM = "./build/arbitration/arbitration.wasm";
const ARBITRATION_ABI = "./build/arbitration/arbitration.abi";

describe("Case files", function () {
    //increase mocha testing timeframe
    this.timeout(15000);
    let arbitrationAccount
    let arbitratorAccount
    let claimantAccount
    let respondantAccount
    let arbitrationContract

    let def

    //base tester
    before(async () => {
        //create blockchain accounts
        arbitrationAccount = await eoslime.Account.createFromName("arbitration")
        arbitratorAccount = await eoslime.Account.createFromName("arbitrator");
        claimantAccount = await eoslime.Account.createFromName("alice");
        respondantAccount = await eoslime.Account.createFromName("bob");
        adminAccount = await eoslime.Account.createFromName('admin')

        //deploy arbitration contract
        arbitrationContract = await eoslime.Contract.deployOnAccount(
            ARBITRATION_WASM,
            ARBITRATION_ABI,
            arbitrationAccount
        );

        //add eosio.code permission to arbitration@active
        await arbitrationAccount.addPermission('eosio.code');
        // initialize and set config
        await arbitrationContract.actions.init([arbitrationAccount.name], {from: arbitrationAccount});
        await arbitrationContract.actions.setconfig([21, '10.0000 USD'], {from: arbitrationAccount});

        def = {
            claimant: claimantAccount.name,
            claim_link: 'https://ipfs.dstor.cloud/ipfs/somesortofhash',
            respondant: respondantAccount.name,
            arbitrator: arbitratorAccount.name,
            claim_category: 1        
        }
    });


    it("Files valid cases correctly", async () => {
        const res = await arbitrationContract.actions.filecase([
            def.claimant, def.claim_link, def.respondant, def.arbitrator, def.claim_category
        ], { from: claimantAccount })
        assert(res.processed.receipt.status == 'executed', "filecase() action not executed")

        const caseFiles = await arbitrationContract.provider.select('casefiles').from('arbitration').find();
        assert.deepEqual(caseFiles[0], {
            claimant: claimantAccount.name,
            respondant: respondantAccount.name,
            arbitrator: arbitratorAccount.name,
            case_id: 0,
            case_ruling: '',
            case_status: 0,
            number_claims: 1,
            fee_paid_tlos: "0.0000 TLOS",
            approvals: [],
            update_ts: caseFiles[0].update_ts // hard to test this so set to correct value
        }, 'Invalid new casefile data')
    })

    it("Rejects invalid file case info", async () => {
        const randName = faker.lorem.word({ min: 10, max: 12 })
        try {
            await arbitrationContract.actions.filecase([
                randName, def.claim_link, def.respondant, def.arbitrator, def.claim_category
            ], { from: claimantAccount })            
        } catch (err) {
            assert(JSON.parse(err).error.name == 'missing_auth_exception', "filecase() should not allow claimant other than account submitting action");
        }

        const invalidLink = faker.lorem.word({ min: 5, max: 60 })
        try {
            await arbitrationContract.actions.filecase([
                def.claimant, invalidLink, def.respondant, def.arbitrator, def.claim_category
            ], { from: claimantAccount })            
        } catch (err) {
            assert(JSON.parse(err).error.name == 'eosio_assert_code_exception', "filecase() should not accept invalid claim link");
        }
        
        const invalidRespondant = faker.lorem.word({ min: 5, max: 12 })
        try {
            await arbitrationContract.actions.filecase([
                def.claimant, def.claim_link, invalidRespondant, def.arbitrator, def.claim_category
            ], { from: claimantAccount })            
        } catch (err) {
            assert(JSON.parse(err).error.name == 'eosio_assert_message_exception', "filecase() should not accept non-existent respondant");
        }

        const invalidArbitrator = faker.lorem.word({ min: 5, max: 12 })
        try {
            await arbitrationContract.actions.filecase([
                def.claimant, def.claim_link, def.respondant, invalidArbitrator, def.claim_category
            ], { from: claimantAccount })            
        } catch (err) {
            assert(JSON.parse(err).error.name == 'eosio_assert_message_exception', "filecase() should not accept non-existent arbitrators");
        }

        const invalidCategory = Math.floor(Math.random() * 10) + 100
        try {
            await arbitrationContract.actions.filecase([
                def.claimant, def.claim_link, def.respondant, def.arbitrator, invalidCategory
            ], { from: claimantAccount })            
        } catch (err) {
            assert(JSON.parse(err).error.name == 'eosio_assert_message_exception', "filecase() should not accept invalid category");
        }              
    })
});