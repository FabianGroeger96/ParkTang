pragma solidity ^0.5.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Detailed.sol";

/**
 * @title TangToken
 * @dev Simple ERC20 Token example yielding 10000 tokens pre-assigned to its creator.
 */
contract TangToken is ERC20, ERC20Detailed {
    // modify token name
    string public constant NAME = "Tang Token";
    // modify token symbol
    string public constant SYMBOL = "Token";
    // modify token decimals
    uint8 public constant DECIMALS = 18;
    // modify initial token supply
    uint256 public constant INITIAL_SUPPLY = 10000 * (10 ** uint256(DECIMALS)); // 10000 tokens

    /**
     * @dev Constructor that gives msg.sender all of existing tokens.
     */
    constructor () public ERC20Detailed(NAME, SYMBOL, DECIMALS) {
        _mint(msg.sender, INITIAL_SUPPLY);
    }
}