const deployMockToken = async function ({ deployments, getNamedAccounts }) {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  await deploy("MockToken", {
    from: deployer,
    args: [],
    log: true,
  });
};

module.exports = deployMockToken;
module.exports.tags = ["MockToken"];
