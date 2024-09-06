const { network, ethers } = require("hardhat");
const {
  developmentChains,
  networkConfig,
} = require("../helper-hardhat-config");
const { verify } = require("../utils/verify");

// const VRF_SUB_FUND_AMOUNT = ethers.parseEther("2");

module.exports = async function ({ getNamedAccounts, deployments }) {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts(); //this extracts the deployer from the 'namedAccounts' section of our hardhat.config
  const chainId = network.config.chainId;

  const VRF_SUBSCRIPTION_AMT = ethers.parseEther("5");

  let vrfCoordinatorV2Address, subscriptionId, VRFCoordinatorV2_5Mock;

  if (developmentChains.includes(network.name)) {
    //Method 1 - Both methods should be the same but this one does not work
    /*const VRFCoordinatorV2_5Mock = await deployments.get("VRFCoordinatorV2_5Mock");
    vrfCoordinatorV2Address = VRFCoordinatorV2_5Mock.address; //address 1*/
    //log(`address 1: ${vrfCoordinatorV2Address}`);
    // Method 2
    const VRFCoordinatorV2_5MockDeployment = await deployments.get(
      "VRFCoordinatorV2_5Mock"
    );
    /*const */ VRFCoordinatorV2_5Mock = await ethers.getContractAt(
      VRFCoordinatorV2_5MockDeployment.abi,
      VRFCoordinatorV2_5MockDeployment.address
    );
    vrfCoordinatorV2Address = VRFCoordinatorV2_5MockDeployment.address; //address 2
    // log(`address 2: ${vrfCoordinatorV2Address}`);

    // creating a subscription
    const transactionResponse =
      await VRFCoordinatorV2_5Mock.createSubscription();
    const transactionReceipt = await transactionResponse.wait(1);
    // log(`transactionReceipt: ${transactionReceipt}`);
    subscriptionId = transactionReceipt.logs[0].args.subId; // 'TypeError: Cannot read properties of undefined (reading '0')' was an error when I used events instead of logs

    // Funding the subscription
    // On a real network, we would need a link token
    await VRFCoordinatorV2_5Mock.fundSubscription(
      subscriptionId,
      VRF_SUBSCRIPTION_AMT
    );
  } else {
    vrfCoordinatorV2Address = networkConfig[chainId]["vrfCoordinatorV2"];
    subscriptionId = networkConfig[chainId]["subcriptionId"];
  }

  try {
    const entranceFee = networkConfig[chainId]["entranceFee"];
    const gasLane = networkConfig[chainId]["gasLane"];
    const callBackGasLimit = networkConfig[chainId]["callBackGasLimit"];
    const interval = networkConfig[chainId]["interval"];

    const args = [
      vrfCoordinatorV2Address,
      entranceFee,
      gasLane,
      subscriptionId,
      callBackGasLimit,
      interval,
    ];
    const lottery = await deploy("Lottery", {
      from: deployer,
      args: args,
      log: true,
      waitConfirmations: network.config.blockConfirmations || 1,
    });
    /*
  Here the issue is that we should be adding our smartcontract as the consumer to the chainLink vrfCoordinator.
  We do the same through GUI:
  1. Creation of vrfCoordinator (Only required for local testing, on test-net this is already provided by the chainlink)
  2. Creation of subscription
  3. Addition of your smart contract to the consumers list (Only after this, our smartcontract can use requestRandomWords)
  When doing this programatically, we have to add following after we deploy our raffle smart contract
  */

    console.log("Contract Deployed");
    console.log(`Lottery Contract Address: ${lottery.address}`);

    if (developmentChains.includes(network.name)) {
      await VRFCoordinatorV2_5Mock.addConsumer(subscriptionId, lottery.address);
      log("Consumer is added");
    } // remember to add these lines
    if (
      !developmentChains.includes(network.name) &&
      process.env.ETHERSCAN_API_KEY
    ) {
      log("Verifying...");
      await verify(lottery.address, args);
    }

    log("---------------------------");
  } catch (error) {
    console.error("Failed to deploy Lottery Contract: ", error);
  }
};

module.exports.tags = ["all", "lottery"];
