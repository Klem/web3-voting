import { ConnectButton } from '@rainbow-me/rainbowkit';

const Header = () => {
  return (
    <div className="flex items-center justify-between p-5 border-b border-border">
        <div className="font-bold text-xl">
            Web3-Voting <span className="text-primary">DApp</span>
        </div>
        <ConnectButton />
    </div>
  )
}

export default Header