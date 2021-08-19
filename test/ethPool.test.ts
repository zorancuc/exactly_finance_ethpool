import { expect } from 'chai'
import { ethers } from 'hardhat'
import { Signer, utils } from "ethers";
import '@nomiclabs/hardhat-ethers'

import { EthPool__factory, EthPool } from '../build/types'

const { getContractFactory, getSigners } = ethers

describe('ETH Pool', () => {
  let ethPool: EthPool

  let signerTeam;
  let signerUserA;
  let signerUserB;

  let team;
  let userA;
  let userB;

  beforeEach(async () => {
    // 1
    const signers = await getSigners()

    team = await signers[1].getAddress();
    userA = await signers[2].getAddress();
    userB = await signers[3].getAddress();

    signerTeam = signers[1];
    signerUserA = signers[2];
    signerUserB = signers[3];

    // 2
    const ethPoolFactory = (await getContractFactory('EthPool', signers[0])) as EthPool__factory
    ethPool = await ethPoolFactory.deploy(team)
    await ethPool.deployed()

    const teamAddr = await ethPool.team();
    expect(teamAddr).to.eq(team)

  })

  // 4
  describe('deposit ETH', async () => {
    it('deposit fail for team ', async () => {
        const depositAmount = utils.parseUnits('100', 18)
        const tx = ethPool.connect(signerTeam).depositETH({value: depositAmount });
        await expect(tx).revertedWith("EthPool: INSUFFICIENT PERMISSION");
    })

    it('deposit success for userA ', async () => {
      const depositAmount = utils.parseUnits('100', 18)
      await ethPool.connect(signerUserA).depositETH({value: depositAmount });
      expect(await ethers.provider.getBalance(ethPool.address)).to.eq(depositAmount);
      expect(await ethPool.totalDeposit()).to.eq(depositAmount);
      expect(await ethPool.deposits(userA)).to.eq(depositAmount);
      expect(await ethPool.users(0)).to.eq(userA);
      expect(await ethPool.numberOfDepositors()).to.eq(1);
    })
  })

  describe('deposit Reward', async () => {
    it('deposit fail for users ', async () => {
      const depositAmount = utils.parseUnits('100', 18)
      const txA = ethPool.connect(signerUserA).depositReward({value: depositAmount });
      await expect(txA).revertedWith("EthPool: INSUFFICIENT PERMISSION");

      const txB = ethPool.connect(signerUserB).depositReward({value: depositAmount });
      await expect(txB).revertedWith("EthPool: INSUFFICIENT PERMISSION");
    })

    it('deposit success for team ', async () => {
      const rewardAmount = utils.parseUnits('100', 18)
      await ethPool.connect(signerTeam).depositReward({value: rewardAmount });
      
      expect(await ethers.provider.getBalance(ethPool.address)).to.eq(rewardAmount);
    })
  })

  describe('deposit ETH & Reward', async () => {
    it('user A deposit 100 & user B deposit 300 & team deposit 200', async () => {
      const depositAmountA = utils.parseUnits('100', 18)
      await ethPool.connect(signerUserA).depositETH({value: depositAmountA });
      expect(await ethers.provider.getBalance(ethPool.address)).to.eq(depositAmountA);
      expect(await ethPool.totalDeposit()).to.eq(depositAmountA);
      expect(await ethPool.deposits(userA)).to.eq(depositAmountA);

      const depositAmountB = utils.parseUnits('300', 18)
      const totalDeposit = utils.parseUnits('400', 18)

      await ethPool.connect(signerUserB).depositETH({value: depositAmountB });
      expect(await ethers.provider.getBalance(ethPool.address)).to.eq(totalDeposit);
      expect(await ethPool.totalDeposit()).to.eq(totalDeposit);
      expect(await ethPool.deposits(userB)).to.eq(depositAmountB);

      expect(await ethPool.numberOfDepositors()).to.eq(2);

      const rewardAmount = utils.parseUnits('200', 18)
      const totalBalance = utils.parseUnits('600', 18)
      await ethPool.connect(signerTeam).depositReward({value: rewardAmount });
      
      expect(await ethers.provider.getBalance(ethPool.address)).to.eq(totalBalance);

      const rewardAmountA = utils.parseUnits('150', 18)         //deposit 100 + reward 50(200 * 100 / 400)
      const rewardAmountB = utils.parseUnits('450', 18)         //deposit 300 + reward 150(200 * 300 / 400)
      expect(await ethPool.availableAmount(userA)).to.eq(rewardAmountA);
      expect(await ethPool.availableAmount(userB)).to.eq(rewardAmountB);
    })
  })

  describe('deposit ETH & Reward', async () => {
    it('user A deposit 100 & team deposit 200 user B deposit 300 & withdraw', async () => {
      const depositAmountA = utils.parseUnits('100', 18)
      await ethPool.connect(signerUserA).depositETH({value: depositAmountA });
      expect(await ethers.provider.getBalance(ethPool.address)).to.eq(depositAmountA);
      expect(await ethPool.totalDeposit()).to.eq(depositAmountA);
      expect(await ethPool.deposits(userA)).to.eq(depositAmountA);

      const rewardAmount = utils.parseUnits('200', 18)
      let totalBalance = utils.parseUnits('300', 18)
      await ethPool.connect(signerTeam).depositReward({value: rewardAmount });
      
      expect(await ethers.provider.getBalance(ethPool.address)).to.eq(totalBalance);

      const depositAmountB = utils.parseUnits('300', 18)
      const totalDeposit = utils.parseUnits('400', 18)

      await ethPool.connect(signerUserB).depositETH({value: depositAmountB });
      totalBalance = utils.parseUnits('600', 18)
      expect(await ethers.provider.getBalance(ethPool.address)).to.eq(totalBalance);
      expect(await ethPool.totalDeposit()).to.eq(totalDeposit);
      expect(await ethPool.deposits(userB)).to.eq(depositAmountB);    

      expect(await ethPool.numberOfDepositors()).to.eq(2);

      const rewardAmountA = utils.parseUnits('300', 18)       //deposit 100 + reward 200
      const rewardAmountB = utils.parseUnits('300', 18)       //deposit 300
      expect(await ethPool.availableAmount(userA)).to.eq(rewardAmountA);
      expect(await ethPool.availableAmount(userB)).to.eq(rewardAmountB);

      const tx = ethPool.connect(signerTeam).withdraw();
      await expect(tx).revertedWith("EthPool: INSUFFICIENT PERMISSION");

      await ethPool.connect(signerUserA).withdraw();
      expect(await ethPool.availableAmount(userA)).to.eq(0);
      expect(await ethPool.numberOfDepositors()).to.eq(1);
      expect(await ethPool.users(0)).to.eq(userB);
      totalBalance = utils.parseUnits('300', 18)
      expect(await ethers.provider.getBalance(ethPool.address)).to.eq(totalBalance);

      await ethPool.connect(signerUserB).withdraw();
      expect(await ethPool.availableAmount(userB)).to.eq(0);
      expect(await ethPool.numberOfDepositors()).to.eq(0);
      expect(await ethers.provider.getBalance(ethPool.address)).to.eq(0);

      const txA = ethPool.connect(signerUserA).withdraw();
      await expect(txA).revertedWith("EthPool: NO BALANCE");

      const txB = ethPool.connect(signerUserB).withdraw();
      await expect(txB).revertedWith("EthPool: NO BALANCE");
    })
  })

//   describe('count down', async () => {
//     // 5
//     it('should fail due to underflow exception', async () => {
//       const tx = counter.countDown()
//       await expect(tx).revertedWith('Uint256 underflow')
//     })

//     it('should count down', async () => {
//       await counter.countUp()

//       await counter.countDown()
//       const count = await counter.getCount()
//       expect(count).to.eq(0)
//     })
//   })
})
