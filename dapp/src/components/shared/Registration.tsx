// app/voting/components/Registration.tsx
'use client';

import {useCallback, useEffect, useRef, useState} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Alert, AlertDescription} from '@/components/ui/alert';
import {Card} from '@/components/ui/card';

import {
    useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, usePublicClient,
} from 'wagmi';
import {CONTRACT_ADDRESS, CONTRACT_ABI} from '@/utils/constants';
import {isAddress, parseAbiItem} from 'viem';

export default function Registration({isOwner}: { isOwner: boolean | undefined }) {
    const {address} = useAccount();
    const [voterAddress, setVoterAddress] = useState('');
    const [error, setError] = useState('');
    const [refreshVoters, setRefreshVoters] = useState(0);

    // Lecture du workflowStatus (0 = RegisteringVoters)
    const {data: workflowStatus} = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'workflowStatus',
    });

    const isRegistrationOpen = workflowStatus === 0;

    // Écriture : addVoter
    const {writeContract, data: hash, error: writeError, isPending} = useWriteContract();
    const {isLoading: isConfirming, isSuccess: isConfirmed} = useWaitForTransactionReceipt({hash});

    useEffect(() => {
        if (isConfirmed) {
            setVoterAddress('');
            setRefreshVoters(prev => prev + 1)
        }
    }, [isConfirmed]);


    const handleAddVoter = () => {
        setError('');

        // Validation adresse
        if (!voterAddress.trim()) {
            setError('Veuillez entrer une adresse');
            return;
        }

        if (!isAddress(voterAddress)) {
            setError('Adresse Ethereum invalide');
            return;
        }

        if (voterAddress.toLowerCase() === address?.toLowerCase()) {
            setError('Vous ne pouvez pas vous ajouter vous-même');
            return;
        }

        writeContract({
            address: CONTRACT_ADDRESS,
            abi: CONTRACT_ABI,
            functionName: 'addVoter',
            args: [voterAddress as `0x${string}`],
        });
    };

    // Si pas owner → rien à afficher
    if (!isOwner) {
        return (
            <AlertDescription>
                Vous n'êtes pas l'administrateur. Seule l'owner peut gérer l'inscription des votants.
            </AlertDescription>
        );
    }

    // Si phase d'inscription fermée
    if (!isRegistrationOpen) {
        return (
            <AlertDescription>
                La phase d'inscription des votants est terminée.
            </AlertDescription>
        );
    }

    return (
        <div className="space-y-6">
            {/* Formulaire d'ajout */}
            <div>
                <h2 className="text-xl font-semibold mb-4">Inscrire un votant</h2>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="voter-address">Adresse du votant</Label>
                        <Input
                            id="voter-address"
                            placeholder="0x..."
                            value={voterAddress}
                            onChange={(e) => setVoterAddress(e.target.value)}
                            disabled={isPending || isConfirming}
                        />
                    </div>

                    {error && (
                        <Alert variant="destructive">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {writeError && (
                        <Alert variant="destructive">
                            <AlertDescription>
                                {(writeError as any).shortMessage || 'Transaction échouée'}
                            </AlertDescription>
                        </Alert>
                    )}

                    {hash && !isConfirmed && (
                        <Alert variant="destructive">
                            <AlertDescription>Transaction en cours... {hash.slice(0, 10)}...</AlertDescription>
                        </Alert>
                    )}

                    {isConfirmed && (
                        <Alert className="border-green-600 bg-green-500/10">
                            <AlertDescription>Votant ajouté avec succès !</AlertDescription>
                        </Alert>
                    )}

                    <Button
                        onClick={handleAddVoter}
                        disabled={isPending || isConfirming || !voterAddress}
                        className="w-full"
                    >
                        {isPending || isConfirming ? 'Ajout en cours...' : 'Ajouter le votant'}
                    </Button>
                </div>
            </div>

            {/* Liste des votants enregistrés */}
            <div>
                <h3 className="text-lg font-medium mb-3">Votants enregistrés</h3>
                <VotersList  key={refreshVoters} />
            </div>
        </div>
    );
}

// Composant séparé pour la liste des votants
function VotersList() {
    const publicClient = usePublicClient();
    const [voters, setVoters] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    // Stable reference to the client (prevents dependency churn)
    const clientRef = useRef(publicClient);
    clientRef.current = publicClient;

    const fetchVoters = useCallback(async () => {
        const client = clientRef.current;
        if (!client) return;

        try {

            const current = await client.getBlockNumber();
            const from = current > 1000n ? current - 1000n : 0n;

            const logs = await client.getLogs({
                address: CONTRACT_ADDRESS,
                event: parseAbiItem('event VoterRegistered(address voterAddress)'),
                fromBlock: from,
                toBlock: 'latest',
            });

            logs.map(log => {
                console.table(log);
            })

            const addresses = logs.map(log => {
                let voterAddress = log.args.voterAddress as string;
                console.log("Found voter: " + voterAddress);
                return voterAddress
            });
            setVoters(addresses);
        } catch (err) {
            console.error("Erreur lors du chargement des votants", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        console.log("VotersList mounted");
        return () => console.log("VotersList unmounted");
    }, []);

    useEffect(() => {
        fetchVoters();
    }, [fetchVoters]);

    if (loading) {
        return <p className="text-muted-foreground">Chargement des votants...</p>;
    }

    if (voters.length === 0) {
        return <p className="text-muted-foreground">Aucun votant inscrit pour le moment.</p>;
    }

    return (
        <div className="space-y-2">
            {voters.map((addr, i) => (
                <Card key={addr} className="p-3">
                    <div className="flex justify-between items-center font-mono text-sm">
                        <span>{addr}</span>
                        <span className="text-xs text-muted-foreground">Votant #{i + 1}</span>
                    </div>
                </Card>
            ))}
        </div>
    );
}