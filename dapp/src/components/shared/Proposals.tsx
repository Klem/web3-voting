// app/voting/components/Proposals.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';

import {
    useAccount,
    useReadContract,
    useWriteContract,
    useWaitForTransactionReceipt,
} from 'wagmi';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '@/utils/constants';

export default function Proposals() {
    const { address, isConnected } = useAccount();
    const [proposalText, setProposalText] = useState('');
    const [error, setError] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);

    // Workflow status
    const { data: workflowStatus } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'workflowStatus',
    });

    const isProposalsOpen = workflowStatus === 1;

    // Nombre de propositions + refetch
    const { data: proposalsCount, refetch: refetchCount } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'getProposalsCount',
    });

    // Ajout de proposition
    const { writeContract, data: hash } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

    const handleSubmit = () => {
        setError('');
        if (!proposalText.trim()) return setError('Veuillez saisir une proposition');
        if (proposalText.trim().length < 3) return setError('La proposition doit faire au moins 3 caractères');

        writeContract({
            address: CONTRACT_ADDRESS,
            abi: CONTRACT_ABI,
            functionName: 'addProposal',
            args: [proposalText],
        });
    };

    // Succès → message + rafraîchissement + reset
    useEffect(() => {
        if (isSuccess) {
            setProposalText('');
            setShowSuccess(true);
            refetchCount();
            const t = setTimeout(() => setShowSuccess(false), 3000);
            return () => clearTimeout(t);
        }
    }, [isSuccess, refetchCount]);

    if (!isProposalsOpen) {
        return (
            <div className="space-y-6">
                <AlertDescription>
                    La phase de soumission des propositions est fermée.
                </AlertDescription>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Formulaire d'ajout */}
            <div>
                <h2 className="text-xl font-semibold mb-4">Soumettre une proposition</h2>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="proposal">Votre idée</Label>
                        <Input
                            id="proposal"
                            placeholder="Ex: Améliorer le parking de l'école..."
                            value={proposalText}
                            onChange={(e) => setProposalText(e.target.value)}
                            disabled={isConfirming}
                        />
                    </div>

                    {error && (
                        <Alert variant="destructive">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {hash && !isSuccess && (
                        <Alert>
                            <AlertDescription>Transaction en cours... {hash.slice(0, 10)}...</AlertDescription>
                        </Alert>
                    )}

                    {showSuccess && (
                        <Alert className="border-green-600 bg-green-500/10">
                            <AlertDescription>Proposition ajoutée avec succès !</AlertDescription>
                        </Alert>
                    )}

                    <Button
                        onClick={handleSubmit}
                        disabled={isConfirming || !proposalText.trim()}
                        className="w-full"
                    >
                        {isConfirming ? 'Envoi...' : 'Soumettre la proposition'}
                    </Button>
                </div>
            </div>

            {/* Liste des propositions */}
            <div>
                <h3 className="text-lg font-medium mb-3">
                    Propositions soumises ({proposalsCount?.toString() || 0})
                </h3>

                <div className="space-y-2">
                    {proposalsCount && Number(proposalsCount) > 0 ? (
                        Array.from({ length: Number(proposalsCount) }).map((_, i) => (
                            <ProposalItem key={i} id={i} />
                        ))
                    ) : (
                        <p className="text-muted-foreground">Aucune proposition pour le moment.</p>
                    )}
                </div>
            </div>
        </div>
    );
}

// Composant identique à ton ancien, mais qui marche
function ProposalItem({ id }: { id: number }) {
    const { data, error, isLoading, refetch } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'getOneProposal',
        args: [BigInt(id)],
        query: {
            retry: false, // important when it reverts
        },
    });

    // Force refresh when parent refetches
    useEffect(() => {
        refetch();
    }, [refetch]);

    if (isLoading) return <Card className="p-3 animate-pulse">…</Card>;

    console.log(error)

    // This is the key: catch the revert from onlyVoters
    if (error || !data) {
        // Proposal 0 is always empty in this contract → ignore it
        if (id === 0) return null;

        // Any other error = probably not a voter
        return (
            <Card className="p-3 border-red-500 bg-red-50">
                <p className="text-sm text-red-700">
                    {id === 0 ? "Proposal 0 (genesis)" : "Vous n'êtes pas inscrit comme votant"}
                </p>
            </Card>
        );
    }

    const { description, voteCount } = data as { description: string; voteCount: bigint };

    // Extra safety: sometimes description is empty string
    if (!description.trim()) return null;

    return (
        <Card className="p-3">
            <div className="flex justify-between items-start gap-3">
                <div className="flex-1">
                    <span className="font-medium text-sm">#{id}</span>
                    <p className="mt-1 text-foreground">{description}</p>
                </div>
                <div className="text-right">
                    <span className="text-sm font-semibold text-primary">{voteCount.toString()}</span>
                    <span className="text-xs text-muted-foreground block">vote(s)</span>
                </div>
            </div>
        </Card>
    );
}