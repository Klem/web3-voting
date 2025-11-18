# Web3 Voting – Mon appli de vote décentralisé

Une application de vote simple, transparente et 100 % on-chain, construite avec Next.js, wagmi, viem et le contrat Voting.sol made in Alyra.

Tout se passe sur la blockchain : inscription des votants, soumission de propositions, vote (1 personne = 1 vote), et enfin affichage des résultats avec barre de progression.

Aucune base de données, aucun serveur centralisé : tout est vérifiable directement sur la blockchain.

### Fonctionnalités
- Phase 1 : Admin inscrit les votants
- Phase 2 : Les votants proposent des idées
- Phase 3 : Session de vote ouverte (1 vote par personne)
- Phase 4 : Résultats finaux avec la proposition gagnante mise en évidence
- Optionel: L'admin peut reset les propostion. Les votants ne sont pas affecté

### Demo live
https://web3-voting-eight.vercel.app/

### Video
dapp/demo.mp4

### Historique du contrat apres la demo
https://sepolia.etherscan.io/address/0x897C970d5Afb412d61b80ff39A89102247187Df8

### Stack technique
- Next.js 14 (app router)
- Tailwind + shadcn/ui
- wagmi + viem
- Contrat Solidity : Voting.sol (Alyra) déployé sur Sepolia
- Déploiement : Vercel

### Code source
https://github.com/Nekroin/web3-voting