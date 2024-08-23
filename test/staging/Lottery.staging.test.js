const { network, deployments, getNamedAccounts, ethers } = require("hardhat");
const {
  developmentChains,
  networkConfig,
} = require("../../helper-hardhat-config");
const { assert, expect } = require("chai");
const { accessListify } = require("ethers");

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
                /*assert.equal(
                  winnerEndingBalance.toString(),
                  (winnerStartingBalance + entranceFee).toString()
                );*/
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
            console.log("8");
          });
        });
      });
    });

// new
/*
const { assert, expect } = require("chai");
const { getNamedAccounts, ethers, network } = require("hardhat");
const { developmentChains } = require("../../helper-hardhat-config");

developmentChains.includes(network.name)
  ? describe.skip
  : describe("Raffle Staging Tests", function () {
      let raffle, raffleEntranceFee, deployer;

      beforeEach(async function () {
        deployer = (await getNamedAccounts()).deployer;
        raffle = await ethers.getContract("Raffle", deployer);
        raffleEntranceFee = await raffle.getEntranceFee();
      });

      describe("fulfillRandomWords", function () {
        it("works with live Chainlink Keepers and Chainlink VRF, we get a random winner", async function () {
          // enter the raffle
          console.log("Setting up test...");
          const startingTimeStamp = await raffle.getLastTimeStamp();
          const accounts = await ethers.getSigners();

          console.log("Setting up Listener...");
          await new Promise(async (resolve, reject) => {
            // setup listener before we enter the raffle
            // Just in case the blockchain moves REALLY fast
            raffle.once("WinnerPicked", async () => {
              console.log("WinnerPicked event fired!");
              try {
                // add our asserts here
                const recentWinner = await raffle.getRecentWinner();
                const raffleState = await raffle.getRaffleState();
                const winnerEndingBalance = await accounts[0].getBalance();
                const endingTimeStamp = await raffle.getLastTimeStamp();

                await expect(raffle.getPlayer(0)).to.be.reverted;
                assert.equal(recentWinner.toString(), accounts[0].address);
                assert.equal(raffleState, 0);
                assert.equal(
                  winnerEndingBalance.toString(),
                  winnerStartingBalance.add(raffleEntranceFee).toString()
                );
                assert(endingTimeStamp > startingTimeStamp);
                resolve();
              } catch (error) {
                console.log(error);
                reject(error);
              }
            });
            // Then entering the raffle
            console.log("Entering Raffle...");
            const tx = await raffle.enterRaffle({ value: raffleEntranceFee });
            await tx.wait(1);
            console.log("Ok, time to wait...");
            const winnerStartingBalance = await accounts[0].getBalance();

            // and this code WONT complete until our listener has finished listening!
          });
        });
      });
    });

// again
*/
