import {expect} from "chai";
import {network} from "hardhat";

const {ethers} = await network.connect();

async function setUpSmartContract() {
    const voting = await ethers.deployContract("Voting");
    const [owner, voter1, voter2, voter3] = await ethers.getSigners();

    return {voting, owner, voter1, voter2, voter3};
}

const WorkflowStatus = {
    RegisteringVoters: 0,
    ProposalsRegistrationStarted: 1,
    ProposalsRegistrationEnded: 2,
    VotingSessionStarted: 3,
    VotingSessionEnded: 4,
    VotesTallied: 5
};

describe("Voting", function () {
    // expected state post deploy
    describe("Post Construct", function () {
        let voting: any;
        let owner: any;

        before(async () => {
            ({voting, owner} = await setUpSmartContract());
        })

        it("Should set the deployer as the owner", async function () {
            expect(await voting.owner()).eq(owner.address);
        });

        it("Should set the initial status at RegisteringVoters", async function () {
            expect(await voting.workflowStatus()).eq(WorkflowStatus.RegisteringVoters);
        });

        it.skip("Should have no registered voters", async function () {
            expect(await voting.getVoters()).is.empty;

        });

        it("Should have no proposals", async function () {
            expect(await voting.getProposalsCount()).eq(0);
        });
    });

    // workflow chek
    describe("Voting Workflow", function () {
        let voting: any;
        let owner: any;
        let voter1: any;

        beforeEach(async function () {
            ({voting, owner, voter1} = await setUpSmartContract());

        });

        describe("Workflow Transitions", function () {

            it("should start proposals registering from RegisteringVoters", async function () {
                await expect(voting.startProposalsRegistering())
                    .to.emit(voting, "WorkflowStatusChange")
                    .withArgs(WorkflowStatus.RegisteringVoters, WorkflowStatus.ProposalsRegistrationStarted);

                expect(await voting.workflowStatus()).to.equal(WorkflowStatus.ProposalsRegistrationStarted);

            });

            it("should end proposals registering", async function () {
                // Setup
                await voting.startProposalsRegistering();

                // End proposals
                expect(await voting.endProposalsRegistering())
                    .to.emit(voting, "WorkflowStatusChange")
                    .withArgs(WorkflowStatus.ProposalsRegistrationStarted, WorkflowStatus.ProposalsRegistrationEnded);

                expect(await voting.workflowStatus()).to.equal(WorkflowStatus.ProposalsRegistrationEnded);
            });

            it("should start voting session", async function () {
                // Setup full flow
                await voting.startProposalsRegistering();
                await voting.endProposalsRegistering();

                // Start voting
                expect(await voting.startVotingSession())
                    .to.emit(voting, "WorkflowStatusChange")
                    .withArgs(WorkflowStatus.ProposalsRegistrationEnded, WorkflowStatus.VotingSessionStarted);

                expect(await voting.workflowStatus()).to.equal(WorkflowStatus.VotingSessionStarted);
            });

            it("should end voting session", async function () {
                // Setup full flow
                await voting.startProposalsRegistering();
                await voting.endProposalsRegistering();
                await voting.startVotingSession();

                // End voting
                expect(await voting.endVotingSession())
                    .to.emit(voting, "WorkflowStatusChange")
                    .withArgs(WorkflowStatus.VotingSessionStarted, WorkflowStatus.VotingSessionEnded);

                expect(await voting.workflowStatus()).to.equal(WorkflowStatus.VotingSessionEnded);
            });

            it("should tally votes session", async function () {
                // Setup full flow
                await voting.startProposalsRegistering();
                await voting.endProposalsRegistering();
                await voting.startVotingSession();
                await voting.endVotingSession();

                // End voting
                expect(await voting.tallyVotes())
                    .to.emit(voting, "WorkflowStatusChange")
                    .withArgs(WorkflowStatus.VotingSessionEnded, WorkflowStatus.VotesTallied);

                expect(await voting.workflowStatus()).to.equal(WorkflowStatus.VotesTallied);
            });

        });

        describe("Access Control (onlyOwner)", function () {

            it("should revert if non-owner calls startProposalsRegistering", async function () {
                await expect(voting.connect(voter1).startProposalsRegistering())
                    .to.be.revertedWithCustomError(voting, "OwnableUnauthorizedAccount")
                    .withArgs(voter1.address);
            });

            it("should revert if non-owner calls endProposalsRegistering", async function () {
                await voting.startProposalsRegistering();

                await expect(voting.connect(voter1).endProposalsRegistering())
                    .to.be.revertedWithCustomError(voting, "OwnableUnauthorizedAccount")
                    .withArgs(voter1.address);
            });

            it("should revert if non-owner calls startVotingSession", async function () {

                await voting.startProposalsRegistering();
                await voting.endProposalsRegistering();

                await expect(voting.connect(voter1).startVotingSession())
                    .to.be.revertedWithCustomError(voting, "OwnableUnauthorizedAccount")
                    .withArgs(voter1.address);
            });

            it("should revert if non-owner calls endVotingSession", async function () {

                await voting.startProposalsRegistering();
                await voting.endProposalsRegistering();
                await voting.startVotingSession();

                await expect(voting.connect(voter1).endVotingSession())
                    .to.be.revertedWithCustomError(voting, "OwnableUnauthorizedAccount")
                    .withArgs(voter1.address);
            });

            it("should revert if non-owner calls tallyVotes", async function () {

                await voting.startProposalsRegistering();
                await voting.endProposalsRegistering();
                await voting.startVotingSession();
                await voting.endVotingSession();

                await expect(voting.connect(voter1).tallyVotes())
                    .to.be.revertedWithCustomError(voting, "OwnableUnauthorizedAccount")
                    .withArgs(voter1.address);
            });
        });

        describe("State Validation", function () {
            it("should revert startProposalsRegistering if not in RegisteringVoters", async function () {
                await voting.startProposalsRegistering();

                await expect(voting.startProposalsRegistering())
                    .to.be.revertedWith("Registering proposals cant be started now");
            });

            it("should revert endProposalsRegistering if not started", async function () {
                await expect(voting.endProposalsRegistering())
                    .to.be.revertedWith("Registering proposals havent started yet");
            });

            it("should revert startVotingSession if proposals not ended", async function () {
                await voting.startProposalsRegistering();
                await expect(voting.startVotingSession())
                    .to.be.revertedWith("Registering proposals phase is not finished");
            });

            it("should revert endVotingSession if not started", async function () {
                await voting.startProposalsRegistering();
                await voting.endProposalsRegistering();

                await expect(voting.endVotingSession())
                    .to.be.revertedWith("Voting session havent started yet");
            });

            it("should revert tallyVotes if not started", async function () {
                await voting.startProposalsRegistering();
                await voting.endProposalsRegistering();
                await voting.startVotingSession();

                await expect(voting.tallyVotes())
                    .to.be.revertedWith("Current status is not voting session ended");
            });

            it("Should not allow skipping workflow steps", async function () {
                await expect(voting.startVotingSession()).to.be.revertedWith("Registering proposals phase is not finished");
            });

            it("Should not allow re-entering a closed phase", async function () {
                await voting.startProposalsRegistering();
                await voting.endProposalsRegistering();

                await expect(voting.startProposalsRegistering()).to.be.revertedWith("Registering proposals cant be started now");
            });

            it("Should allow tallyVotes only once", async function () {
                await voting.addVoter(voter1.address);
                await voting.startProposalsRegistering();
                await voting.connect(voter1).addProposal("Proposal for dummies");
                await voting.endProposalsRegistering();
                await voting.startVotingSession();
                await voting.connect(voter1).setVote(1);
                await voting.endVotingSession();

                await voting.tallyVotes();
                await expect(voting.tallyVotes()).to.be.revertedWith("Current status is not voting session ended");
            });
        });
    });

    // everything is fine
    describe("Nominal Scenario Happy Path", function () {

        let voting: any;
        let owner: any;
        let voter1: any;

        beforeEach(async () => {
            ({voting, owner, voter1} = await setUpSmartContract());
        })

        it("Should register the voter", async function () {

            expect(await voting.workflowStatus()).eq(WorkflowStatus.RegisteringVoters);

            expect(await voting.addVoter(voter1.address))
                .to.emit(voting, "VoterRegistered")
                .withArgs(voter1.address);
        });

        it("Should open the proposal submission, add a proposal and close the submission period", async function () {

            // prepare voter
            await voting.addVoter(voter1.address);
            await voting.startProposalsRegistering()

            const _voting = voting.connect(voter1);

            // add new proposal
            await expect(_voting.addProposal("Proposal for dummies"))
                .to.emit(_voting, "ProposalRegistered")
                .withArgs(1);


            await voting.endProposalsRegistering()

            expect(await voting.workflowStatus()).to.equal(WorkflowStatus.ProposalsRegistrationEnded);

        });

        it("Should open the voting session, cast a vote, and close the voting session", async function () {

            const _voting = voting.connect(voter1);
            // prepare voter
            await voting.addVoter(voter1.address);
            await voting.startProposalsRegistering()
            await _voting.addProposal("Proposal for dummies")
            await voting.endProposalsRegistering()
            await voting.startVotingSession()

            // event triggered
            expect(await _voting.setVote(1))
                .to.emit(_voting, "Voted")
                .withArgs(voter1.address, 1)

            // proposal 0 untouched
            expect((await _voting.getOneProposal(0)).voteCount).eq(0);

            // proposal 1 modified
            expect((await _voting.getOneProposal(1)).voteCount).eq(1);

            // voter has voted
            let _voter = await _voting.getVoter(voter1.address);
            expect(_voter.hasVoted).to.be.true
            expect(_voter.votedProposalId).eq(1);

            // end Vote
            await voting.endVotingSession();
            expect(await voting.workflowStatus()).eq(WorkflowStatus.VotingSessionEnded);

        });

        it("Should tally the votes", async function () {

            const _voting = voting.connect(voter1);
            // prepare voter
            await voting.addVoter(voter1.address);
            await voting.startProposalsRegistering()
            await _voting.addProposal("Proposal for dummies")
            await voting.endProposalsRegistering()
            await voting.startVotingSession()

            // event triggered
            expect(await _voting.setVote(1))
                .to.emit(_voting, "Voted")
                .withArgs(voter1.address, 1)


            // end Vote
            await voting.endVotingSession();
            await voting.tallyVotes();

            // the only cast vote was for proposal &1
            expect(await voting.winningProposalID()).eq(1);
            expect(await voting.workflowStatus()).eq(WorkflowStatus.VotesTallied);

        });

        it("Should return voter details correctly for a registered voter", async function () {

            await voting.addVoter(voter1.address);
            const _voting = voting.connect(voter1);
            const voterInfo = await _voting.getVoter(voter1.address);

            expect(voterInfo.isRegistered).to.be.true;
            expect(voterInfo.hasVoted).to.be.false;
            expect(voterInfo.votedProposalId).to.equal(0);
        });

        it("Should return proposal details correctly", async function () {
            const {voting, voter1} = await setUpSmartContract();

            await voting.addVoter(voter1.address);
            await voting.startProposalsRegistering();

            const _voting = voting.connect(voter1);
            await _voting.addProposal("Proposal for dummies");

            const proposal = await _voting.getOneProposal(1);
            expect(proposal.description).to.equal("Proposal for dummies");
            expect(proposal.voteCount).to.equal(0);
        });

        it("Should return correct proposal count", async function () {
            await voting.addVoter(voter1.address);
            await voting.startProposalsRegistering();

            const _voting = voting.connect(voter1);
            const genesis = await _voting.getOneProposal(0);
            expect(genesis.description).to.equal("GENESIS");
            expect(genesis.voteCount).to.equal(0);

            expect(await _voting.getProposalsCount()).to.equal(1);

            await _voting.addProposal("Proposal for dummies");
            await _voting.addProposal("Proposal for other dummies");

            const count = await _voting.getProposalsCount();
            expect(count).to.equal(3); // GENESIS + 2 proposals
        });

    });

    // everything is wrong
    describe("Nominal Scenario Sad Path", function () {
        let voting: any;
        let owner: any;
        let voter1: any;

        beforeEach(async () => {
            ({voting, owner, voter1} = await setUpSmartContract());
        })

        describe("getters", function () {
            it("Should revert if getVoter called by unregistered address", async function () {
                await expect(voting.connect(voter1).getVoter(voter1.address))
                    .to.be.revertedWith("You're not a voter");
            });
            it("Should revert if getOneProposal called by unregistered address", async function () {
                await expect(voting.connect(voter1).getOneProposal(0))
                    .to.be.revertedWith("You're not a voter");
            });
            it("Should revert if getOneProposal for invalid index", async function () {
                await voting.addVoter(voter1.address);
                await expect(voting.connect(voter1).getOneProposal(10))
                    .to.revertedWithPanic("0x32"); //Array accessed at an out-of-bounds or negative index
            });
        });

        describe("addVoter", function () {
            it("Should revert if called by non-owner", async function () {
                await expect(voting.connect(voter1).addVoter(voter1.address))
                    .to.be.revertedWithCustomError(voting, "OwnableUnauthorizedAccount")
                    .withArgs(voter1.address);
            });
            it("Should revert if registration phase is closed", async function () {
                await voting.startProposalsRegistering();
                await expect(voting.addVoter(voter1.address))
                    .to.be.revertedWith("Voters registration is not open yet");

            });
            it("Should revert if voter already registered", async function () {
                await voting.addVoter(voter1.address)
                await expect(voting.addVoter(voter1.address))
                    .to.be.revertedWith("Already registered");
            });
        });

        describe("addProposal", function () {
            it("Should revert if called by unregistered voter", async function () {
                await voting.startProposalsRegistering();
                await expect(voting.connect(voter1).addVoter(voter1.address))
                    .to.be.revertedWithCustomError(voting, "OwnableUnauthorizedAccount")
                    .withArgs(voter1.address);
            });
            it("Should revert if proposal description is empty", async function () {
            });
        });

        describe("vote", function () {
            it("Should revert if called by unregistered voter", async function () {
                await voting.startProposalsRegistering();
                await voting.endProposalsRegistering();
                await voting.startVotingSession();
                await expect(voting.connect(voter1).setVote(0))
                    .to.be.revertedWith("You're not a voter");
            });
            it("Should revert if voter already voted", async function () {
                await voting.addVoter(voter1.address);
                await voting.startProposalsRegistering();
                await voting.endProposalsRegistering();
                await voting.startVotingSession();
                await voting.connect(voter1).setVote(0);
                await expect(voting.connect(voter1).setVote(0))
                    .to.be.revertedWith("You have already voted");
            });
            it("Should revert if proposal does not exist", async function () {
                await voting.addVoter(voter1.address);
                await voting.startProposalsRegistering();
                await voting.endProposalsRegistering();
                await voting.startVotingSession();
                await expect(voting.connect(voter1).setVote(10))
                    .to.be.revertedWith("Proposal not found");
            });
        });
    });

    // edges cases
    // ill be honest, I used chat gpt to help me figure out what is an "edge case"
    describe("Edge", function () {

        let voting: any;


        beforeEach(async () => {
            ({voting} = await setUpSmartContract());
        });

        it("Should process voting even with dozens of voters and proposals", async function () {
            const signers = await ethers.getSigners();

            // register 10 voters
            for (let i = 1; i <= 10; i++) {
                await voting.addVoter(signers[i].address);
            }

            await voting.startProposalsRegistering();
            const voter1 = voting.connect(signers[1]);
            for (let i = 0; i < 10; i++) {
                await voter1.addProposal(`Prop ${i}`);
            }

            await voting.endProposalsRegistering();
            await voting.startVotingSession();

            // everyone votes for the same proposal
            for (let i = 1; i <= 10; i++) {
                await voting.connect(signers[i]).setVote(1);
            }

            await voting.endVotingSession();
            await voting.tallyVotes();

            expect(await voting.winningProposalID()).to.equal(1);
        });
    });
});
