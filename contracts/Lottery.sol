//SPDX-License-Identifier: MIT
pragma solidity 0.8.8;

// //import "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";
// import "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";
// // import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
// import "@chainlink/contracts/src/v0.8/vrf/interfaces/VRFCoordinatorV2Interface.sol";
// // import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
// //import "@chainlink/contracts/src/v0.8/interfaces/KeeperCompatibleInterface.sol";

import {VRFConsumerBaseV2Plus} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";
import "@chainlink/contracts/src/v0.8/automation/interfaces/AutomationCompatibleInterface.sol";
import "hardhat/console.sol"; //this is used to console.log variables and stuff in our contracts just like javascript
//we should run tests like 'yarn hardhat test' to see the output of these console.logs in our terminal
//we can use this for debugging

error Lottery__NotEnoughETHEntered();
error Lottery__TransferFailed();
error Lottery__NotOpen();
error Lottery__UpkeepNotNeeded(uint256 currentBalance, uint256 numPlayers, uint256 lotteryState);

//abstract issue was due to missing constructor and missing arguments

/**
 * @title A sample Lottery Contract
 * @author Nabeel Ahmed
 * @notice This contract is for implementing an untamperable and decentralized smart lottery
 * @dev This contract implements Chainlink VRF V2 and Chainlink Keepers
 */

