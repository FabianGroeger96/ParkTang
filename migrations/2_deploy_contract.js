const TangToken = artifacts.require("./TangToken.sol");
module.exports = function(deployer) {
    deployer.deploy(TangToken);
};