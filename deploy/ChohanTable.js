const deployChohanTable = async function ({ deployments, getNamedAccounts }) {
  const { deploy } = deployments;
  const { deployer, gameToken } = await getNamedAccounts();

  const feePct = 400; // 2%
  await deploy("ChohanTable", {
    from: deployer,
    args: [gameToken, feePct],
    log: true,
  });
};

module.exports = deployChohanTable;
module.exports.tags = ["ChohanTable"];
