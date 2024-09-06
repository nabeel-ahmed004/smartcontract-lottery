/*const { network, deployments, getNamedAccounts, ethers } = require("hardhat");
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
        console.log("1");
      });

      describe("fullfillRandomWords", function () {
        it("works with live Chainlink VRF and Chainlink Keepers, we get a random winner", async function () {
          const startingTime = await lottery.getLatestTimeStamp();
          const accounts = await ethers.getSigners();
          console.log("2");
          await new Promise(async (resolve, reject) => {
            lottery.once("WinnerPicked", async () => {
              console.log("WinnerPicked event fired!");
              console.log("3");
              try {
                const lotteryState = await lottery.getLotteryState();
                const recentWinner = await lottery.getRecentWinner();
                const winnerEndingBalance = await ethers.provider.getBalance(
                  accounts[0].address
                );
                const endingTimeStamp = await lottery.getLatestTimeStamp();

                console.log("4");
                await expect(lottery.getPlayers(0)).to.be.reverted;
                assert.equal(recentWinner.toString(), accounts[0].address);
                assert.equal(lotteryState.toString(), "0");
                assert.equal(
                  winnerEndingBalance.toString(),
                  (winnerStartingBalance + entranceFee).toString()
                );
                assert(endingTimeStamp > startingTime);
                console.log("5");
                resolve();
              } catch (error) {
                console.log(error);
                reject(error);
              }
            });
            console.log("6");
            const transaction = await lottery.enterLottery({
              value: entranceFee,
            });
            await transaction.wait(1);
            console.log("7");
            const winnerStartingBalance = await ethers.provider.getBalance(
              accounts[0].address
            );
            console.log("Waiting for the event to emit!");
            // const { upkeepNeeded } = await lottery.checkUpkeep.staticCall("0x");
            // console.log(`upkeepNeeded: ${upkeepNeeded}`);
            // await lottery.performUpkeep("0x");
            console.log("8");
            // resolve();
          });
        });
      });
    });
*/

const { assert, expect } = require("chai");
const { deployments, ethers, getNamedAccounts, network } = require("hardhat");
const {
  developmentChains,
  netwokConfig,
} = require("../../helper-hardhat-config");

developmentChains.includes(network.name)
  ? describe.skip
  : describe("Lottery", async () => {
      let deployer;
      let Lottery;
      let accounts;
      let LotteryFee;
      let deployerAddress;
      let winnerStartingBalance;

      beforeEach(async () => {
        accounts = await ethers.getSigners();
        deployer = accounts[0];
        deployerAddress = deployer;
        const lotteryDeployment = await deployments.get("Lottery");
        let lotteryy = await ethers.getContractAt(
          lotteryDeployment.abi,
          lotteryDeployment.address
        );
        Lottery = lotteryy.connect(deployer);
        LotteryFee = await Lottery.getEntranceFee();
      });
      describe("fullfillrandomwords", async () => {
        it("works automatically with ChainlinkVRF and Chainlink Keepers", async () => {
          const startingTimeStamp = await Lottery.getLatestTimeStamp();

          await new Promise(async (resolve, reject) => {
            console.log("Setting up Listener...");
            Lottery.once("WinnerPicked", async () => {
              console.log("Winner picked event is fired !! ");
              // resolve();
              try {
                const LotteryState = await Lottery.getLotteryState();
                const winner = await Lottery.getRecentWinner();
                const winner_endBal = await ethers.provider.getBalance(winner);
                const endingTimeStamp = await Lottery.getLatestTimeStamp();

                assert.equal((await Lottery.getNumPlayers()).toString(), "0");
                assert.equal(
                  winner_endBal.toString(),
                  (await deployer.getBalance()).toString()
                );
                assert.equal(LotteryState, 0);
                assert.equal(
                  winner_endBal.toString(),
                  winnerStartingBalance.add(LotteryFee).toString()
                );
                assert(endingTimeStamp > startingTimeStamp);
                resolve();
              } catch (e) {
                console.log(e);
                reject(e);
              }
            });
            try {
              console.log("Entering the lottery");
              const tx = await Lottery.enterLottery({ value: LotteryFee });
              await tx.wait(1);
              console.log("Player entered");
              // winnerStartingBalance = await deployeradd.getbalance();
              winnerStartingBalance = await ethers.provider.getBalance(
                accounts[0].address
              );
            } catch (e) {
              console.log(e);
              reject(e);
            }
          });
        });
      });
    });
