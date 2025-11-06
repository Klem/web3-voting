import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("VotingModule", (m) => {
    const Voting = m.contract("Voting");

    return {Voting };
});