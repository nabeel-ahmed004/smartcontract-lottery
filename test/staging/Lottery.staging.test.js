const { network, deployments, getNamedAccounts, ethers } = require("hardhat");
const {
  developmentChains,
  networkConfig,
} = require("../../helper-hardhat-config");
const { assert, expect } = require("chai");

developmentChains.includes(network.name)
  ? describe.skip
  : describe("Lottery Unit Tests", function () {
      let lottery, entranceFee, deployer, interval; // 'ReferenceError: deployer is not defined' may be solved by declaring deployer outside of beforeEach just like here

      beforeEach(async function () {
        // accounts = await ethers.getSigners();
        deployer = (await getNamedAccounts()).deployer;
        // player = accounts[1];
        const lotteryDeployment = await deployments.get("Lottery");
        lottery = await ethers.getContractAt(
          lotteryDeployment.abi,
          lotteryDeployment.address
        );
        // lottery = lotteryContract.connect(player);

        entranceFee = await lottery.getEntranceFee();
        interval = await lottery.getInterval();

        describe("fullfillRandomWords", function () {
          it("works with live Chainlink VRF and Chainlink Keepers, we get a random winner", async function () {
            const startingTime = await lottery.getLatestTimeStamp();

            await new Promise(async (resolve, reject) => {
              lottery.once("WinnerPicked", async function () {
                console.log("WinnerPicked event fired!");
              });
            });
          });
        });
      });
    });