contract Lottery is VRFConsumerBaseV2Plus, AutomationCompatibleInterface {

    //user type declarations
    enum LotteryState {
        OPEN, 
        CALCULATING
    }//enum is basically a uint256 where 0 = OPEN, 1 = CLOSED, etc...

    //state variables
    uint256 private immutable i_entranceFee;
    address payable[] private s_players;
    bytes32 private immutable i_gasLane;
    uint256 private immutable i_subscriptionID;
    uint32 private immutable i_callbackGasLimit;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;
    //VRFCoordinatorV2Interface private immutable i_vrfCoordinator;

    //lottery variables
    address private s_recentWinner;
    LotteryState private s_lotteryState;
    uint256 private s_lastTimeStamp;
    uint256 private immutable i_interval;

    //Events
    event lotteryEnter(address indexed player);
    event RequestedLotteryWinner(uint256 indexed requestId);
    event WinnerPicked(address indexed winner);

    //Functions
    constructor(
        address vrfCoordinatorV2,
        uint256 entranceFee,
        bytes32 gasLane, //keyHash
        uint256 subscriptionID,
        uint32 callbackGasLimit,
        uint256 interval
    ) VRFConsumerBaseV2Plus(vrfCoordinatorV2) {
        i_entranceFee = entranceFee;
        //i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_gasLane = gasLane;
        i_subscriptionID = subscriptionID;
        i_callbackGasLimit = callbackGasLimit;
        s_lotteryState = LotteryState.OPEN; //or LotteryState(0), both are same
        s_lastTimeStamp = block.timestamp;
        i_interval = interval;
    }

    function enterLottery() public payable {
        if (msg.value < i_entranceFee) {
            revert Lottery__NotEnoughETHEntered();
        }
        if(s_lotteryState != LotteryState.OPEN){
            revert Lottery__NotOpen();
        }
        //this does not work as msg.sender is not a payable address, so we have to type cast it to payable type first just like the folowing
        s_players.push(payable(msg.sender));
        //We should emit an event when we update a dynamic array or mapping
        emit lotteryEnter(msg.sender);

        // 'Unreachable code.solidity(5740)' error is maybe due to soilidty version
        // but in my case it was due to incorrect position of '}' bracket
    }

    /**
     * @dev This is the function that the ChainLink Keeper nodes call
     * They look for the 'upKeepNeeded' to return true
     * The following should be true in order to return true
     * 1. Our specified time interval should have passed
     * 2. The lottery should have at least one player, and have some ETH
     * 3. Our subscription is funded with Link
     * 4. The lottery should be in an "open" state i.e. when we are waiting for the random number, we should not allow new players
     * So, we should make a state variable for the above purpose
     */
    function checkUpkeep ( bytes memory /*checkData*/ ) public view override returns ( bool upkeepNeeded, bytes memory /*performData*/ ) {
        bool isOpen = (s_lotteryState == LotteryState.OPEN); //isOpen is true if s_lotteryState is in an open state, otherwise it is false
        bool timePassed = ((block.timestamp - s_lastTimeStamp) > i_interval); //check if the differnce between the start of lottery and current time is greater than the interval
        bool hasPlayers = (s_players.length > 0);
        bool hasBalance = (address(this).balance > 0);
        upkeepNeeded = (isOpen && timePassed && hasPlayers && hasBalance);
        return (upkeepNeeded, "0x0");
    }

    //external functions are a little cheaper than public ones
    function performUpkeep ( bytes calldata /*performData*/ ) external override {
        //There are two steps to get a random number
        //1. Request the random number
        //2. AFter getting that random number, do something with it
        //In this function, we will request the random number
        console.log("1");
        (bool upkeepNeeded, ) = checkUpkeep("");
        if(!upkeepNeeded){
            revert Lottery__UpkeepNotNeeded(address(this).balance, s_players.length, uint256(s_lotteryState));
        }
        console.log("2");
        s_lotteryState = LotteryState.CALCULATING;

        /*uint256 requestId = s_vrfCoordinator.requestRandomWords(
            i_gasLane, //maximum gas price you are willing to pay for a request in wei
            i_subscriptionID, //the subscription ID that this contract uses for funding requests
            REQUEST_CONFIRMATIONS, //how many confirmations chainlink node should wait before responding
            i_callbackGasLimit, //limit for how much gas to use for the callback request to your contract's fulfillRandomWords()
            NUM_WORDS
        );*/
        console.log("3");
        uint256 requestId = s_vrfCoordinator.requestRandomWords(
            VRFV2PlusClient.RandomWordsRequest({
                keyHash: i_gasLane,
                subId: i_subscriptionID,
                requestConfirmations : REQUEST_CONFIRMATIONS,
                callbackGasLimit: i_callbackGasLimit,
                numWords: NUM_WORDS,
                extraArgs: VRFV2PlusClient._argsToBytes(
                    // Set nativePayment to true to pay for VRF requests with Sepolia ETH instead of LINK
                    VRFV2PlusClient.ExtraArgsV1({nativePayment: true})
                )
            })
        );
        console.log("4");
        emit RequestedLotteryWinner(requestId);
        console.log("5");
    }

    function fulfillRandomWords(
        uint256 /*requestId*/,
        uint256[] calldata randomWords
    ) internal override {
        //we are using override with this function because we are overriding a virtual function(this overridden function is present in the chainlink file that we are importing) with the same name
        //In this function, we will fulfil random numbers
        uint256 indexOfWinner = randomWords[0] % s_players.length; //by dividing the random number by the number of players, the winner's index will be equal to remainder
        address payable recentWinner = s_players[indexOfWinner]; //storing the winner's address
        s_recentWinner = recentWinner;
        console.log("111");
        s_lotteryState = LotteryState.OPEN; //changing the state to OPEN
        s_players = new address payable[](0); //resetting the players array
        s_lastTimeStamp = block.timestamp; //reset the time to current time
        console.log("112");
        (bool success, ) = recentWinner.call{value: address(this).balance}(""); //sending the winner the lottery prize
        console.log("113");
        if (!success) {
            revert Lottery__TransferFailed();
        }
        console.log("114");
        emit WinnerPicked(recentWinner);
        console.log("115");
    }

    //View/Pure Functions
    function getEntranceFee() public view returns (uint256) {
        return i_entranceFee;
    }

    function getPlayers(uint256 index) public view returns (address) {
        return s_players[index];
    }

    function getRecentWinner() public view returns (address) {
        return s_recentWinner;
    }

    function getLotteryState() public view returns (LotteryState){
        return s_lotteryState;
    }

    function getNumWords() public pure returns (uint256){ //as we are not reading 'NUM_WORDS' from storage because it is a constant variable, this function can be a 'pure' function instead of 'view'
        return NUM_WORDS;
    }

    function getNumberofPlayers() public view returns (uint256){
        return s_players.length;
    }

    function getLatestTimeStamp() public view returns (uint256){
        return s_lastTimeStamp;
    }

    function getRequestConfirmations() public pure returns (uint256){ //reason for using 'pure' is same as above
        return REQUEST_CONFIRMATIONS;
    }

    function getInterval() public view returns (uint256) {
        return i_interval;
    }
}
