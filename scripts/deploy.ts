import { ethers } from 'hardhat'

async function main() {
  const factory = await ethers.getContractFactory('EthPool')

  const team = "0x03476207EF6791CB0D021C5F9225bB9d70BC5fb5";
  // If we had constructor arguments, they would be passed into deploy()
  const contract = await factory.deploy(team)

  // The address the Contract WILL have once mined
  console.log(contract.address)

  // The transaction that was sent to the network to deploy the Contract
  console.log(contract.deployTransaction.hash)

  // The contract is NOT deployed yet; we must wait until it is mined
  await contract.deployed()
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
