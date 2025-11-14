// app/voting/components/Proposals.tsx
'use client';

import {useState, useEffect, useRef} from 'react';
import {Button} from '@/components/ui/button';
import {RadioGroup, RadioGroupItem} from '@/components/ui/radio-group';
import {Alert, AlertDescription} from '@/components/ui/alert';
import {Card} from '@/components/ui/card';

import {useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, usePublicClient} from 'wagmi';
import {CONTRACT_ADDRESS, CONTRACT_ABI} from '@/utils/constants';

interface Voter {
    isRegistered: boolean,
    hasVoted: boolean
    votedProposalId: bigint
}

interface Proposal {
    description: string,
    voteCount: bigint
}

export default function VotingProposals() {
    const { address, isConnected } = useAccount();

    const [selectedId, setSelectedId] = useState<string>('');
    const [showSuccess, setShowSuccess] = useState(false);

    // --- Lecture du contrat ---
    const { data: workflowStatus } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'workflowStatus',
    });

    const { data: voterData } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'getVoter',
        args: address ? [address] : undefined,
        query: { enabled: !!address && isConnected },
    });

    const voter = voterData as Voter | undefined;
    const isRegistered = voter?.isRegistered === true;
    const hasVoted = voter?.hasVoted === true;
    const isVotingOpen = workflowStatus === 3; // VotingSessionStarted

    const { data: proposalsCount, refetch: refetchCount } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'getProposalsCount',
    });

    // --- Écriture : setVote ---
    const { writeContract, data: hash, error: writeError, isPending } = useWriteContract();
    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

    const handleVote = () => {
        if (!selectedId) return;

        writeContract({
            address: CONTRACT_ADDRESS,
            abi: CONTRACT_ABI,
            functionName: 'setVote',
            args: [BigInt(selectedId)],
        });
    };

    // Rafraîchissement + message succès
    useEffect(() => {
        if (isConfirmed) {
            setShowSuccess(true);
            refetchCount(); // Rafraîchit le nombre de propositions

            const timer = setTimeout(() => {
                setShowSuccess(false);
            }, 3000);

            return () => clearTimeout(timer);
        }
    }, [isConfirmed, refetchCount]);

    // --- Affichage conditionnel ---
    if (!isConnected) {
        return <AlertDescription>Connectez votre wallet pour voter.</AlertDescription>;
    }

    if (!isRegistered) {
        return (
            <AlertDescription>
                Vous n'êtes pas inscrit comme votant. Demandez à l'administrateur.
            </AlertDescription>
        );
    }

    if (hasVoted) {
        return (
            <Alert className="border-blue-600 bg-blue-500/10">
                <AlertDescription>
                    Vous avez déjà voté pour la proposition #{voter?.votedProposalId.toString()}.
                </AlertDescription>
            </Alert>
        );
    }

    if (!isVotingOpen) {
        return (
            <AlertDescription>
                La session de vote n'est pas encore ouverte.
            </AlertDescription>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-semibold mb-4">Choisissez une proposition</h2>

                {showSuccess && (
                    <Alert className="border-green-600 bg-green-500/10 mb-4">
                        <AlertDescription>Votre vote a été enregistré !</AlertDescription>
                    </Alert>
                )}

                {writeError && (
                    <Alert variant="destructive" className="mb-4">
                        <AlertDescription>
                            {(writeError as any).shortMessage || 'Erreur lors du vote'}
                        </AlertDescription>
                    </Alert>
                )}

                {hash && !isConfirmed && (
                    <Alert className="mb-4">
                        <AlertDescription>
                            Vote en cours... {hash.slice(0, 10)}...
                        </AlertDescription>
                    </Alert>
                )}

                <RadioGroup value={selectedId} onValueChange={setSelectedId}>
                    <div className="space-y-3">
                        {proposalsCount && Number(proposalsCount) > 0 ? (
                            Array.from({ length: Number(proposalsCount) }).map((_, i) => (
                                <ProposalVoteItem
                                    key={i}
                                    id={i}
                                    isSelected={selectedId === i.toString()}
                                    disabled={isPending || isConfirming}
                                />
                            ))
                        ) : (
                            <p className="text-muted-foreground">Aucune proposition disponible.</p>
                        )}
                    </div>
                </RadioGroup>

                <Button
                    onClick={handleVote}
                    disabled={!selectedId || isPending || isConfirming}
                    className="w-full mt-6"
                >
                    {isPending || isConfirming ? 'Vote en cours...' : 'Confirmer mon vote'}
                </Button>
            </div>
        </div>
    );
}

// Composant pour une proposition avec radio
function ProposalVoteItem({
                              id,
                              isSelected,
                              disabled,
                          }: {
    id: number;
    isSelected: boolean;
    disabled: boolean;
}) {
    const { data: data, isLoading, refetch } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'getOneProposal',
        args: [BigInt(id)],
    });

    // Rafraîchit automatiquement après vote global
    useEffect(() => {
        refetch();
    }, []);

    const proposal = data as Proposal | undefined;

    if (isLoading) {
        return (
            <Card className="p-3 animate-pulse">
                <div className="h-4 bg-muted rounded"></div>
            </Card>
        );
    }

    if (!proposal) return null;

    return (
        <Card className={`p-3 border ${isSelected ? 'border-primary' : ''}`}>
            <label className="flex items-start gap-3 cursor-pointer">
                <RadioGroupItem value={id.toString()} disabled={disabled} />
                <div className="flex-1">
                    <span className="font-medium text-sm">#{id}</span>
                    <p className="mt-1 text-foreground">{proposal.description}</p>
                </div>
                <div className="text-right">
                    <span className="text-sm font-semibold text-primary">{proposal.voteCount.toString()}</span>
                    <span className="text-xs text-muted-foreground block">vote(s)</span>
                </div>
            </label>
        </Card>
    );
}