//SPDX-License-Identifier: MIT
pragma solidity 0.8.8;

//import "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";
import "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/vrf/interfaces/VRFCoordinatorV2Interface.sol";

error Lottery__NotEnoughETHEntered();
error Lottery__TransferFailed();

//abstract issue was due to missing constructor and missing arguments
contract Lottery is VRFConsumerBaseV2 {
    uint256 private immutable i_entranceFee;
    address payable[] private s_players;
    bytes32 private immutable i_gasLane;
    uint64 private immutable i_subscriptionID;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private immutable i_callbackGasLimit;
    uint32 private constant NUM_WORDS = 1;
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;

    address private s_recentWinner;

    event lotteryEnter(address indexed player);
    event RequestedLotteryWinner(uint256 indexed requestId);
    event WinnerPicked(address indexed winner);

    constructor(
        address vrfCoordinatorV2,
        uint256 entranceFee,
        bytes32 gasLane,
        uint64 subscriptionID,
        uint32 callbackGasLimit
    ) VRFConsumerBaseV2(vrfCoordinatorV2) {
        i_entranceFee = entranceFee;
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_gasLane = gasLane;
        i_subscriptionID = subscriptionID;
        i_callbackGasLimit = callbackGasLimit;
    }

    function enterLottery() public payable {
        if (msg.value < i_entranceFee) {
            revert Lottery__NotEnoughETHEntered();
        }
        //this does not work as msg.sender is not a payable address, so we have to type cast it to payable type first just like the folowing
        s_players.push(payable(msg.sender));
        //We should emit an event when we update a dynamic array or mapping
        emit lotteryEnter(msg.sender);

        // 'Unreachable code.solidity(5740)' error is maybe due to soilidty version
        //but in my case it was due to incorrect position of '}' bracket
    }

    //external functions are a little cheaper than public ones
    function requestRandomNumber() external {
        //There are two steps to get a random number
        //1. Request the random number
        //2. AFter getting that random number, do something with it
        //In this function, we will request the random number

        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_gasLane, //maximum gas price you are willing to pay for a request in wei
            i_subscriptionID, //the subscription ID that this contract uses for funding requests
            REQUEST_CONFIRMATIONS, //how many confirmations chainlink node should wait before responding
            i_callbackGasLimit, //limit for how much gas to use for the callback request to your contract's fulfillRandomWords()
            NUM_WORDS
        );
        emit RequestedLotteryWinner(requestId);
    }

    function fulfillRandomWords(
        uint256 /*requestId*/,
        uint256[] memory randomWords
    ) internal override {
        //we are using override with this function because we are overriding a virtual function(this overridden function is present in the chainlink file that we are importing) with the same name
        //In this function, we will fulfil random numbers
        uint256 indexOfWinner = randomWords[0] % s_players.length; //by dividing the random number by the number of players, the winner's index will be equal to remainder
        address payable recentWinner = s_players[indexOfWinner]; //storing the winner's address
        s_recentWinner = recentWinner;
        (bool success, ) = recentWinner.call{value: address(this).balance}(""); //sending the winner the lottery prize
        if (!success) {
            revert Lottery__TransferFailed();
        }
        emit WinnerPicked(recentWinner);
    }

    function getEntranceFee() public view returns (uint256) {
        return i_entranceFee;
    }

    function getPlayers(uint256 index) public view returns (address) {
        return s_players[index];
    }

    function getRecentWinner() public view returns (address) {
        return s_recentWinner;
    }
}
