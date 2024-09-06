const { network, deployments, getNamedAccounts, ethers } = require("hardhat");
const {
  developmentChains,
  networkConfig,
} = require("../../helper-hardhat-config");
const { assert, expect } = require("chai");

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Lottery Unit Tests", async () => {
      let lottery,
        vrfCoordinatorV2_5Mock,
        entranceFee,
        deployer,
        player,
        interval,
        lotteryPlayer,
        vrfCoordinatorV2_5; // 'ReferenceError: deployer is not defined' may be solved by declaring deployer outside of beforeEach just like here
      const chainId = network.config.chainId;

      vrfCoordinatorV2_5 = "0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B";
      beforeEach(async function () {
        deployer = (await getNamedAccounts()).deployer;
        accounts = await ethers.getSigners();
        player = accounts[1];

        await deployments.fixture(["all"]); //deploys all the files with export tag "all"
        const lotteryDeployment = await deployments.get("Lottery");
        lottery = await ethers.getContractAt(
          lotteryDeployment.abi,
          lotteryDeployment.address
        );
        lotteryPlayer = lottery.connect(player);

        const vrfCoordinatorV2_5MockDeployment = await deployments.get(
          "VRFCoordinatorV2_5Mock"
        );
        vrfCoordinatorV2_5Mock = await ethers.getContractAt(
          vrfCoordinatorV2_5MockDeployment.abi,
          vrfCoordinatorV2_5MockDeployment.address
        );
        entranceFee = await lottery.getEntranceFee();
        interval = await lottery.getInterval();
      });

      describe("Constructor", function () {
        it("Initializes the lottery correctly", async function () {
          // Ideally, each 'it' should have only one assert
          const lotteryState = await lottery.getLotteryState(); // lotterystate would be a big number because getLotteryState returns a unit256
          const interval = await lottery.getInterval();
          assert.equal(lotteryState.toString(), "0"); // assert lottery is in an OPEN state // 0 is for OPEN in our enum
          assert.equal(interval.toString(), networkConfig[chainId]["interval"]);
        });
      });

      describe("enterLottery", function () {
        it("Reverts if not enough is paid", async function () {
          await expect(lottery.enterLottery()).to.be.revertedWithCustomError(
            lottery, //contract name
            "Lottery__NotEnoughETHEntered" //custom error
          );
        });

        it("Records players when they enter", async function () {
          await lotteryPlayer.enterLottery({ value: entranceFee });
          const playerFromContract = await lotteryPlayer.getPlayers(0);
          assert.equal(playerFromContract, player.address);
        });

        it("Emits an event on enter", async function () {
          await expect(lottery.enterLottery({ value: entranceFee })).to.emit(
            lottery,
            "lotteryEnter"
          );
        });

        it("does not allow entrance when the lottery is in calculating state", async function () {
          await lottery.enterLottery({ value: entranceFee });

          // we are doing the following two things so that the 'checkUpkeep' function returns true when we call 'performUpkeep'
          //we can use 'send' to call 'Special testing/debugging functions' that can be seen on the hardhat website
          await network.provider.send("evm_increaseTime", [
            ethers.toNumber(interval) + 1,
          ]); // used to move ahead of time

          // both of the following do the same thing // but first one's a little faster
          await network.provider.send("evm_mine", []); // empty [] means to mine one block // used to mine blocks ahead of time
          // await network.provider.request({ method: "evm_mine", params: [] });

          // Now we pretend to be a Chainlink keeper
          await lottery.performUpkeep("0x"); // [] means passing empty calldata but it gave an error so passing '"0x"' solved it
          await expect(
            lottery.enterLottery({ value: entranceFee })
          ).to.be.revertedWithCustomError(lottery, "Lottery__NotOpen");
        });
      });
      describe("Upkeep", function () {
        it("Returns false if no ETH is sent because no player has joined", async function () {
          // everything is true except there is no ETH and no player
          await network.provider.send("evm_increaseTime", [
            ethers.toNumber(interval) + 1,
          ]);

          await network.provider.send("evm_mine", []);
          const { upkeepNeeded } = await lottery.checkUpkeep.staticCall("0x");
          // await lottery.callStatic.checkUpkeep("0x") does not work in Ethers v6

          // by using 'callStatic', I can simulate calling this tx and seeing what it will respond
          // because if we are not using 'callStatic', the 'await lottery.checkUpkeep([])' will kick off a transaction because 'checkUpkeep()' is a public function
          assert(!upkeepNeeded);
        });

        it("returns false if lottery is not open", async function () {
          // everything is true except lottery is in a closed state
          await lottery.enterLottery({ value: entranceFee });
          await network.provider.send("evm_increaseTime", [
            ethers.toNumber(interval) + 1,
          ]);
          await network.provider.send("evm_mine", []);
          await lottery.performUpkeep("0x");
          const lotteryState = await lottery.getLotteryState();
          const { upkeepNeeded } = await lottery.checkUpkeep.staticCall("0x");
          assert.equal(lotteryState.toString(), "1");
          assert.equal(upkeepNeeded, false);
        });

        it("returns false if enough time has not passed", async function () {
          // everything is true except time passed
          await lottery.enterLottery({ value: entranceFee });
          await network.provider.send("evm_increaseTime", [
            ethers.toNumber(interval) - 2,
          ]);
          await network.provider.send("evm_mine", []);
          const { upkeepNeeded } = await lottery.checkUpkeep.staticCall("0x");
          assert(!upkeepNeeded);
        });

        it("returns true if enough time has passed, there is some ETH, is in open state and has at least one player", async function () {
          // everything is true
          await lottery.enterLottery({ value: entranceFee });
          await network.provider.send("evm_increaseTime", [
            ethers.toNumber(interval) + 1,
          ]);
          await network.provider.send("evm_mine", []);
          const { upkeepNeeded } = await lottery.checkUpkeep.staticCall("0x");
          assert(upkeepNeeded);
        });
      });
      describe("peformUpkeep", function () {
        it("it only runs if checkUpkeep returns true", async function () {
          await lottery.enterLottery({ value: entranceFee });
          await network.provider.send("evm_increaseTime", [
            ethers.toNumber(interval) + 1,
          ]);
          await network.provider.send("evm_mine", []);
          const tx = await lottery.performUpkeep("0x");
          assert(tx);
        });

        it("reverts if checkUpkeep returns false", async function () {
          await expect(
            lottery.performUpkeep("0x")
          ).to.be.revertedWithCustomError(lottery, "Lottery__UpkeepNotNeeded");
        });

        it("updates the lottery state, emits an event and calls the VRF Coordinator", async function () {
          await lottery.enterLottery({ value: entranceFee });
          await network.provider.send("evm_increaseTime", [
            ethers.toNumber(interval) + 1,
          ]);
          await network.provider.send("evm_mine", []);
          const transactionResponse = await lottery.performUpkeep("0x");
          const transactionReceipt = await transactionResponse.wait(1);

          const requestId = transactionReceipt.logs[1].args.requestId;
          // before we emit an event on the line 'emit RequestedLotteryWinner(requestId)', 'i_vrfCoordinator.requestRandomWords(...)' (continued on the next line)
          // emits an event and we can get 'requestId' from the second event. Therefore we are using '1'st index instead of '0'th
          const lotteryState = await lottery.getLotteryState();
          assert(requestId > 0);
          assert(ethers.toNumber(lotteryState) == 1);
        });
      });
      describe("fulfillRandomWords", function () {
        beforeEach(async function () {
          await lottery.enterLottery({ value: entranceFee });
          await network.provider.send("evm_increaseTime", [
            ethers.toNumber(interval) + 1,
          ]);
          await network.provider.send("evm_mine", []);
        });

        it("fulfillRandomWords can only be called after performUpkeep", async function () {
          await expect(
            vrfCoordinatorV2_5Mock.fulfillRandomWords(0, lottery.target)
          ).to.be.revertedWithCustomError(
            vrfCoordinatorV2_5Mock,
            "InvalidRequest"
          );
          await expect(
            vrfCoordinatorV2_5Mock.fulfillRandomWords(1, lottery.target)
          ).to.be.revertedWithCustomError(
            vrfCoordinatorV2_5Mock,
            "InvalidRequest"
          );
          console.log("Cleared!");
          console.log("***********************");
        });

        it("picks a winner, resets the lottery and sends the money", async function () {
          const additionalPlayers = 4;
          const startingAccountIndex = 2; // because 0th account is of the deployer, 1st account is of the player so we start with 2nd index
          const accounts = await ethers.getSigners();
          // after this loop, we are going to have 5 players
          console.log("11");
          for (
            let i = startingAccountIndex;
            i < startingAccountIndex + additionalPlayers;
            i++
          ) {
            /*1*/ const accountConnectedWithLottery = lottery.connect(
              accounts[i]
            );
            await accountConnectedWithLottery.enterLottery({
              value: entranceFee,
            });
          }
          console.log("12");
          const startingTimeStamp = await lottery.getLatestTimeStamp(); // stores starting timestamp (before we fire our event)
          // when we call 'performUpkeep()', we are acting as the chanilink keepers
          // when we call 'fulfillRandomWords()', we are acting as the chainlink VRF
          // we will have to wait for the 'fulfillRandomWords()' to be called
          console.log("13");
          await new Promise(async (resolve, reject) => {
            // when the WinnerPicked event emits, do some stuff in the async function
            lottery.once("WinnerPicked", async () => {
              console.log("Found the event!");
              console.log("14");
              // assert throws an error if it fails, so we need to wrap
              // it in a try/catch so that the promise returns event
              // if it fails.
              try {
                console.log("15");
                const recentWinner = await lottery.getRecentWinner();
                console.log(`Winner: ${recentWinner}`);
                const WinnerEndingBalance =
                  await accounts[2].provider.getBalance(accounts[2].address);
                const numberOfPlayers = await lottery.getNumberofPlayers();
                const lotteryState = await lottery.getLotteryState();
                const endingTimeStamp = await lottery.getLatestTimeStamp();
                console.log("16");
                assert(endingTimeStamp > startingTimeStamp);
                assert.equal(numberOfPlayers.toString(), "0");
                assert.equal(lotteryState.toString(), "0");
                assert.equal(
                  WinnerEndingBalance.toString(),
                  (
                    WinnerStartingBalance +
                    entranceFee * ethers.toBigInt(additionalPlayers) +
                    entranceFee
                  ).toString()
                );
                console.log("17");
                resolve(); // if try passes, resolves the promise
              } catch (e) {
                reject(e); // if try fails, rejects the promise
              }
            });
            // We are setting up the listener
            // below, firstly we wil fire the event and then the above listener will pick it up and resolves it
            console.log("18");
            const transaction = await lottery.performUpkeep("0x");
            const transactionReceipt = await transaction.wait(1);
            const WinnerStartingBalance = await accounts[2].provider.getBalance(
              accounts[2].address
            );
            console.log("19");
            console.log(`tx: ${transactionReceipt.logs[1].args.requestId}`);
            console.log(`address: ${lottery.target}`);
            await vrfCoordinatorV2_5Mock.fulfillRandomWords(
              transactionReceipt.logs[1].args.requestId,
              lottery.target
            );
            console.log("20");
          });
        });
      });
    });
