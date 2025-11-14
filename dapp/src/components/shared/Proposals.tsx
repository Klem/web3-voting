// app/voting/components/Proposals.tsx
'use client';

import {useState, useEffect, useRef} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
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

export default function Proposals() {
    const {address, isConnected, connector} = useAccount();
    console.log("connected:" + address)
    const [proposalText, setProposalText] = useState('');
    const [error, setError] = useState('');

    // --- Lecture du contrat ---
    const {data: workflowStatus} = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'workflowStatus',
    });

    const {
        data: data,
        isLoading: voterLoading,
        error: voterError
    } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'getVoter',
        args: address ? [address] : undefined, // ← CRUCIAL
        query: {
            enabled: !!address && isConnected, // ← Double vérif
        },
    });
    console.log('isConnected:', isConnected, 'address:', address, 'connector:', connector?.name);
    console.log(voterError);
    ;
    const voter = data as Voter | undefined;

    console.log(voter);

    const {data: proposalsCount, refetch: refetchCount} = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'getProposalsCount',
    });

    const isRegistered = voter?.isRegistered === true;
    const isProposalsOpen = workflowStatus === 1; // ProposalsRegistrationStarted

    // --- Écriture : addProposal ---
    const {writeContract, data: hash, error: writeError, isPending} = useWriteContract();
    const {isLoading: isConfirming, isSuccess: isConfirmed} = useWaitForTransactionReceipt({hash});

    const handleSubmit = () => {
        setError('');

        if (!proposalText.trim()) {
            setError('Veuillez saisir une proposition');
            return;
        }

        if (proposalText.trim().length < 3) {
            setError('La proposition doit faire au moins 3 caractères');
            return;
        }

        writeContract({
            address: CONTRACT_ADDRESS,
            abi: CONTRACT_ABI,
            functionName: 'addProposal',
            args: [proposalText],
        });
    };

    // Réinitialiser après succès
    useEffect(() => {
        if (isConfirmed) {
            setProposalText('');
            refetchCount();
        }
    }, [isConfirmed, refetchCount]);

    // --- Affichage conditionnel ---
    // if (!isRegistered) {
    //     return (
    //         <AlertDescription>
    //             Vous n'êtes pas inscrit comme votant. Demandez à l'administrateur de vous ajouter.
    //         </AlertDescription>
    //     );
    // }

    if (!isProposalsOpen) {
        return (

            <AlertDescription>
                La phase de soumission des propositions est fermée.
            </AlertDescription>

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
                                {(writeError as any).shortMessage || 'Erreur lors de l’envoi'}
                            </AlertDescription>
                        </Alert>
                    )}

                    {hash && !isConfirmed && (
                        <Alert>
                            <AlertDescription>
                                Transaction en cours... {hash.slice(0, 10)}...
                            </AlertDescription>
                        </Alert>
                    )}

                    {isConfirmed && (
                        <Alert className="border-green-600 bg-green-500/10">
                            <AlertDescription>Proposition ajoutée avec succès !</AlertDescription>
                        </Alert>
                    )}

                    <Button
                        onClick={handleSubmit}
                        disabled={isPending || isConfirming || !proposalText.trim()}
                        className="w-full"
                    >
                        {isPending || isConfirming ? 'Envoi...' : 'Soumettre la proposition'}
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
                        Array.from({length: Number(proposalsCount)}).map((_, i) => (
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

// Composant pour afficher une proposition
function ProposalItem({id}: { id: number }) {

    const publicClient = usePublicClient();
    const [voters, setVoters] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    // Stable reference to the client (prevents dependency churn)
    const clientRef = useRef(publicClient);
    clientRef.current = publicClient;

    console.log("Fetching proposal: ", id);
    const {data: data,  error: error, isLoading, refetch} = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'getOneProposal',
        args: [BigInt(id)],
    });

    console.log(error);

    const proposal = data as Proposal | undefined;

    console.table (proposal);

    if (isLoading) return <Card className="p-3 animate-pulse">
        <div className="h-4 bg-muted rounded"></div>
    </Card>;
    if (!proposal) return null;

    return (
        <Card className="p-3">
            <div className="flex justify-between items-start gap-3">
                <div className="flex-1">
                    <span className="font-medium text-sm">#{id}</span>
                    <p className="mt-1 text-foreground">{proposal.description}</p>
                </div>
                <div className="text-right">
                    <span className="text-sm font-semibold text-primary">{proposal.voteCount}</span>
                    <span className="text-xs text-muted-foreground block">vote(s)</span>
                </div>
            </div>
        </Card>
    );
}