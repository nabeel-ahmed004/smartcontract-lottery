const { developmentChains } = require("../helper-hardhat-config");
const { network, ethers } = require("hardhat");

// both of these are the args of constructor of VRFCoordinatorV2Mock
const BASE_FEE = ethers.parseEther("0.25"); // 0.25 is the premium. It costs 0.25 Link per request.
const GAS_PRICE_LINK = 1e9; //link per gas // calculated value based on the gas price of the chain

// Chainlink nodes pay the gas fees to give us randomness and do external executions
// So the price of requests change based on the price of gas

module.exports = async function ({ getNamedAccounts, deployments }) {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts(); // 'TypeError: from.toLowerCase is not a function' error was on this line due to missing '{}' around deployer
  const chainId = network.config.chainId;
  const args = [BASE_FEE, GAS_PRICE_LINK];
  if (developmentChains.includes(network.name)) {
    log("Local Network Detected! Deploying Mocks...");

    // deploy a mock vrfCoordinator
    await deploy("VRFCoordinatorV2Mock", {
      from: deployer,
      log: true,
      args: args,
    });

    log("Mocks Deployed!");
    log("-------------------------------");
  }
};

module.exports.tags = ["all", "mocks"];
