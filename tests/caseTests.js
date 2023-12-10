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

        // now also check 'claims' table
        const claims = await arbitrationContract.provider.select('claims').from('arbitration').scope('0').find();
        assert.deepEqual(claims[0], {
            ...claims[0],
            claim_id: 0,
            claim_summary: def.claim_link,
            decision_link: '',
            response_link: '',
            claim_info_needed: 0,
            response_info_needed: 0,
            status: 1,
            claim_category: def.claim_category,
        }, 'Claim data incorrect')
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

    describe('Handles arbitrator approval by respondant correctly', async () => {
        it('Non-respondant cannot accept arb', async () => {
            try {
                await arbitrationContract.actions.acceptarb([def.respondant, 0], { from: claimantAccount })
            } catch (err) {
                assert(JSON.parse(err).error.name == 'missing_auth_exception', "acceptarb() should not be accepted by non-respondant");
            }
            
            try {
                await arbitrationContract.actions.acceptarb([def.claimant, 0], { from: claimantAccount })
            } catch (err) {
                assert(JSON.parse(err).error.name == 'eosio_assert_message_exception', "acceptarb() should not be accepted by non-respondant");
            }                
        })

        it('Respondant accepts arb', async () => {
            const res = await arbitrationContract.actions.acceptarb([def.respondant, 0], { from: respondantAccount })
            assert(res.processed.receipt.status == 'executed', "acceptarb() action not executed");
            const claims = await arbitrationContract.provider.select('casefiles').from('arbitration').find();
            assert(claims[0].case_status == 1, 'acceptarb() should progress case status by 1')
        })
    })

    describe('Handles arbitrator acceptance by arbitrator correctly', async () => {
        it('Non-respondant cannot accept arb', async () => {
            try {
                await arbitrationContract.actions.arbacceptnom([def.arbitrator, 0], { from: respondantAccount })
            } catch (err) {
                assert(JSON.parse(err).error.name == 'missing_auth_exception', "acceptarb() should not be accepted by non-respondant");
            }
            
            try {
                await arbitrationContract.actions.arbacceptnom([def.claimant, 0], { from: claimantAccount })
            } catch (err) {
                assert(JSON.parse(err).error.name == 'eosio_assert_message_exception', "acceptarb() should not be accepted by non-respondant");
            }                
        })

        it('Respondant accepts arb', async () => {
            const res = await arbitrationContract.actions.arbacceptnom([def.arbitrator, 0], { from: arbitratorAccount })
            assert(res.processed.receipt.status == 'executed', "arbacceptnom() action not executed");
            const claims = await arbitrationContract.provider.select('casefiles').from('arbitration').find();
            assert(claims[0].case_status == 2, 'arbacceptnom() should progress case status by 1')
        })
    })

    describe('cancel case', async () => {
        it('Respondant should not be able to cancel case', async () => {
            try {
                await arbitrationContract.actions.cancelcase([0], { from: respondantAccount })
            } catch (err) {
                assert(JSON.parse(err).error.name == 'missing_auth_exception', "cancelcase() should not be enacted by respondant");
            }   
        })

        it('Claimant should be able to cancel case', async () => {
            const res = await arbitrationContract.actions.cancelcase([0], { from: claimantAccount })
            assert(res.processed.receipt.status == 'executed', "cancelcase() action not executed");
            const claims = await arbitrationContract.provider.select('casefiles').from('arbitration').find();
            assert(claims[0].case_status == 8, 'cancelcase() should set case status to 8')            
        })
    })

    describe('start case', async () => {
        const res = await arbitrationContract.actions.filecase([
            def.claimant, def.claim_link, def.respondant, def.arbitrator, def.claim_category
        ], { from: claimantAccount })
        assert(res.processed.receipt.status == 'executed', "filecase() action not executed")

        const caseFiles = await arbitrationContract.provider.select('casefiles').from('arbitration').find();
        assert.deepEqual(caseFiles[0], {
            claimant: claimantAccount.name,
            respondant: respondantAccount.name,
            arbitrator: arbitratorAccount.name,
            case_id: 1,
            case_ruling: '',
            case_status: 0,
            number_claims: 1,
            fee_paid_tlos: "0.0000 TLOS",
            approvals: [],
            update_ts: caseFiles[0].update_ts // hard to test this so set to correct value
        }, 'Subsequent case ID incorrect')
        const res2 = await arbitrationContract.actions.acceptarb([def.respondant, 0], { from: respondantAccount })
        assert(res2.processed.receipt.status == 'executed', "acceptarb() action not executed");
        const claims3 = await arbitrationContract.provider.select('casefiles').from('arbitration').find();
        assert(claims3[0].case_status == 1, 'acceptarb() should progress case status by 1')
        const res4 = await arbitrationContract.actions.arbacceptnom([def.arbitrator, 0], { from: arbitratorAccount })
        assert(res4.processed.receipt.status == 'executed', "arbacceptnom() action not executed");
        const claims5 = await arbitrationContract.provider.select('casefiles').from('arbitration').find();
        assert(claims5[0].case_status == 2, 'arbacceptnom() should progress case status by 1')
        
        it('starts case correctly', async () => {
            try {

            } catch (err) {
                
            }
        })
    })
});