/*
Configuration d'un client Viem pour lire les données de la blockchain

Ce fichier crée un "client public" qui permet de :
- Lire des données depuis les smart contracts (pas besoin de wallet)
- Récupérer les événements émis par les contrats
- Consulter l'état de la blockchain

⚠️ Différence avec Wagmi :
- Wagmi : utilisé dans les composants React pour lire/écrire avec des hooks
- Viem publicClient : utilisé directement pour des opérations avancées (comme getLogs)
*/

import { createPublicClient, http } from 'viem'
import { sepolia } from 'viem/chains'

// Création du client connecté à la blockchain Hardhat locale
export const publicClient = createPublicClient({
  chain: sepolia,      // Réseau Hardhat (localhost:8545)
  transport: http(process.env.SEPOLIA_RPC_URL)    // Communication via HTTP (RPC)
})