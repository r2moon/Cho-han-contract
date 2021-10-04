const { utils } = require("ethers");

const deployChohanDice = async function ({ deployments, getNamedAccounts }) {
  const { deploy } = deployments;
  const { deployer, gameToken, table, linkToken, vrfCoordinator } =
    await getNamedAccounts();

  // rinkeby vrf config
  const vrfKeyhash =
    "0x2ed0feb3e7fd2022120aa84fab1945545a9f2ffc9076fd6156fa96eaff4c1311";
  const vrfFee = utils.parseEther("0.1");

  await deploy("ChohanDice", {
    from: deployer,
    args: [
      gameToken,
      table,
      vrfCoordinator,
      linkToken,
      vrfKeyhash,
      vrfFee,
      utils.parseEther("1"),
    ],
    log: true,
  });
};

module.exports = deployChohanDice;
module.exports.tags = ["ChohanDice"];
